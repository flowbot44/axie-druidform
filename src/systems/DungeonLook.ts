import Phaser from "phaser";
import {
  ROOM_COUNT,
  ROOM_HEIGHT,
  ROOM_PX_H,
  ROOM_PX_W,
  ROOM_WIDTH,
  TILE_FILL,
  TILE_FLOOR,
  TILE_PIT,
  TILE_SIZE,
  TILE_WALL,
} from "../config/constants.ts";
import { hash01 } from "../art/paint.ts";

const ROOM_BG = [0x000000, 0x08140c, 0x081018, 0x14100a, 0x100818, 0x12100c];

function themeAt(tx: number): number {
  return Math.max(1, Math.min(5, Math.floor(tx / ROOM_WIDTH) + 1));
}

function tileIndex(layer: Phaser.Tilemaps.TilemapLayer, tx: number, ty: number): number {
  const t = layer.getTileAt(tx, ty, true);
  return t?.index ?? TILE_WALL;
}

function isOpen(index: number): boolean {
  return index === TILE_FLOOR || index === TILE_FILL;
}

/**
 * Visual pass over the collision tilemap. Does not change physics.
 * Zelda-like: framed rooms, diamond floors, brick walls, cream pit lips, torches.
 */
export class DungeonLook {
  private readonly rt: Phaser.GameObjects.RenderTexture;
  private readonly decals: Phaser.GameObjects.Image[] = [];
  private readonly emitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];
  private readonly mist: Phaser.GameObjects.Rectangle[] = [];

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly layer: Phaser.Tilemaps.TilemapLayer,
  ) {
    this.rt = scene.add.renderTexture(0, 0, ROOM_PX_W * ROOM_COUNT, ROOM_PX_H);
    this.rt.setOrigin(0, 0);
    this.rt.setDepth(0);
    this.layer.setVisible(false);
    this.paint();
    this.placeDecals();
    this.placeMist();
    this.placeParticles();
  }

  paint(): void {
    this.rt.clear();
    for (let ty = 0; ty < ROOM_HEIGHT; ty++) {
      for (let tx = 0; tx < ROOM_WIDTH * ROOM_COUNT; tx++) {
        this.blitTile(tx, ty);
      }
    }
    for (let ty = 0; ty < ROOM_HEIGHT; ty++) {
      for (let tx = 0; tx < ROOM_WIDTH * ROOM_COUNT; tx++) {
        this.blitEdges(tx, ty);
      }
    }
  }

  tintRoom(index: number): void {
    const bg = ROOM_BG[index] ?? 0x08140c;
    this.scene.cameras.main.setBackgroundColor(bg);
  }

  private blitTile(tx: number, ty: number): void {
    const index = tileIndex(this.layer, tx, ty);
    const theme = themeAt(tx);
    const x = tx * TILE_SIZE;
    const y = ty * TILE_SIZE;
    if (index === TILE_WALL) {
      this.rt.draw(`tile-wall-${theme}-0`, x, y);
      return;
    }
    if (index === TILE_PIT) {
      this.rt.draw(`tile-pit-${theme}-0`, x, y);
      return;
    }
    if (index === TILE_FILL) {
      this.rt.draw(theme === 2 ? "tile-bridge" : "tile-vine", x, y);
      return;
    }
    const v = (tx + ty) & 1;
    this.rt.draw(`tile-floor-${theme}-${v}`, x, y);
  }

  private blitEdges(tx: number, ty: number): void {
    const index = tileIndex(this.layer, tx, ty);
    const x = tx * TILE_SIZE;
    const y = ty * TILE_SIZE;
    if (index === TILE_PIT) {
      if (isOpen(tileIndex(this.layer, tx, ty - 1))) this.rt.draw("rim-n", x, y);
      if (isOpen(tileIndex(this.layer, tx, ty + 1))) this.rt.draw("rim-s", x, y + TILE_SIZE - 6);
      if (isOpen(tileIndex(this.layer, tx - 1, ty))) this.rt.draw("rim-w", x, y);
      if (isOpen(tileIndex(this.layer, tx + 1, ty))) this.rt.draw("rim-e", x + TILE_SIZE - 6, y);
    }
    if (index === TILE_WALL && isOpen(tileIndex(this.layer, tx, ty + 1))) {
      this.rt.draw("wall-face", x, y + TILE_SIZE - 12);
    }
    if (isOpen(index) && tileIndex(this.layer, tx, ty - 1) === TILE_WALL) {
      this.rt.draw("shadow-n", x, y);
    }
    const local = tx % ROOM_WIDTH;
    if (isOpen(index) && ty >= 4 && ty <= 6) {
      if (local === 0) this.rt.draw("door-w", x, y);
      if (local === ROOM_WIDTH - 1) this.rt.draw("door-e", x, y);
    }
  }

  private placeDecals(): void {
    for (const d of this.decals) d.destroy();
    this.decals.length = 0;

    for (let room = 1; room <= ROOM_COUNT; room++) {
      const ox = (room - 1) * ROOM_WIDTH;
      this.torchAt(ox + 2, 1);
      this.torchAt(ox + 17, 1);
      this.potAt(ox + 1, 2);
      this.potAt(ox + 18, 2);
    }

    for (let ty = 1; ty < ROOM_HEIGHT - 1; ty++) {
      for (let tx = 1; tx < ROOM_WIDTH * ROOM_COUNT - 1; tx++) {
        if (tileIndex(this.layer, tx, ty) !== TILE_FLOOR) continue;
        if (this.busyCell(tx, ty)) continue;
        const theme = themeAt(tx);
        if (theme !== 1) continue;
        const nWall = tileIndex(this.layer, tx, ty - 1) === TILE_WALL;
        const roll = hash01(tx, ty, 11);
        const x = tx * TILE_SIZE + TILE_SIZE / 2;
        const y = ty * TILE_SIZE + TILE_SIZE / 2;
        if (nWall && roll > 0.72) this.spawn("dec-hang", x, y - 10, 0.22, true);
      }
    }
  }

  private torchAt(tx: number, ty: number): void {
    if (tileIndex(this.layer, tx, ty) !== TILE_FLOOR) return;
    const x = tx * TILE_SIZE + TILE_SIZE / 2;
    const y = ty * TILE_SIZE + 8;
    this.spawn("dec-torch", x, y, 0.3, false, true);
  }

  private potAt(tx: number, ty: number): void {
    if (tileIndex(this.layer, tx, ty) !== TILE_FLOOR) return;
    if (this.busyCell(tx, ty)) return;
    const x = tx * TILE_SIZE + TILE_SIZE / 2;
    const y = ty * TILE_SIZE + TILE_SIZE / 2 + 4;
    this.spawn("dec-pot", x, y, 0.12);
  }

  private busyCell(tx: number, ty: number): boolean {
    const local = tx % ROOM_WIDTH;
    const room = themeAt(tx);
    if (room === 1 && local === 10) return true;
    if (room === 2 && local >= 8 && local <= 10) return true;
    if (room === 3 && ty === 5) return true;
    if (room === 4 && (local === 14 || (local >= 8 && local <= 9))) return true;
    if (room === 5 && (local === 10 || ty === 5 || (local >= 12 && local <= 16))) return true;
    return false;
  }

  private spawn(
    key: string,
    x: number,
    y: number,
    depth: number,
    sway = false,
    glow = false,
  ): void {
    const img = this.scene.add.image(x, y, key);
    img.setDepth(depth);
    this.decals.push(img);
    if (sway) {
      this.scene.tweens.add({
        targets: img,
        x: x + 2,
        duration: 1800 + hash01(x, y, 4) * 800,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    }
    if (glow) {
      this.scene.tweens.add({
        targets: img,
        alpha: { from: 1, to: 0.55 },
        duration: 420,
        yoyo: true,
        repeat: -1,
      });
    }
  }

  private placeMist(): void {
    const bands = [
      { room: 2, col: 8, w: 3, color: 0x000000, alpha: 0.28 },
      { room: 4, col: 8, w: 2, color: 0x000000, alpha: 0.22 },
    ];
    for (const b of bands) {
      const cx = (b.room - 1) * ROOM_PX_W + (b.col + b.w / 2) * TILE_SIZE;
      const mist = this.scene.add.rectangle(
        cx,
        ROOM_PX_H / 2,
        b.w * TILE_SIZE + 8,
        ROOM_PX_H - 64,
        b.color,
        b.alpha,
      );
      mist.setDepth(0.08);
      this.mist.push(mist);
    }
  }

  private placeParticles(): void {
    if (!this.scene.textures.exists("px-dot")) return;
    const embers = this.scene.add.particles(0, 0, "px-dot", {
      x: { min: 0, max: ROOM_PX_W * ROOM_COUNT },
      y: { min: 20, max: 48 },
      lifespan: 1400,
      speedY: { min: -18, max: -6 },
      speedX: { min: -4, max: 4 },
      scale: { start: 1.1, end: 0.2 },
      alpha: { start: 0.8, end: 0 },
      frequency: 180,
      blendMode: "ADD",
      tint: [0xff7043, 0xe0b84a],
      emitting: true,
      quantity: 1,
    });
    embers.setDepth(0.85);
    this.emitters.push(embers);
  }
}
