import Phaser from "phaser";
import { TILE_SIZE, WHIP_COLOR } from "../config/constants.ts";

/**
 * Root whip — blocks the Treant until the Tank anchors it (GDD §12 Room 5).
 */
export class WhipBarrier {
  public readonly sprite: Phaser.GameObjects.Rectangle;
  public readonly body: Phaser.Physics.Arcade.StaticBody;

  private isOpen = false;
  private lockUntil = 0;
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.sprite = scene.add.rectangle(x, y, TILE_SIZE - 4, TILE_SIZE * 3, WHIP_COLOR);
    this.sprite.setStrokeStyle(2, 0x3e2723);
    this.sprite.setDepth(0.5);
    scene.physics.add.existing(this.sprite, true);
    this.body = this.sprite.body as Phaser.Physics.Arcade.StaticBody;
  }

  open(): void {
    if (this.isOpen) return;
    this.isOpen = true;
    this.sprite.setAlpha(0.2);
    this.body.enable = false;
  }

  close(): void {
    if (this.scene.time.now < this.lockUntil) return;
    if (!this.isOpen) return;
    this.isOpen = false;
    this.sprite.setAlpha(1);
    this.body.enable = true;
    this.body.updateFromGameObject();
  }

  /** Root Slam timed lock (GDD §9 timedSwitch). */
  lockTimed(ms: number): void {
    this.lockUntil = this.scene.time.now + ms;
    this.open();
  }

  blocks(x: number, y: number): boolean {
    if (this.isOpen) return false;
    const b = this.sprite.getBounds();
    return b.contains(x, y);
  }

  reset(): void {
    this.lockUntil = 0;
    this.isOpen = false;
    this.sprite.setAlpha(1);
    this.body.enable = true;
    this.body.updateFromGameObject();
  }
}
