import Phaser from "phaser";
import { TILE_SIZE } from "../config/constants.ts";
import { ghostBody } from "../art/paint.ts";

/**
 * Bramble — Room 1 destructible. Only Ronin Slash cuts it (GDD §9, §12).
 */
export class Bramble {
  public readonly sprite: Phaser.GameObjects.Rectangle;
  public readonly body: Phaser.Physics.Arcade.StaticBody;

  private cut = false;
  private readonly scene: Phaser.Scene;
  private readonly art: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.sprite = scene.add.rectangle(x, y, TILE_SIZE, TILE_SIZE, 0x000000, 0);
    ghostBody(this.sprite);
    this.sprite.setDepth(0.5);
    this.art = scene.add.image(x, y, "prop-bramble").setDepth(0.51);
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
    this.scene.tweens.killTweensOf(this.art);
    this.scene.tweens.add({
      targets: this.art,
      alpha: 0,
      scale: 0.4,
      angle: 12,
      duration: 180,
    });
    return true;
  }

  reset(): void {
    this.cut = false;
    this.scene.tweens.killTweensOf(this.art);
    this.art.setAlpha(1);
    this.art.setScale(1);
    this.art.setAngle(0);
    this.art.setVisible(true);
    this.body.enable = true;
  }
}
