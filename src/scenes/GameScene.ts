import Phaser from "phaser";
import {
  TILE_SIZE,
  FLOOR_COLOR,
  WALL_COLOR,
  WALL_ACCENT,
  GRID_LINE_COLOR,
  PIT_COLOR,
  PIT_INNER,
  STARTING_ENERGY,
} from "../config/constants.ts";
import { emptyLedger } from "../config/energy.ts";
import { PartyManager } from "../systems/PartyManager.ts";
import { AbilitySystem } from "../systems/AbilitySystem.ts";
import { registerDungeonTextures } from "../art/textures.ts";
import { Dungeon } from "../systems/Dungeon.ts";
import type { TouchAction } from "../config/touch.ts";

interface WASDKeys {
  W: Phaser.Input.Keyboard.Key;
  A: Phaser.Input.Keyboard.Key;
  S: Phaser.Input.Keyboard.Key;
  D: Phaser.Input.Keyboard.Key;
}

/**
 * GameScene — main gameplay scene.
 *
 * Step 7: five rooms, room camera, energyOnRoomEnter (GDD §6, §8, §10).
 */
export class GameScene extends Phaser.Scene {
  private partyManager!: PartyManager;
  private abilities!: AbilitySystem;
  private dungeon!: Dungeon;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: WASDKeys;
  private elapsedMs = 0;
  private pointerArmed = false;

  constructor() {
    super({ key: "GameScene" });
  }

  create(): void {
    if (!this.registry.get("party")) {
      this.scene.start("CollectionScene");
      return;
    }

    this.registry.set("energy", STARTING_ENERGY);
    this.registry.set("activeSlot", 1);
    this.registry.set("roomIndex", 1);
    this.registry.set("runTime", 0);
    this.registry.set("fused", "");
    this.registry.set("formVerb", "");
    this.registry.set("toastsSeen", []);
    this.registry.set("toast", "");
    this.registry.set("cloverKitRoom", 0);
    this.registry.set("energyLedger", emptyLedger());
    this.registry.set("energyLedgerOnRoomEnter", emptyLedger());
    this.registry.set("retryRoom", false);
    this.registry.set("partyStates", {
      1: "active",
      2: "follow",
      3: "follow",
    });

    this.createTileTextures();
    registerDungeonTextures(this);
    this.dungeon = new Dungeon(this);

    this.partyManager = new PartyManager(this);
    this.partyManager.setHazardQuery((x, y) => this.dungeon.isPit(x, y));
    this.partyManager.setBlockedQuery(
      (x, y) =>
        this.dungeon.isWall(x, y) ||
        this.dungeon.isPit(x, y) ||
        this.dungeon.gateBlocks(x, y) ||
        this.dungeon.whipBlocks(x, y),
    );
    this.abilities = new AbilitySystem(this);

    const sprites = this.partyManager.getSprites();
    this.dungeon.setupColliders(sprites);

    for (let i = 0; i < sprites.length; i++) {
      for (let j = i + 1; j < sprites.length; j++) {
        const a = sprites[i]!;
        const b = sprites[j]!;
        this.physics.add.collider(a, b, undefined, () => {
          const active = this.partyManager.getActive();
          if (!this.partyManager.canHover(active)) return true;
          return a !== active.sprite && b !== active.sprite;
        });
      }
    }

    this.dungeon.enterRoom(1, STARTING_ENERGY, true);

    this.scene.launch("HUDScene");
    this.bindKeyboard();
    this.registry.events.on("changedata-touchAction", () => this.handleTouchAction());
  }

  private bindKeyboard(): void {
    const kb = this.input.keyboard;
    if (!kb) return;

    this.cursors = kb.createCursorKeys();
    this.wasd = kb.addKeys("W,A,S,D") as WASDKeys;

    kb.addCapture([
      Phaser.Input.Keyboard.KeyCodes.TAB,
      Phaser.Input.Keyboard.KeyCodes.SPACE,
    ]);

    kb.addKey(Phaser.Input.Keyboard.KeyCodes.ONE).on("down", () =>
      this.partyManager.selectSlot(1),
    );
    kb.addKey(Phaser.Input.Keyboard.KeyCodes.TWO).on("down", () =>
      this.partyManager.selectSlot(2),
    );
    kb.addKey(Phaser.Input.Keyboard.KeyCodes.THREE).on("down", () =>
      this.partyManager.selectSlot(3),
    );
    kb.addKey(Phaser.Input.Keyboard.KeyCodes.Z).on("down", () =>
      this.partyManager.switchForm("bear"),
    );
    kb.addKey(Phaser.Input.Keyboard.KeyCodes.X).on("down", () =>
      this.partyManager.switchForm("cat"),
    );
    kb.addKey(Phaser.Input.Keyboard.KeyCodes.C).on("down", () =>
      this.partyManager.switchForm("hawk"),
    );
    kb.addKey(Phaser.Input.Keyboard.KeyCodes.TAB).on("down", () =>
      this.partyManager.cycleSlot(),
    );
    kb.addKey(Phaser.Input.Keyboard.KeyCodes.F).on("down", () =>
      this.partyManager.toggleFollowPark(),
    );
    kb.addKey(Phaser.Input.Keyboard.KeyCodes.E).on("down", () =>
      this.partyManager.tryFuseOrSplit(),
    );
    kb.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE).on("down", () => {
      this.pointerArmed = true;
      this.tryFireAbility();
    });
    kb.on("keydown", () => {
      this.pointerArmed = true;
    });

