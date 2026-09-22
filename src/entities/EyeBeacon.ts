import Phaser from "phaser";
import { idlePulse } from "../art/paint.ts";
import { PUZZLE_HP } from "../config/combat.ts";

export type EyeGate = "bird-or-hawk" | "hawk";

/**
 * Dart one-shots. Slash/slam chip (3 hits). Art prefix still uses gate.
 */
export class EyeBeacon {
  public readonly sprite: Phaser.GameObjects.Arc;
  public readonly gate: EyeGate;

  private readonly scene: Phaser.Scene;
  private readonly art: Phaser.GameObjects.Image;
  private readonly prefix: string;
  private solved = false;
  private hp = PUZZLE_HP;
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
    this.prefix = gate === "hawk" ? "prop-eye-hawk" : "prop-eye-bird";

    this.sprite = scene.add.circle(x, y, 14, 0x000000, 0);
    this.sprite.setDepth(0.5);
    this.art = scene.add.image(x, y, `${this.prefix}-idle`).setDepth(0.55);
    idlePulse(scene, this.art);
  }

  isSolved(): boolean {
    return this.solved;
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
    this.art.setTexture(`${this.prefix}-idle`);
    idlePulse(this.scene, this.art);
  }

  private solve(): void {
    this.solved = true;
    this.scene.tweens.killTweensOf(this.art);
    this.art.setAlpha(1);
    this.art.setTexture(`${this.prefix}-ok`);
    this.onSolved();
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
