import Phaser from "phaser";
import {
  BELL_PENALTY_MS,
  DUNGEON_LAYOUT,
  ROOM_COPY,
  ROOM_COUNT,
  ROOM_PX_H,
  ROOM_PX_W,
  STARTING_ENERGY,
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
import { ResetBell } from "../entities/ResetBell.ts";
import { Lever } from "../entities/Lever.ts";
import { WhipBarrier } from "../entities/WhipBarrier.ts";
import { AnchorCell } from "../entities/AnchorCell.ts";
import { BossCore } from "../entities/BossCore.ts";
import type { AbilityTargets } from "./AbilitySystem.ts";
import type { PartyManager } from "./PartyManager.ts";

/**
 * Five-room dungeon: stitched tilemap, room camera, Reset Bell, energy snapshot.
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
  readonly core: BossCore;
  readonly bells: ResetBell[];
  private victoryQueued = false;
  private shrineSprite!: Phaser.GameObjects.Rectangle;
  private shrineLabel!: Phaser.GameObjects.Text;
  private readonly vineTiles: { tx: number; ty: number }[] = [];

  private readonly scene: Phaser.Scene;
  private bellCooldown = 0;
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

    scene.physics.world.setBounds(0, 0, ROOM_PX_W * ROOM_COUNT, ROOM_PX_H);

    this.brambles = [4, 5, 6].map((row) => {
      const p = worldCenter(1, 10, row);
      return new Bramble(scene, p.x, p.y);
    });
    this.exitBrambles = [4, 5, 6].map((row) => {
      const p = worldCenter(4, 14, row);
      return new Bramble(scene, p.x, p.y);
    });

    const eyePos = worldCenter(2, 16, 2);
    this.eye = new EyeBeacon(scene, eyePos.x, eyePos.y, () => this.lowerBridge());

    const gatePos = worldCenter(3, 10, 5);
    const platePos = worldCenter(3, 5, 5);
    this.gate = new Gate(scene, gatePos.x, gatePos.y);
    this.plate = new HeavyPlate(scene, platePos.x, platePos.y, this.gate);
    const leverPos = worldCenter(3, 15, 5);
    this.lever = new Lever(scene, leverPos.x, leverPos.y, () => {
      this.gate.lockOpen();
      this.scene.registry.set(
        "objective",
        "Gate locked open — Plant may cross",
      );
    });

    const crystalPos = worldCenter(4, 17, 2);
    this.crystal = new Crystal(scene, crystalPos.x, crystalPos.y);

    this.bells = [];
    for (let i = 1; i <= ROOM_COUNT; i++) {
      const p = worldCenter(i, 4, 1);
      this.bells.push(new ResetBell(scene, p.x, p.y));
    }

    const treant = worldCenter(5, 16, 5);
    scene.add.ellipse(treant.x, treant.y, 40, 56, 0x33691e).setDepth(0.35);
    scene.add
      .text(treant.x, treant.y + 36, "Treant", {
        fontSize: "9px",
        color: "#aed581",
        fontFamily: "monospace",
      })
      .setOrigin(0.5)
      .setDepth(0.36);

    const whipPos = worldCenter(5, 11, 5);
    this.whip = new WhipBarrier(scene, whipPos.x, whipPos.y);
    const anchorPos = worldCenter(5, 6, 5);
    this.anchor = new AnchorCell(scene, anchorPos.x, anchorPos.y, this.whip);

    const bossEyePos = worldCenter(5, 16, 3);
    this.bossEye = new EyeBeacon(
      scene,
      bossEyePos.x,
      bossEyePos.y,
      () => this.onBossEye(),
      "hawk",
    );

    const corePos = worldCenter(5, 13, 5);
    this.core = new BossCore(scene, corePos.x, corePos.y, () => this.onCoreBroken());

    const shrine = worldCenter(5, 10, 8);
    this.shrineSprite = scene.add.rectangle(shrine.x, shrine.y, 28, 40, 0x5d4037);
    this.shrineSprite.setDepth(0.4);
    this.shrineLabel = scene.add
      .text(shrine.x, shrine.y - 32, "Shrine", {
        fontSize: "10px",
        color: "#bcaaa4",
        fontFamily: "monospace",
      })
      .setOrigin(0.5)
      .setDepth(0.5);
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
    this.applyRoomCopy(index);
    this.lockCameraToRoom(index, snapCamera);
  }

  checkLeaderRoom(worldX: number, energy: number): void {
    if (this.panning) return;
    const next = roomIndexAt(worldX);
    if (next === this.currentIndex) return;
    this.enterRoom(next, energy, false);
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
    this.layer.putTileAt(TILE_FLOOR, tile.x, tile.y);
    this.vineTiles.push({ tx: tile.x, ty: tile.y });
  }

  abilityTargets(): AbilityTargets {
    return {
      brambles: [...this.brambles, ...this.exitBrambles],
      eyes: [this.eye, this.bossEye],
      crystal: this.crystal,
      cores: [this.core],
      anchor: this.anchor,
      isWall: (x, y) => this.isWall(x, y),
      isPit: (x, y) => this.isPit(x, y),
      fillPitAt: (x, y) => this.fillPitAt(x, y),
    };
  }

  updatePuzzles(axies: import("../entities/Axie.ts").Axie[]): void {
    this.plate.update(axies);
    this.lever.update(axies);
    this.anchor.update(axies);
    if (this.bellCooldown > 0) this.bellCooldown -= 1;
  }

  takeVictory(): boolean {
    if (!this.victoryQueued) return false;
    this.victoryQueued = false;
    return true;
  }

  tryRingBell(
    x: number,
    y: number,
    party: PartyManager,
    addTimeMs: (ms: number) => void,
  ): boolean {
    if (this.bellCooldown > 0) return false;
    const bell = this.bells[this.currentIndex - 1];
    if (!bell?.contains(x, y)) return false;
    this.bellCooldown = 40;
    this.resetCurrentRoom(party, addTimeMs);
    return true;
  }

  resetCurrentRoom(
    party: PartyManager,
    addTimeMs: (ms: number) => void,
  ): void {
    this.scene.registry.set("energy", this.energyOnRoomEnter);
    addTimeMs(BELL_PENALTY_MS);

    const spawn = worldCenter(this.currentIndex, 3, 5);
    party.resetLocalParty(this.currentIndex, spawn.x, spawn.y);

    if (this.currentIndex === 1) {
      for (const bramble of this.brambles) bramble.reset();
    }
    if (this.currentIndex === 2) {
      this.eye.reset();
      this.raiseBridge();
    }
    if (this.currentIndex === 3) {
      this.lever.reset();
      this.gate.unlock();
    }
    if (this.currentIndex === 4) {
      this.crystal.reset();
      for (const bramble of this.exitBrambles) bramble.reset();
      this.raiseVines();
    }
    if (this.currentIndex === 5) {
      this.whip.reset();
      this.bossEye.reset();
      this.core.reset();
      this.victoryQueued = false;
      this.shrineSprite.setFillStyle(0x5d4037);
      this.shrineLabel.setColor("#bcaaa4");
      this.shrineLabel.setText("Shrine");
    }
    this.applyRoomCopy(this.currentIndex);
  }

  private onBossEye(): void {
    this.core.expose();
    this.scene.registry.set("objective", "Core exposed — Cat slash once");
  }

  private onCoreBroken(): void {
    this.shrineSprite.setFillStyle(0x80deea);
    this.shrineLabel.setColor("#80deea");
    this.shrineLabel.setText("Shrine of Lunacia");
    this.scene.registry.set("objective", "Shrine purified");
    this.scene.time.delayedCall(900, () => {
      this.victoryQueued = true;
    });
  }

  private lowerBridge(): void {
    for (const col of [28, 29, 30]) {
      this.layer.putTileAt(TILE_FLOOR, col, 5);
    }
    this.scene.registry.set("objective", "Bridge down — others may cross");
  }

  private raiseBridge(): void {
    for (const col of [28, 29, 30]) {
      this.layer.putTileAt(TILE_PIT, col, 5);
    }
  }

  private raiseVines(): void {
    for (const vine of this.vineTiles) {
      this.layer.putTileAt(TILE_PIT, vine.tx, vine.ty);
    }
    this.vineTiles.length = 0;
  }
}
