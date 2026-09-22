import Phaser from "phaser";
import {
  RETRY_PENALTY_MS,
  DUNGEON_LAYOUT,
  ROOM_COPY,
  ROOM_COUNT,
  ROOM_PX_H,
  ROOM_PX_W,
  STARTING_ENERGY,
  TILE_FILL,
  TILE_FLOOR,
  TILE_PIT,
  TILE_SIZE,
  TILE_WALL,
  roomIndexAt,
  roomOriginX,
  worldCenter,
} from "../config/constants.ts";
import { Bramble } from "../entities/Bramble.ts";
import { Crystal } from "../entities/Crystal.ts";
import { EyeBeacon } from "../entities/EyeBeacon.ts";
import { Gate } from "../entities/Gate.ts";
import { HeavyPlate } from "../entities/HeavyPlate.ts";
import { Lever } from "../entities/Lever.ts";
import { WhipBarrier } from "../entities/WhipBarrier.ts";
import { AnchorCell } from "../entities/AnchorCell.ts";
import { BossCore } from "../entities/BossCore.ts";
import { CrackedWall } from "../entities/CrackedWall.ts";
import { EnergyPickup } from "../entities/EnergyPickup.ts";
import { Enemy } from "../entities/Enemy.ts";
import type { AbilityTargets } from "./AbilitySystem.ts";
import type { PartyManager } from "./PartyManager.ts";
import { restoreLedger, snapshotLedger } from "../config/energy.ts";
import { TREANT_BOSS_RADIUS } from "../config/parts.ts";
import { DungeonLook } from "./DungeonLook.ts";
import { sfx } from "./Juice.ts";

/**
 * Five-room dungeon: stitched tilemap, room camera, energy snapshot.
 */
export class Dungeon {
  readonly layer: Phaser.Tilemaps.TilemapLayer;
  currentIndex = 1;
  energyOnRoomEnter = STARTING_ENERGY;

  readonly brambles: Bramble[];
  readonly exitBrambles: Bramble[];
  readonly eye: EyeBeacon;
  readonly crystal: Crystal;
  readonly gate: Gate;
  readonly plate: HeavyPlate;
  readonly lever: Lever;
  readonly whip: WhipBarrier;
  readonly anchor: AnchorCell;
  readonly bossEye: EyeBeacon;
  readonly bonusEye: EyeBeacon;
  bonusPickup: EnergyPickup | null = null;
  readonly core: BossCore;
  readonly crackedWall: CrackedWall;
  readonly enemies: Enemy[] = [];
  private victoryQueued = false;
  private shrineSprite!: Phaser.GameObjects.Image;
  private readonly vineTiles: { tx: number; ty: number }[] = [];
  private treant = { x: 0, y: 0 };
  private look!: DungeonLook;
  private paintQueued = false;

  private readonly scene: Phaser.Scene;
  private retryCooldown = 0;
  private panning = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    const map = scene.make.tilemap({
      data: DUNGEON_LAYOUT,
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    });
    const tileset = map.addTilesetImage(
      "tiles",
      "tiles",
      TILE_SIZE,
      TILE_SIZE,
      0,
      0,
      0,
    )!;
    this.layer = map.createLayer(0, tileset, 0, 0)!;
    this.layer.setCollision(TILE_WALL);

    this.look = new DungeonLook(scene, this.layer);

    scene.physics.world.setBounds(0, 0, ROOM_PX_W * ROOM_COUNT, ROOM_PX_H);

    this.brambles = (
      [
        [10, 3],
        [10, 4],
        [11, 3],
      ] as const
    ).map(([col, row]) => {
      const p = worldCenter(1, col, row);
      return new Bramble(scene, p.x, p.y);
    });
    this.exitBrambles = [4, 5, 6].map((row) => {
      const p = worldCenter(4, 14, row);
      return new Bramble(scene, p.x, p.y);
    });

    const eyePos = worldCenter(2, 16, 8);
    this.eye = new EyeBeacon(scene, eyePos.x, eyePos.y, () => this.lowerBridge());

