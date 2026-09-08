import Phaser from "phaser";
import {
  EYE_COLOR_IDLE,
  EYE_COLOR_SOLVED,
  EYE_COLOR_WRONG,
  EYE_TARGET_TIER,
} from "../config/constants.ts";

/**
 * Eye-beacon — Room 2 interactable (GDD §11, §12).
 * A dart resolves only when attacker.heightTier === targetTier (1).
 */
export class EyeBeacon {
  public readonly sprite: Phaser.GameObjects.Arc;
  public readonly targetTier: number;

  private readonly scene: Phaser.Scene;
  private readonly pupil: Phaser.GameObjects.Arc;
  private readonly label: Phaser.GameObjects.Text;
  private solved = false;
  private readonly onSolved: () => void;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    onSolved: () => void,
    targetTier = EYE_TARGET_TIER,
  ) {
    this.scene = scene;
    this.onSolved = onSolved;
    this.targetTier = targetTier;

    this.sprite = scene.add.circle(x, y, 12, EYE_COLOR_IDLE);
    this.sprite.setStrokeStyle(2, 0xe0f7fa);
    this.sprite.setDepth(0.5);

    this.pupil = scene.add.circle(x, y, 4, 0x102027);
    this.pupil.setDepth(0.55);

    this.label = scene.add
      .text(x, y - 22, `T${this.targetTier}`, {
        fontSize: "10px",
        color: "#e0f7fa",
        fontFamily: "monospace",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(0.6);
  }

  isSolved(): boolean {
    return this.solved;
  }

  /** Called by a dart that reached this eye. */
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
    this.sprite.setFillStyle(EYE_COLOR_IDLE);
    this.sprite.setStrokeStyle(2, 0xe0f7fa);
    this.label.setText(`T${this.targetTier}`);
    this.label.setColor("#e0f7fa");
  }

  private solve(): void {
    this.solved = true;
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.setFillStyle(EYE_COLOR_SOLVED);
    this.sprite.setStrokeStyle(2, 0xffffff);
    this.label.setText("OK");
    this.label.setColor("#69f0ae");
    this.onSolved();
  }

  private flashWrong(): void {
    this.scene.tweens.killTweensOf(this.sprite);
    this.sprite.setFillStyle(EYE_COLOR_WRONG);
    this.scene.tweens.add({
      targets: this.sprite,
      alpha: { from: 1, to: 0.4 },
      duration: 80,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        if (this.solved) return;
        this.sprite.setAlpha(1);
        this.sprite.setFillStyle(EYE_COLOR_IDLE);
      },
    });
  }
}