    if (!this.registry.get("touchUi")) {
      this.input.on("pointerdown", () => {
        if (!this.pointerArmed) {
          this.pointerArmed = true;
          return;
        }
        this.tryFireAbility();
      });
    }
  }

  private handleTouchAction(): void {
    const action = this.registry.get("touchAction") as TouchAction | undefined;
    if (!action) return;
    if (action.kind === "kit") this.tryFireAbility();
    else if (action.kind === "fuse") this.partyManager.tryFuseOrSplit();
    else if (action.kind === "park") this.partyManager.toggleFollowPark();
    else if (action.kind === "bear") this.partyManager.switchForm("bear");
    else if (action.kind === "cat") this.partyManager.switchForm("cat");
    else if (action.kind === "hawk") this.partyManager.switchForm("hawk");
    else if (action.kind === "slot" && action.slot) {
      this.partyManager.selectSlot(action.slot);
    }
  }

  update(_time: number, delta: number): void {
    this.elapsedMs += delta;
    this.registry.set("runTime", this.elapsedMs);

    this.partyManager.moveActive(this.getInputDirection());
    this.partyManager.update();

    const driven = this.partyManager.getActive();
    const energy = (this.registry.get("energy") as number) ?? STARTING_ENERGY;
    this.dungeon.checkLeaderRoom(driven.sprite.x, energy);
    this.dungeon.updatePuzzles(this.partyManager.getAxies());
    const addTime = (ms: number) => {
      this.elapsedMs += ms;
    };
    if (this.registry.get("retryRoom")) {
      this.registry.set("retryRoom", false);
      this.dungeon.resetCurrentRoom(this.partyManager, addTime);
    }

    if (this.dungeon.takeVictory()) {
      this.scene.pause("GameScene");
      this.scene.pause("HUDScene");
      this.scene.launch("VictoryScene");
    }
  }

  private tryFireAbility(): void {
    const { attacker, origin, facing } = this.partyManager.getAttackContext();
    this.abilities.tryFire(attacker, origin, facing, {
      ...this.dungeon.abilityTargets(),
      pullParkedAlly: (from) => this.partyManager.pullNearestParked(from),
    });
  }

  private getInputDirection(): { x: number; y: number } {
    let x = 0;
    let y = 0;

    if (this.cursors && this.wasd) {
      if (this.cursors.left.isDown || this.wasd.A.isDown) x -= 1;
      if (this.cursors.right.isDown || this.wasd.D.isDown) x += 1;
      if (this.cursors.up.isDown || this.wasd.W.isDown) y -= 1;
      if (this.cursors.down.isDown || this.wasd.S.isDown) y += 1;
    }

    const touch = this.registry.get("touchDir") as { x: number; y: number } | undefined;
    if (touch) {
      x += touch.x;
      y += touch.y;
    }

    if (x !== 0 && y !== 0) {
      const len = Math.sqrt(x * x + y * y);
      x /= len;
      y /= len;
    }

    return { x, y };
  }

  private createTileTextures(): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });

    gfx.fillStyle(FLOOR_COLOR, 1);
    gfx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    gfx.lineStyle(1, GRID_LINE_COLOR, 0.2);
    gfx.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);

    gfx.fillStyle(WALL_COLOR, 1);
    gfx.fillRect(TILE_SIZE, 0, TILE_SIZE, TILE_SIZE);
    gfx.lineStyle(1, WALL_ACCENT, 0.8);
    gfx.strokeRect(TILE_SIZE + 1, 1, TILE_SIZE - 2, TILE_SIZE - 2);

    gfx.fillStyle(PIT_COLOR, 1);
    gfx.fillRect(TILE_SIZE * 2, 0, TILE_SIZE, TILE_SIZE);
    gfx.fillStyle(PIT_INNER, 1);
    gfx.fillRect(TILE_SIZE * 2 + 5, 5, TILE_SIZE - 10, TILE_SIZE - 10);

    gfx.fillStyle(0x3d6a44, 1);
    gfx.fillRect(TILE_SIZE * 3, 0, TILE_SIZE, TILE_SIZE);
    gfx.fillStyle(0x5a9a4a, 1);
    gfx.fillRect(TILE_SIZE * 3 + 4, 4, TILE_SIZE - 8, TILE_SIZE - 8);

    gfx.generateTexture("tiles", TILE_SIZE * 4, TILE_SIZE);
    gfx.destroy();
  }
}
