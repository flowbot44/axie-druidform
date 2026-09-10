import Phaser from "phaser";
import {
  CRYSTAL_COLOR_IDLE,
  CRYSTAL_COLOR_SOLVED,
  CRYSTAL_COLOR_WRONG,
  CRYSTAL_INTERACT_RANGE,
  TILE_SIZE,
} from "../config/constants.ts";
import type { Axie } from "./Axie.ts";

/**
 * Pillar crystal — Room 4. Resolves only on a Dawn Seed Dart (GDD §11).
 */
export class Crystal {
  public readonly sprite: Phaser.GameObjects.Rectangle;
  public readonly body: Phaser.Physics.Arcade.StaticBody;

  private readonly scene: Phaser.Scene;
  private readonly label: Phaser.GameObjects.Text;
  private solved = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;

    this.sprite = scene.add.rectangle(x, y, 20, TILE_SIZE, CRYSTAL_COLOR_IDLE);
    this.sprite.setStrokeStyle(2, 0xe1bee7);
    this.sprite.setDepth(0.4);

    scene.physics.add.existing(this.sprite, true);
    this.body = this.sprite.body as Phaser.Physics.Arcade.StaticBody;

    this.label = scene.add
      .text(x, y - 28, "HAWK", {
        fontSize: "10px",
        color: "#e1bee7",
        fontFamily: "monospace",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(0.5);
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
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.setAlpha(1);
    this.sprite.setFillStyle(CRYSTAL_COLOR_IDLE);
    this.sprite.setStrokeStyle(2, 0xe1bee7);
    this.label.setText("HAWK");
    this.label.setColor("#e1bee7");
    this.scene.registry.set("crystalSolved", false);
  }

  private solve(): void {
    this.solved = true;
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.setFillStyle(CRYSTAL_COLOR_SOLVED);
    this.sprite.setStrokeStyle(2, 0xffffff);
    this.label.setText("OK");
    this.label.setColor("#80deea");
    this.scene.registry.set("crystalSolved", true);
  }

  private flashWrong(): void {
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.setFillStyle(CRYSTAL_COLOR_WRONG);
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: { from: 1, to: 0.4 },
      duration: 80,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        if (this.solved) return;
        this.sprite.setAlpha(1);
        this.sprite.setFillStyle(CRYSTAL_COLOR_IDLE);
      },
    });
  }
}
