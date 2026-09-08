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
  PARTY,
  ROOM_1,
} from "../config/constants.ts";
import { Axie } from "../entities/Axie.ts";

interface WASDKeys {
  W: Phaser.Input.Keyboard.Key;
  A: Phaser.Input.Keyboard.Key;
  S: Phaser.Input.Keyboard.Key;
  D: Phaser.Input.Keyboard.Key;
}

/**
 * GameScene — main gameplay scene.
 *
 * Step 1: one room, one Axie (Olek), WASD movement, tilemap collision.
 * Launches HUDScene as a parallel overlay.
 */
export class GameScene extends Phaser.Scene {
  private axie!: Axie;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: WASDKeys;
  private elapsedMs = 0;

  constructor() {
    super({ key: "GameScene" });
  }

  create(): void {
    // ── Registry (shared state for HUD) ──────────────────────────────
    this.registry.set("energy", STARTING_ENERGY);
    this.registry.set("activeSlot", 1);
    this.registry.set("roomIndex", 1);
    this.registry.set("runTime", 0);

    // ── Tile textures (procedural) ───────────────────────────────────
    this.createTileTextures();

    // ── Tilemap from array ───────────────────────────────────────────
    const map = this.make.tilemap({
      data: ROOM_1,
      tileWidth: TILE_SIZE,
      tileHeight: TILE_SIZE,
    });
    const tileset = map.addTilesetImage("tiles", "tiles", TILE_SIZE, TILE_SIZE, 0, 0, 0)!;
    const layer = map.createLayer(0, tileset, 0, 0)!;
    layer.setCollision(TILE_WALL);

    // ── World & camera ───────────────────────────────────────────────
    const roomPxW = ROOM_WIDTH * TILE_SIZE;
    const roomPxH = ROOM_HEIGHT * TILE_SIZE;

    this.physics.world.setBounds(0, 0, roomPxW, roomPxH);

    this.cameras.main.setZoom(2);
    this.cameras.main.centerOn(roomPxW / 2, roomPxH / 2);

    // ── Spawn Olek (slot 1) ──────────────────────────────────────────
    const spawnX = 3 * TILE_SIZE + TILE_SIZE / 2;
    const spawnY = Math.floor(ROOM_HEIGHT / 2) * TILE_SIZE + TILE_SIZE / 2;
    const firstMember = PARTY[0];
    if (!firstMember) throw new Error("Party roster is empty");
    this.axie = new Axie(this, spawnX, spawnY, firstMember);

    // ── Collision ────────────────────────────────────────────────────
    this.physics.add.collider(this.axie.sprite, layer);

    // ── Input ────────────────────────────────────────────────────────
    if (!this.input.keyboard) throw new Error("Keyboard input unavailable");
    this.cursors = this.input.keyboard.createCursorKeys();
    this.wasd = this.input.keyboard.addKeys("W,A,S,D") as WASDKeys;

    // ── HUD overlay ──────────────────────────────────────────────────
    this.scene.launch("HUDScene");
  }

  update(_time: number, delta: number): void {
    // Run timer
    this.elapsedMs += delta;
    this.registry.set("runTime", this.elapsedMs);

    // Movement
    this.axie.move(this.getInputDirection());
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
