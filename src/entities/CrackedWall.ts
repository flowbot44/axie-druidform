import Phaser from "phaser";
import { TILE_SIZE } from "../config/constants.ts";
import type { BearVerb } from "../config/parts.ts";
import { sfx, floater } from "../systems/Juice.ts";

/**
 * CrackedWall — a wall segment that breaks only on Thorn Hold slam.
 * 
 * When broken, replaces its wall tiles with floor tiles, creating a shortcut.
 * This is a verb-gated optional route: you don't need it, but having a cactus
 * Plant rewards you with a faster path through Room 3.
 */
export class CrackedWall {
  public readonly sprite: Phaser.GameObjects.Rectangle;
  public readonly body: Phaser.Physics.Arcade.StaticBody;

  private broken = false;
  private readonly scene: Phaser.Scene;
  private readonly art: Phaser.GameObjects.Graphics;
  private readonly onBreak: () => void;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    onBreak: () => void,
  ) {
    this.scene = scene;
    this.onBreak = onBreak;

    // Collision rect
    this.sprite = scene.add.rectangle(x, y, TILE_SIZE, TILE_SIZE * 2, 0x000000, 0);
    this.sprite.setDepth(0.5);
    scene.physics.add.existing(this.sprite, true);
    this.body = this.sprite.body as Phaser.Physics.Arcade.StaticBody;

    // Cracked wall visual — lighter wall with diagonal cracks
    this.art = scene.add.graphics();
    this.art.setDepth(0.52);
    this.paintCracked(x, y);
  }

  isBroken(): boolean {
    return this.broken;
  }

  /**
   * Try to break this wall. Only Thorn Hold verb succeeds.
   * Returns true if the wall broke.
   */
  tryBreak(verb: BearVerb | null, originX: number, originY: number, radius: number): boolean {
    if (this.broken) return false;
    if (verb !== "thorn_hold") return false;

    const dist = Math.hypot(
      originX - this.sprite.x,
      originY - this.sprite.y,
    );
    if (dist > radius) return false;

    this.broken = true;
    this.body.enable = false;
    this.onBreak();

    // Rubble VFX
    this.art.clear();
    this.rubbleVFX();
    sfx.slam();
    floater(this.scene, this.sprite.x, this.sprite.y - 8, "Shortcut!", "#ffd54f");

    return true;
  }

  reset(): void {
    this.broken = false;
    this.body.enable = true;
    this.art.clear();
    this.paintCracked(this.sprite.x, this.sprite.y);
  }

  private paintCracked(x: number, y: number): void {
    const hw = TILE_SIZE / 2;
    const hh = TILE_SIZE;

    // Darker wall base
    this.art.fillStyle(0x2a2a3e, 1);
    this.art.fillRect(x - hw, y - hh, TILE_SIZE, TILE_SIZE * 2);

    // Lighter accent to differentiate from normal walls
    this.art.fillStyle(0x3a3a52, 0.6);
    this.art.fillRect(x - hw + 2, y - hh + 2, TILE_SIZE - 4, TILE_SIZE * 2 - 4);

    // Crack lines (tan/cream colored)
    this.art.lineStyle(2, 0xd7ccc8, 0.7);
    this.art.lineBetween(x - hw + 4, y - hh + 6, x + hw - 4, y + hh - 6);
    this.art.lineBetween(x - hw + 8, y + hh - 8, x + hw - 2, y - hh + 12);
    this.art.lineStyle(1, 0xbcaaa4, 0.5);
    this.art.lineBetween(x, y - hh + 4, x - 6, y);
    this.art.lineBetween(x + 4, y, x - 2, y + hh - 4);

    // Pulse to draw attention
    this.scene.tweens.add({
      targets: this.art,
      alpha: { from: 1, to: 0.7 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
    });
  }

  private rubbleVFX(): void {
    const cx = this.sprite.x;
    const cy = this.sprite.y;

    for (let i = 0; i < 8; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 12 + Math.random() * 24;
      const size = 3 + Math.random() * 5;
      const piece = this.scene.add.rectangle(
        cx,
        cy,
        size,
        size,
        i % 2 === 0 ? 0x8d6e63 : 0xbcaaa4,
        0.8,
      );
      piece.setDepth(6);
      piece.setRotation(Math.random() * Math.PI);
      this.scene.tweens.add({
        targets: piece,
        x: cx + Math.cos(angle) * dist,
        y: cy + Math.sin(angle) * dist,
        alpha: 0,
        angle: piece.angle + (Math.random() - 0.5) * 180,
        duration: 350 + Math.random() * 200,
        onComplete: () => piece.destroy(),
      });
    }

    // Dust cloud
    const dust = this.scene.add.circle(cx, cy, 18, 0xd7ccc8, 0.4);
    dust.setDepth(5);
    this.scene.tweens.add({
      targets: dust,
      scale: 3,
      alpha: 0,
      duration: 400,
      onComplete: () => dust.destroy(),
    });

    this.scene.cameras.main.shake(100, 0.006);
  }
}
