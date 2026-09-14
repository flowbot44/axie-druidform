import Phaser from "phaser";
import { CRYSTAL_INTERACT_RANGE, TILE_SIZE } from "../config/constants.ts";
import { ghostBody, idlePulse } from "../art/paint.ts";
import type { Axie } from "./Axie.ts";

/**
 * Pillar crystal — Room 4. Resolves only on a Dawn Seed Dart (GDD §11).
 */
export class Crystal {
  public readonly sprite: Phaser.GameObjects.Rectangle;
  public readonly body: Phaser.Physics.Arcade.StaticBody;

  private readonly scene: Phaser.Scene;
  private readonly art: Phaser.GameObjects.Image;
  private solved = false;

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
    if (!axie.isHawk()) {
      this.flashWrong();
      return false;
    }
    this.solve();
    return true;
  }

  receiveHit(attacker: Axie): boolean {
    if (this.solved) return false;
    if (!attacker.isHawk()) {
      this.flashWrong();
      return false;
    }
    this.solve();
    return true;
  }

  reset(): void {
    this.solved = false;
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

  private flashWrong(): void {
    this.scene.tweens.killTweensOf(this.art);
    this.art.setTexture("prop-crystal-bad");
    this.scene.tweens.add({
      targets: this.art,
      alpha: { from: 1, to: 0.4 },
      duration: 80,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        if (this.solved) return;
        this.art.setAlpha(1);
        this.art.setTexture("prop-crystal-idle");
        idlePulse(this.scene, this.art);
      },
    });
  }
}
