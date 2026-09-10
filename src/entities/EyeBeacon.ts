import Phaser from "phaser";
import {
  EYE_COLOR_IDLE,
  EYE_COLOR_SOLVED,
  EYE_COLOR_WRONG,
} from "../config/constants.ts";
import type { Axie } from "./Axie.ts";

export type EyeGate = "bird-or-hawk" | "hawk";

/**
 * Room 2: unfused Bird or Hawk. Room 5: Hawk only.
 */
export class EyeBeacon {
  public readonly sprite: Phaser.GameObjects.Arc;
  public readonly gate: EyeGate;

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
    gate: EyeGate = "bird-or-hawk",
  ) {
    this.scene = scene;
    this.onSolved = onSolved;
    this.gate = gate;

    this.sprite = scene.add.circle(x, y, 12, EYE_COLOR_IDLE);
    this.sprite.setStrokeStyle(2, 0xe0f7fa);
    this.sprite.setDepth(0.5);

    this.pupil = scene.add.circle(x, y, 4, 0x102027);
    this.pupil.setDepth(0.55);

    this.label = scene.add
      .text(x, y - 22, gate === "hawk" ? "HAWK" : "BIRD", {
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

  receiveHit(attacker: Axie): boolean {
    if (this.solved) return false;
    const hawk = attacker.isHawk();
    const bird = attacker.axieClass === "Bird" && !attacker.isDruidHost();
    const ok = this.gate === "hawk" ? hawk : hawk || bird;
    if (!ok) {
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
    this.label.setText(this.gate === "hawk" ? "HAWK" : "BIRD");
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
