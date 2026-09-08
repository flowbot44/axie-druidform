import Phaser from "phaser";
import {
  CRYSTAL_COLOR_IDLE,
  CRYSTAL_COLOR_SOLVED,
  CRYSTAL_COLOR_WRONG,
  CRYSTAL_INTERACT_RANGE,
  CRYSTAL_TARGET_TIER,
  TILE_SIZE,
} from "../config/constants.ts";
import type { Axie } from "./Axie.ts";

/**
 * Pillar crystal — Room 4 interactable (GDD §11).
 *
 * Resolves only when the attacker's heightTier matches targetTier (3).
 * Step 4 uses Space / click as a height-gated interact; dart comes in Step 6.
 */
export class Crystal {
  public readonly sprite: Phaser.GameObjects.Rectangle;
  public readonly body: Phaser.Physics.Arcade.StaticBody;
  public readonly targetTier = CRYSTAL_TARGET_TIER;

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
      .text(x, y - 28, `T${this.targetTier}`, {
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

  /**
   * Try to activate from the stack top (offense origin, GDD §11).
   * Returns true only on a successful solve this call.
   */
  tryActivate(axie: Axie): boolean {
    if (this.solved) return false;

    const attacker = axie.getTop();
    // Range from the stack base (world cell). Height still comes from the top.
    const origin = axie.getBase();
    const dist = Phaser.Math.Distance.Between(
      origin.sprite.x,
      origin.sprite.y,
      this.sprite.x,
      this.sprite.y,
    );

    if (dist > CRYSTAL_INTERACT_RANGE) return false;

    if (attacker.heightTier !== this.targetTier) {
      this.flashWrong();
      return false;
    }

    this.solve();
    return true;
  }

  receiveHit(heightTier: number): boolean {
    if (this.solved) return false;
    if (heightTier !== this.targetTier) {
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
    this.label.setText(`T${this.targetTier}`);
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
