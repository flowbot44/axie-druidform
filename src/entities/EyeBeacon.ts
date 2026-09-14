import Phaser from "phaser";
import { idlePulse } from "../art/paint.ts";
import type { Axie } from "./Axie.ts";

export type EyeGate = "bird-or-hawk" | "hawk";

/**
 * Room 2: unfused Bird or Hawk. Room 5: Hawk only.
 */
export class EyeBeacon {
  public readonly sprite: Phaser.GameObjects.Arc;
  public readonly gate: EyeGate;

  private readonly scene: Phaser.Scene;
  private readonly art: Phaser.GameObjects.Image;
  private readonly prefix: string;
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
    this.prefix = gate === "hawk" ? "prop-eye-hawk" : "prop-eye-bird";

    this.sprite = scene.add.circle(x, y, 14, 0x000000, 0);
    this.sprite.setDepth(0.5);
    this.art = scene.add.image(x, y, `${this.prefix}-idle`).setDepth(0.55);
    idlePulse(scene, this.art);
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

  private flashWrong(): void {
    this.scene.tweens.killTweensOf(this.art);
    this.art.setTexture(`${this.prefix}-bad`);
    this.scene.tweens.add({
      targets: this.art,
      alpha: { from: 1, to: 0.4 },
      duration: 80,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        if (this.solved) return;
        this.art.setAlpha(1);
        this.art.setTexture(`${this.prefix}-idle`);
        idlePulse(this.scene, this.art);
      },
    });
  }
}
