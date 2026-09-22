import Phaser from "phaser";
import { TILE_SIZE } from "../config/constants.ts";
import { PUZZLE_HP } from "../config/combat.ts";
import { ghostBody, idlePulse } from "../art/paint.ts";

/**
 * Room 1 / 4 thorns. Any kit chips them; slash one-shots.
 */
export class Bramble {
  public readonly sprite: Phaser.GameObjects.Rectangle;
  public readonly body: Phaser.Physics.Arcade.StaticBody;

  private cut = false;
  private hp = PUZZLE_HP;
  private readonly scene: Phaser.Scene;
  private readonly art: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.sprite = scene.add.rectangle(x, y, TILE_SIZE, TILE_SIZE, 0x000000, 0);
    ghostBody(this.sprite);
    this.sprite.setDepth(0.5);
    this.art = scene.add.image(x, y, "prop-bramble").setDepth(0.51);
    idlePulse(scene, this.art);
    scene.physics.add.existing(this.sprite, true);
    this.body = this.sprite.body as Phaser.Physics.Arcade.StaticBody;
  }

  isCut(): boolean {
    return this.cut;
  }

  takeDamage(amount: number): boolean {
    if (this.cut) return false;
    this.hp -= amount;
    if (this.hp > 0) {
      this.paintChip();
      return false;
    }
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

  setHint(hot: boolean): void {
    if (this.cut) return;
    if (hot) this.art.setTint(0xffe082);
    else if (this.hp < PUZZLE_HP) this.art.setTint(0x90a4ae);
    else this.art.clearTint();
  }

  /** @deprecated use takeDamage */
  tryCut(): boolean {
    return this.takeDamage(PUZZLE_HP);
  }

  reset(): void {
    this.cut = false;
    this.hp = PUZZLE_HP;
    this.scene.tweens.killTweensOf(this.art);
    this.art.setAlpha(1);
    this.art.setScale(1);
    this.art.setAngle(0);
    this.art.clearTint();
    this.art.setVisible(true);
    idlePulse(this.scene, this.art);
    this.body.enable = true;
  }

  /**
   * Bear Ground Pound exclusive: flash white, disable collider,
   * then auto-shatter after duration.
   */
  stun(durationMs: number): void {
    if (this.cut) return;
    this.body.enable = false;
    this.art.setTint(0xffffff);
    this.scene.tweens.add({
      targets: this.art,
      alpha: { from: 1, to: 0.4 },
      duration: 300,
      yoyo: true,
      repeat: Math.floor(durationMs / 600),
    });
    this.scene.time.delayedCall(durationMs, () => {
      if (!this.cut) this.takeDamage(PUZZLE_HP);
    });
  }

  private paintChip(): void {
    const t = this.hp / PUZZLE_HP;
    this.art.setScale(0.5 + 0.5 * t);
    this.art.setTint(t > 0.5 ? 0xcfd8dc : 0x90a4ae);
    this.scene.tweens.add({
      targets: this.art,
      alpha: { from: 1, to: 0.55 },
      duration: 70,
      yoyo: true,
    });
  }
}
