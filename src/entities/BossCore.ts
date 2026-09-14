import Phaser from "phaser";
import { TILE_SIZE } from "../config/constants.ts";
import { ghostBody, idlePulse } from "../art/paint.ts";

/**
 * Exposed Treant core — Ronin Slash once after the weak eye is hit (GDD §12 beat 3).
 */
export class BossCore {
  public readonly sprite: Phaser.GameObjects.Rectangle;
  private readonly art: Phaser.GameObjects.Image;
  private readonly scene: Phaser.Scene;
  private exposed = false;
  private slashed = false;
  private readonly onSlashed: () => void;

  constructor(scene: Phaser.Scene, x: number, y: number, onSlashed: () => void) {
    this.scene = scene;
    this.onSlashed = onSlashed;
    this.sprite = scene.add.rectangle(x, y, TILE_SIZE - 6, TILE_SIZE - 6, 0x000000, 0);
    ghostBody(this.sprite);
    this.sprite.setDepth(0.55);
    this.sprite.setVisible(false);
    this.art = scene.add.image(x, y, "prop-core").setDepth(0.56);
    this.art.setVisible(false);
  }

  isExposed(): boolean {
    return this.exposed && !this.slashed;
  }

  isSlashed(): boolean {
    return this.slashed;
  }

  expose(): void {
    if (this.slashed) return;
    this.exposed = true;
    this.sprite.setVisible(true);
    this.art.setVisible(true);
    this.art.setTexture("prop-core");
    idlePulse(this.scene, this.art);
  }

  tryCut(): boolean {
    if (!this.exposed || this.slashed) return false;
    this.slashed = true;
    this.scene.tweens.killTweensOf(this.art);
    this.art.setAlpha(1);
    this.art.setTexture("prop-core-broken");
    this.onSlashed();
    return true;
  }

  reset(): void {
    this.exposed = false;
    this.slashed = false;
    this.scene.tweens.killTweensOf(this.art);
    this.art.setTexture("prop-core");
    this.art.setAlpha(1);
    this.sprite.setVisible(false);
    this.art.setVisible(false);
  }
}
