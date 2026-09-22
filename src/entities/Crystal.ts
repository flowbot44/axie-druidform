import Phaser from "phaser";
import { CRYSTAL_INTERACT_RANGE, TILE_SIZE } from "../config/constants.ts";
import { PUZZLE_HP } from "../config/combat.ts";
import { ghostBody, idlePulse } from "../art/paint.ts";
import type { Axie } from "./Axie.ts";

/**
 * Room 4 optional. Dart one-shots; other kits chip.
 */
export class Crystal {
  public readonly sprite: Phaser.GameObjects.Rectangle;
  public readonly body: Phaser.Physics.Arcade.StaticBody;

  private readonly scene: Phaser.Scene;
  private readonly art: Phaser.GameObjects.Image;
  private solved = false;
  private hp = PUZZLE_HP;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;

    this.sprite = scene.add.rectangle(x, y, 20, TILE_SIZE, 0x000000, 0);
    ghostBody(this.sprite);
    this.sprite.setDepth(0.4);
    this.art = scene.add.image(x, y, "prop-crystal-idle").setDepth(0.41);
    idlePulse(scene, this.art);

    scene.physics.add.existing(this.sprite, true);
    this.body = this.sprite.body as Phaser.Physics.Arcade.StaticBody;
  }

  isSolved(): boolean {
    return this.solved;
  }

  tryActivate(axie: Axie): boolean {
    if (this.solved) return false;
    const dist = Phaser.Math.Distance.Between(
      axie.sprite.x,
      axie.sprite.y,
      this.sprite.x,
      this.sprite.y,
    );
    if (dist > CRYSTAL_INTERACT_RANGE) return false;
    return this.receiveHit(axie.isHawk() ? PUZZLE_HP : 1);
  }

  receiveHit(amount: number): boolean {
    if (this.solved) return false;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.solve();
      return true;
    }
    this.flashChip();
    return true;
  }

  setHint(hot: boolean): void {
    if (this.solved) return;
    if (hot) this.art.setTint(0x81d4fa);
    else this.art.clearTint();
  }

  reset(): void {
    this.solved = false;
    this.hp = PUZZLE_HP;
    this.scene.tweens.killTweensOf(this.art);
    this.art.setAlpha(1);
    this.art.clearTint();
    this.art.setTexture("prop-crystal-idle");
    idlePulse(this.scene, this.art);
    this.scene.registry.set("crystalSolved", false);
  }

  private solve(): void {
    this.solved = true;
    this.scene.tweens.killTweensOf(this.art);
    this.art.clearTint();
    this.art.setAlpha(1);
    this.art.setTexture("prop-crystal-ok");
    this.scene.registry.set("crystalSolved", true);
  }

  private flashChip(): void {
    this.scene.tweens.killTweensOf(this.art);
    this.art.setTint(0xfffde7);
    this.scene.tweens.add({
      targets: this.art,
      alpha: { from: 1, to: 0.55 },
      duration: 70,
      yoyo: true,
      onComplete: () => {
        if (this.solved) return;
        this.art.setAlpha(1);
        this.art.clearTint();
        idlePulse(this.scene, this.art);
      },
    });
  }
}
