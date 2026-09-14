import Phaser from "phaser";
import { TILE_SIZE } from "../config/constants.ts";
import { ghostBody } from "../art/paint.ts";

/**
 * Root doorway — the only way east. Bear on the ANCHOR drops it (GDD §12 Room 5).
 */
export class WhipBarrier {
  public readonly sprite: Phaser.GameObjects.Rectangle;
  public readonly body: Phaser.Physics.Arcade.StaticBody;
  private readonly art: Phaser.GameObjects.Image;

  private isOpen = false;
  private lockUntil = 0;
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.sprite = scene.add.rectangle(x, y, TILE_SIZE - 2, TILE_SIZE * 3, 0x000000, 0);
    ghostBody(this.sprite);
    this.sprite.setDepth(0.5);
    this.art = scene.add.image(x, y, "prop-whip").setDepth(0.51);
    scene.physics.add.existing(this.sprite, true);
    this.body = this.sprite.body as Phaser.Physics.Arcade.StaticBody;
  }

  isBlocking(): boolean {
    return !this.isOpen;
  }

  open(): void {
    if (this.isOpen) return;
    this.isOpen = true;
    this.art.setTexture("prop-whip-open");
    this.art.setAlpha(0.9);
    this.body.enable = false;
  }

  close(): void {
    if (this.scene.time.now < this.lockUntil) return;
    if (!this.isOpen) return;
    this.isOpen = false;
    this.art.setTexture("prop-whip");
    this.art.setAlpha(1);
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
    this.art.setTexture("prop-whip");
    this.art.setAlpha(1);
    this.body.enable = true;
    this.body.updateFromGameObject();
  }
}
