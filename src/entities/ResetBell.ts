import Phaser from "phaser";
import { BELL_COLOR } from "../config/constants.ts";

/**
 * Reset Bell — room retry (GDD §10). Overlap to ring.
 */
export class ResetBell {
  public readonly sprite: Phaser.GameObjects.Arc;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.sprite = scene.add.circle(x, y, 12, BELL_COLOR);
    this.sprite.setStrokeStyle(2, 0xeceff1);
    this.sprite.setDepth(0.4);
    scene.add
      .text(x, y - 18, "Bell", {
        fontSize: "9px",
        color: "#b0bec5",
        fontFamily: "monospace",
      })
      .setOrigin(0.5)
      .setDepth(0.4);
  }

  contains(x: number, y: number): boolean {
    return Phaser.Math.Distance.Between(x, y, this.sprite.x, this.sprite.y) <= 18;
  }
}
