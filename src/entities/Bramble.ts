import Phaser from "phaser";
import { BRAMBLE_COLOR, BRAMBLE_STROKE, TILE_SIZE } from "../config/constants.ts";

/**
 * Bramble — Room 1 destructible. Only Ronin Slash cuts it (GDD §9, §12).
 */
export class Bramble {
  public readonly sprite: Phaser.GameObjects.Rectangle;
  public readonly body: Phaser.Physics.Arcade.StaticBody;

  private cut = false;
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.sprite = scene.add.rectangle(x, y, TILE_SIZE, TILE_SIZE, BRAMBLE_COLOR);
    this.sprite.setStrokeStyle(2, BRAMBLE_STROKE);
    this.sprite.setDepth(0.5);
    scene.physics.add.existing(this.sprite, true);
    this.body = this.sprite.body as Phaser.Physics.Arcade.StaticBody;
  }

  isCut(): boolean {
    return this.cut;
  }

  tryCut(): boolean {
    if (this.cut) return false;
    this.cut = true;
    this.body.enable = false;
    this.scene.tweens.killTweensOf(this.sprite);
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: 0,
      scale: 0.4,
      duration: 180,
    });
    return true;
  }

  reset(): void {
    this.cut = false;
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.setAlpha(1);
    this.sprite.setScale(1);
    this.sprite.setVisible(true);
    this.body.enable = true;
  }
}
