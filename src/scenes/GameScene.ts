import Phaser from "phaser";
import {
  TILE_SIZE,
  ROOM_WIDTH,
  ROOM_HEIGHT,
  FLOOR_COLOR,
  WALL_COLOR,
  WALL_ACCENT,
  GRID_LINE_COLOR,
  TILE_WALL,
  STARTING_ENERGY,
  ROOM_3,
} from "../config/constants.ts";
import { PartyManager } from "../systems/PartyManager.ts";
import { Gate } from "../entities/Gate.ts";
import { HeavyPlate } from "../entities/HeavyPlate.ts";

interface WASDKeys {
  W: Phaser.Input.Keyboard.Key;
  A: Phaser.Input.Keyboard.Key;
  S: Phaser.Input.Keyboard.Key;
  D: Phaser.Input.Keyboard.Key;
}

/**
 * GameScene — main gameplay scene.
 *
 * Step 2: three Axies, slot select (1/2/3/Tab), follow tether, F park.
 * Launches HUDScene as a parallel overlay.
 */
export class GameScene extends Phaser.Scene {
  private partyManager!: PartyManager;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: WASDKeys;
  private elapsedMs = 0;

  private gate!: Gate;
  private heavyPlate!: HeavyPlate;

  constructor() {
    super({ key: "GameScene" });
  }

  create(): void {
    // ── Registry (shared state for HUD) ──────────────────────────────
    this.registry.set("energy", STARTING_ENERGY);
    this.registry.set("activeSlot", 1);
    this.registry.set("roomIndex", 3); // Changed for Step 3 focus
    this.registry.set("runTime", 0);
    this.registry.set("partyStates", {
      1: "active",
      2: "follow",
      3: "follow",
    });

    // ── Tile textures (procedural) ───────────────────────────────────
    this.createTileTextures();

    // ── Tilemap from array ───────────────────────────────────────────
    const map = this.make.tilemap({
      data: ROOM_3,
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
    const layer = map.createLayer(0, tileset, 0, 0)!;
    layer.setCollision(TILE_WALL);

    // ── World & camera ───────────────────────────────────────────────
    const roomPxW = ROOM_WIDTH * TILE_SIZE;
    const roomPxH = ROOM_HEIGHT * TILE_SIZE;

    this.physics.world.setBounds(0, 0, roomPxW, roomPxH);
    this.cameras.main.setZoom(2);
    this.cameras.main.centerOn(roomPxW / 2, roomPxH / 2);

    // ── Party ────────────────────────────────────────────────────────
    this.partyManager = new PartyManager(this);

    // ── Puzzle Entities ──────────────────────────────────────────────
    // Gate at col 10, row 5
    this.gate = new Gate(this, 10 * TILE_SIZE + TILE_SIZE / 2, 5 * TILE_SIZE + TILE_SIZE / 2);
    // Plate at col 5, row 5 (left side)
    this.heavyPlate = new HeavyPlate(this, 5 * TILE_SIZE + TILE_SIZE / 2, 5 * TILE_SIZE + TILE_SIZE / 2, this.gate);

    // ── Collisions ───────────────────────────────────────────────────
    const sprites = this.partyManager.getSprites();

    // Each Axie vs tilemap walls and gate
    for (const sprite of sprites) {
      this.physics.add.collider(sprite, layer);
      this.physics.add.collider(sprite, this.gate.sprite);
    }

    // Axies vs each other (pairwise)
    for (let i = 0; i < sprites.length; i++) {
      for (let j = i + 1; j < sprites.length; j++) {
        this.physics.add.collider(sprites[i]!, sprites[j]!);
      }
    }

    // ── Input ────────────────────────────────────────────────────────
    if (!this.input.keyboard) throw new Error("Keyboard input unavailable");

    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys("W,A,S,D") as WASDKeys;

    // Capture Tab so the browser doesn't steal focus
    this.input.keyboard.addCapture([Phaser.Input.Keyboard.KeyCodes.TAB]);

    // Slot select: 1 / 2 / 3
    const key1 = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.ONE,
    );
    const key2 = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.TWO,
    );
    const key3 = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.THREE,
    );
    key1.on("down", () => this.partyManager.selectSlot(1));
    key2.on("down", () => this.partyManager.selectSlot(2));
    key3.on("down", () => this.partyManager.selectSlot(3));

    // Cycle: Tab
    const keyTab = this.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.TAB,
    );
    keyTab.on("down", () => this.partyManager.cycleSlot());

    // Follow / Park toggle: F
    const keyF = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.F);
    keyF.on("down", () => this.partyManager.toggleFollowPark());

    // ── HUD overlay ──────────────────────────────────────────────────
    this.scene.launch("HUDScene");
  }

  update(_time: number, delta: number): void {
    // Run timer
    this.elapsedMs += delta;
    this.registry.set("runTime", this.elapsedMs);

    // Active Axie responds to player input
    this.partyManager.getActive().move(this.getInputDirection());

    // Drive follower movement + sync visuals
    this.partyManager.update();

    // Evaluate puzzle entities
    this.heavyPlate.update(this.partyManager.getAxies());
  }

  // ── Helpers ──────────────────────────────────────────────────────────

  private getInputDirection(): { x: number; y: number } {
    let x = 0;
    let y = 0;

    if (this.cursors.left.isDown || this.wasd.A.isDown) x -= 1;
    if (this.cursors.right.isDown || this.wasd.D.isDown) x += 1;
    if (this.cursors.up.isDown || this.wasd.W.isDown) y -= 1;
    if (this.cursors.down.isDown || this.wasd.S.isDown) y += 1;

    // Normalize so diagonal movement isn't ~41% faster
    if (x !== 0 && y !== 0) {
      const len = Math.sqrt(x * x + y * y);
      x /= len;
      y /= len;
    }

    return { x, y };
  }

  /**
   * Generate a 2-tile-wide texture strip used as the tileset.
   * Index 0 = floor, Index 1 = wall.
   */
  private createTileTextures(): void {
    const gfx = this.make.graphics({ x: 0, y: 0 });

    // Tile 0 — floor
    gfx.fillStyle(FLOOR_COLOR, 1);
    gfx.fillRect(0, 0, TILE_SIZE, TILE_SIZE);
    gfx.lineStyle(1, GRID_LINE_COLOR, 0.2);
    gfx.strokeRect(0, 0, TILE_SIZE, TILE_SIZE);

    // Tile 1 — wall
    gfx.fillStyle(WALL_COLOR, 1);
    gfx.fillRect(TILE_SIZE, 0, TILE_SIZE, TILE_SIZE);
    gfx.lineStyle(1, WALL_ACCENT, 0.8);
    gfx.strokeRect(TILE_SIZE + 1, 1, TILE_SIZE - 2, TILE_SIZE - 2);

    gfx.generateTexture("tiles", TILE_SIZE * 2, TILE_SIZE);
    gfx.destroy();
  }
}