    // Hidden Eye — Room 2, behind south LOS wall (Pierce bonus)
    const bonusEyePos = worldCenter(2, 14, 9);
    this.bonusEye = new EyeBeacon(scene, bonusEyePos.x, bonusEyePos.y, () => {
      this.bonusPickup = new EnergyPickup(scene, bonusEyePos.x, bonusEyePos.y);
      scene.registry.set("verbRoute_pierceBonus", true);
    });

    const gatePos = worldCenter(3, 10, 5);
    const platePos = worldCenter(3, 4, 2);
    this.gate = new Gate(scene, gatePos.x, gatePos.y);
    this.plate = new HeavyPlate(scene, platePos.x, platePos.y, this.gate);
    const leverPos = worldCenter(3, 16, 8);
    this.lever = new Lever(scene, leverPos.x, leverPos.y, () => {
      this.gate.lockOpen();
      this.scene.registry.set(
        "objective",
        "Gate locked open — Plant may cross",
      );
    });

    const crystalPos = worldCenter(4, 17, 8);
    this.crystal = new Crystal(scene, crystalPos.x, crystalPos.y);

    const treant = worldCenter(5, 12, 6);
    this.treant = treant;
    scene.add.image(treant.x, treant.y - 8, "prop-treant").setDepth(0.34);

    const whipPos = worldCenter(5, 10, 5);
    this.whip = new WhipBarrier(scene, whipPos.x, whipPos.y);
    const anchorPos = worldCenter(5, 4, 8);
    this.anchor = new AnchorCell(scene, anchorPos.x, anchorPos.y, this.whip);

    const bossEyePos = worldCenter(5, 17, 2);
    this.bossEye = new EyeBeacon(
      scene,
      bossEyePos.x,
      bossEyePos.y,
      () => this.onBossEye(),
      "hawk",
    );

    const corePos = worldCenter(5, 17, 8);
    this.core = new BossCore(scene, corePos.x, corePos.y, () => this.onCoreBroken());

    // Cracked Wall — Room 3, wall divider south of gate gap (verb-gated shortcut)
    const crackPos = worldCenter(3, 10, 7);
    this.crackedWall = new CrackedWall(scene, crackPos.x, crackPos.y, () => {
      // Replace wall tiles with floor to open the shortcut
      this.layer.putTileAt(TILE_FLOOR, 49, 7);  // Room 3 col 10 = global col 49, row 7
      this.layer.putTileAt(TILE_FLOOR, 49, 8);  // and row 8
      this.refreshLook();
      scene.registry.set("verbRoute_thornShortcut", true);
    });

    // Enemies (1 per level)
    this.enemies.push(new Enemy(scene, worldCenter(1, 8, 6).x, worldCenter(1, 8, 6).y));
    this.enemies.push(new Enemy(scene, worldCenter(2, 12, 5).x, worldCenter(2, 12, 5).y));
    this.enemies.push(new Enemy(scene, worldCenter(3, 14, 4).x, worldCenter(3, 14, 4).y));
    this.enemies.push(new Enemy(scene, worldCenter(4, 10, 7).x, worldCenter(4, 10, 7).y));
    this.enemies.push(new Enemy(scene, worldCenter(5, 8, 6).x, worldCenter(5, 8, 6).y));

