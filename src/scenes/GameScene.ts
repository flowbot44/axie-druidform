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
import { PartyManager } from "../systems/PartyManager.ts";
import { AbilitySystem } from "../systems/AbilitySystem.ts";
import { Dungeon } from "../systems/Dungeon.ts";

interface WASDKeys {
  W: Phaser.Input.Keyboard.Key;
  A: Phaser.Input.Keyboard.Key;
  S: Phaser.Input.Keyboard.Key;
  D: Phaser.Input.Keyboard.Key;
}

/**
 * GameScene — main gameplay scene.
 *
 * Step 7: five rooms, room camera, Reset Bell, energyOnRoomEnter (GDD §6, §8, §10).
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
    this.registry.set("partyStates", {
      1: "active",
      2: "follow",
      3: "follow",
    });

    this.createTileTextures();
    this.dungeon = new Dungeon(this);

    this.partyManager = new PartyManager(this);
    this.partyManager.setHazardQuery((x, y) => this.dungeon.isPit(x, y));
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

    if (!this.input.keyboard) throw new Error("Keyboard input unavailable");

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys("W,A,S,D") as WASDKeys;

    this.input.keyboard.addCapture([
      Phaser.Input.Keyboard.KeyCodes.TAB,
      Phaser.Input.Keyboard.KeyCodes.SPACE,
    ]);

    const key1 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ONE);
    const key2 = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.TWO);
    const key3 = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.THREE,
    );
    key1.on("down", () => this.partyManager.selectSlot(1));
    key2.on("down", () => this.partyManager.selectSlot(2));
    key3.on("down", () => this.partyManager.selectSlot(3));

    const keyZ = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.Z);
    const keyX = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.X);
    const keyC = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.C);
    keyZ.on("down", () => this.partyManager.switchForm("bear"));
    keyX.on("down", () => this.partyManager.switchForm("cat"));
    keyC.on("down", () => this.partyManager.switchForm("hawk"));

    const keyTab = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.TAB,
    );
    keyTab.on("down", () => this.partyManager.cycleSlot());

    const keyF = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);
    keyF.on("down", () => this.partyManager.toggleFollowPark());

    const keyE = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.E);
    keyE.on("down", () => this.partyManager.tryFuseOrSplit());

    const keySpace = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE,
    );
    keySpace.on("down", () => {
      this.pointerArmed = true;
      this.tryFireAbility();
    });
    this.input.keyboard.on("keydown", () => {
      this.pointerArmed = true;
    });
    this.input.on("pointerdown", () => {
      if (!this.pointerArmed) {
        this.pointerArmed = true;
        return;
      }
      this.tryFireAbility();
    });

    this.scene.launch("HUDScene");
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
    this.dungeon.tryRingBell(
      driven.sprite.x,
      driven.sprite.y,
      this.partyManager,
      (ms) => {
        this.elapsedMs += ms;
      },
    );

    if (this.dungeon.takeVictory()) {
      this.scene.pause("GameScene");
      this.scene.pause("HUDScene");
      this.scene.launch("VictoryScene");
    }
  }

  private tryFireAbility(): void {
    const { attacker, origin, facing } = this.partyManager.getAttackContext();
    this.abilities.tryFire(
      attacker,
      origin,
      facing,
      this.dungeon.abilityTargets(),
    );
  }

  private getInputDirection(): { x: number; y: number } {
    let x = 0;
    let y = 0;

    if (this.cursors.left.isDown || this.wasd.A.isDown) x -= 1;
    if (this.cursors.right.isDown || this.wasd.D.isDown) x += 1;
    if (this.cursors.up.isDown || this.wasd.W.isDown) y -= 1;
    if (this.cursors.down.isDown || this.wasd.S.isDown) y += 1;

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

    gfx.generateTexture("tiles", TILE_SIZE * 3, TILE_SIZE);
    gfx.destroy();
  }
}