    const shrine = worldCenter(5, 14, 8);
    this.shrineSprite = scene.add.image(shrine.x, shrine.y, "prop-shrine");
    this.shrineSprite.setDepth(0.4);
  }

  setupColliders(sprites: Phaser.GameObjects.Ellipse[]): void {
    for (const sprite of sprites) {
      this.scene.physics.add.collider(sprite, this.layer);
      this.scene.physics.add.collider(sprite, this.gate.sprite);
      this.scene.physics.add.collider(sprite, this.crystal.sprite);
      this.scene.physics.add.collider(sprite, this.whip.sprite);
      for (const bramble of [...this.brambles, ...this.exitBrambles]) {
        this.scene.physics.add.collider(sprite, bramble.sprite);
      }
    }
  }

  lockCameraToRoom(index: number, snap: boolean): void {
    const cx = roomOriginX(index) + ROOM_PX_W / 2;
    const cy = ROOM_PX_H / 2;
    const cam = this.scene.cameras.main;
    cam.setZoom(2);
    if (snap) {
      cam.setBounds(roomOriginX(index), 0, ROOM_PX_W, ROOM_PX_H);
      cam.centerOn(cx, cy);
      return;
    }
    this.panning = true;
    cam.setBounds(0, 0, ROOM_PX_W * ROOM_COUNT, ROOM_PX_H);
    cam.pan(cx, cy, 380, "Sine.easeInOut", true, (_c, progress) => {
      if (progress < 1) return;
      cam.setBounds(roomOriginX(index), 0, ROOM_PX_W, ROOM_PX_H);
      this.panning = false;
    });
  }

  applyRoomCopy(index: number): void {
    const copy = ROOM_COPY[index];
    this.scene.registry.set("roomIndex", index);
    this.scene.registry.set("objective", copy?.objective ?? "");
    this.scene.registry.set("hint", copy?.hint ?? "");
  }

  enterRoom(index: number, energy: number, snapCamera: boolean): void {
    this.currentIndex = index;
    this.energyOnRoomEnter = energy;
    snapshotLedger(this.scene);
    this.applyRoomCopy(index);
    this.lockCameraToRoom(index, snapCamera);
    this.look.tintRoom(index);
    if (!snapCamera) sfx.door();
  }

  checkLeaderRoom(worldX: number, energy: number): boolean {
    if (this.panning) return false;
    const next = roomIndexAt(worldX);
    if (next === this.currentIndex) return false;
    this.enterRoom(next, energy, false);
    return true;
  }

  isPit(x: number, y: number): boolean {
    const tile = this.layer.getTileAtWorldXY(x, y, true);
    return tile?.index === TILE_PIT;
  }

  isWall(x: number, y: number): boolean {
    const tile = this.layer.getTileAtWorldXY(x, y, true);
    return !tile || tile.index === TILE_WALL;
  }

  fillPitAt(x: number, y: number): void {
    const tile = this.layer.getTileAtWorldXY(x, y, true);
    if (!tile || tile.index !== TILE_PIT) return;
    this.layer.putTileAt(TILE_FILL, tile.x, tile.y);
    this.vineTiles.push({ tx: tile.x, ty: tile.y });
    this.refreshLook();
  }

  private refreshLook(): void {
    if (this.paintQueued) return;
    this.paintQueued = true;
    this.scene.time.delayedCall(0, () => {
      this.paintQueued = false;
      this.look.paint();
    });
  }

  abilityTargets(): AbilityTargets {
    return {
      brambles: [...this.brambles, ...this.exitBrambles],
      eyes: [this.eye, this.bossEye, this.bonusEye],
      crystal: this.crystal,
      cores: [this.core],
      anchor: this.anchor,
      plates: [this.plate],
      crackedWalls: [this.crackedWall],
      enemies: this.enemies,
      dartBlockers: [
        { x: this.treant.x, y: this.treant.y, radius: TREANT_BOSS_RADIUS },
      ],
      isWall: (x, y) => this.isWall(x, y),
      isPit: (x, y) => this.isPit(x, y),
      fillPitAt: (x, y) => this.fillPitAt(x, y),
    };
  }

  gateBlocks(x: number, y: number): boolean {
    if (!this.gate.body.enable) return false;
    return this.gate.sprite.getBounds().contains(x, y);
  }

  whipBlocks(x: number, y: number): boolean {
    return this.whip.blocks(x, y);
  }

  updatePuzzles(axies: import("../entities/Axie.ts").Axie[]): void {
    this.plate.update(axies);
    this.lever.update(axies);
    this.anchor.update(axies);
    this.telegraph(axies);
    this.refreshBossCopy();
    if (this.retryCooldown > 0) this.retryCooldown -= 1;
    
    // Check bonus pickup
    if (this.bonusPickup?.isActive()) {
      for (const axie of axies) {
        if (!axie.body.enable) continue;
        const dist = Math.hypot(
          axie.sprite.x - this.bonusPickup.sprite.x,
          axie.sprite.y - this.bonusPickup.sprite.y
        );
        if (dist < 26) {
          this.bonusPickup.collect();
          break;
        }
      }
    }
  }

  takeVictory(): boolean {
    if (!this.victoryQueued) return false;
    this.victoryQueued = false;
    return true;
  }

  resetCurrentRoom(
    party: PartyManager,
    addTimeMs: (ms: number) => void,
  ): void {
    if (this.retryCooldown > 0) return;
    this.retryCooldown = 60;
    
    this.scene.registry.set("energy", this.energyOnRoomEnter);
    restoreLedger(this.scene);
    addTimeMs(RETRY_PENALTY_MS);
    sfx.fail();

    const spawn = worldCenter(this.currentIndex, 3, 5);
    party.resetLocalParty(this.currentIndex, spawn.x, spawn.y);
    this.enemies[this.currentIndex - 1]?.reset();

    if (this.currentIndex === 1) {
      for (const b of this.brambles) b.reset();
    }
    if (this.currentIndex === 2) {
      this.eye.reset();
      this.raiseBridge();
      this.bonusEye.reset();
      if (this.bonusPickup) {
        this.bonusPickup.destroy();
        this.bonusPickup = null;
      }
    }
    if (this.currentIndex === 3) {
      this.lever.reset();
      this.gate.unlock();
      this.plate.clearThorn();
      this.crackedWall.reset();
      // Restore wall tiles if cracked wall was broken
      this.layer.putTileAt(TILE_WALL, 49, 7);
      this.layer.putTileAt(TILE_WALL, 49, 8);
      this.refreshLook();
    }
    if (this.currentIndex === 4) {
      this.crystal.reset();
      for (const bramble of this.exitBrambles) bramble.reset();
      this.raiseVines();
    }
    if (this.currentIndex === 5) {
      this.whip.reset();
      this.anchor.reset();
      this.bossEye.reset();
      this.core.reset();
      this.victoryQueued = false;
      this.shrineSprite.setTexture("prop-shrine");
    }
    this.applyRoomCopy(this.currentIndex);
  }

  private telegraph(axies: import("../entities/Axie.ts").Axie[]): void {
    const slot = (this.scene.registry.get("activeSlot") as number) ?? 1;
    const picked = axies.find((a) => a.slot === slot);
    const body = picked?.absorbedBy ?? picked;
    const kit = body?.currentKit() ?? null;
    const slashHot = kit === "slash";
    const dartHot = kit === "dart" || kit === "seed";
    for (const b of [...this.brambles, ...this.exitBrambles]) {
      b.setHint(slashHot);
    }
    this.eye.setHint(dartHot);
    this.bossEye.setHint(dartHot);
    this.crystal.setHint(dartHot);
    this.core.setHint(slashHot);
  }

  private refreshBossCopy(): void {
    if (this.currentIndex !== 5) return;
    if (this.core.isSlashed()) return;
    if (!this.bossEye.isSolved()) return;
    if (this.whip.isBlocking()) {
      this.scene.registry.set(
        "objective",
        "Core exposed — Bear the ANCHOR to drop the roots",
      );
      return;
    }
    this.scene.registry.set("objective", "Roots down — slash the CORE");
    this.scene.registry.set(
      "hint",
      "Slash the CORE  ·  slam/dart take 3  ·  roots stay down",
    );
  }

  private onBossEye(): void {
    this.core.expose();
    this.refreshBossCopy();
  }

  private onCoreBroken(): void {
    this.shrineSprite.setTexture("prop-shrine-lit");
    this.scene.registry.set("objective", "Shrine purified");
    sfx.shrine();
    this.scene.cameras.main.flash(420, 224, 184, 74, false);
    this.scene.time.delayedCall(900, () => {
      this.victoryQueued = true;
    });
  }

  private lowerBridge(): void {
    for (const r of [4, 5, 6]) {
      for (const col of [28, 29, 30]) {
        this.layer.putTileAt(TILE_FILL, col, r);
      }
      this.layer.putTileAt(TILE_FLOOR, 39, r);
    }
    this.look.paint();
    this.scene.registry.set("objective", "Bridge down — east door open");
  }

  private raiseBridge(): void {
    for (const r of [4, 5, 6]) {
      for (const col of [28, 29, 30]) {
        this.layer.putTileAt(TILE_PIT, col, r);
      }
      this.layer.putTileAt(TILE_WALL, 39, r);
    }
    this.look.paint();
  }

  private raiseVines(): void {
    for (const vine of this.vineTiles) {
      this.layer.putTileAt(TILE_PIT, vine.tx, vine.ty);
    }
    this.vineTiles.length = 0;
    this.look.paint();
  }
}
