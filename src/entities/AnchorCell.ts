import Phaser from "phaser";
import {
  ANCHOR_COLOR_OFF,
  ANCHOR_COLOR_ON,
  SLAM_RADIUS,
  TILE_SIZE,
} from "../config/constants.ts";
import type { Axie } from "./Axie.ts";
import type { WhipBarrier } from "./WhipBarrier.ts";

/**
 * Tank anchor cell — stand (or slam) to pin the root whip (GDD §12 beat 1).
 */
export class AnchorCell {
  public readonly sprite: Phaser.GameObjects.Rectangle;
  private readonly whip: WhipBarrier;
  private pressed = false;

  constructor(scene: Phaser.Scene, x: number, y: number, whip: WhipBarrier) {
    this.sprite = scene.add.rectangle(x, y, TILE_SIZE - 4, TILE_SIZE - 4, ANCHOR_COLOR_OFF);
    this.sprite.setStrokeStyle(2, 0x000000);
    this.sprite.setDepth(0.1);
    this.whip = whip;
    scene.add
      .text(x, y - 20, "ANCHOR", {
        fontSize: "8px",
        color: "#90a4ae",
        fontFamily: "monospace",
      })
      .setOrigin(0.5)
      .setDepth(0.2);
  }

  update(axies: Axie[]): void {
    let on = false;
    const cell = this.sprite.getBounds();
    for (const axie of axies) {
      if (axie.isAbsorbed()) continue;
      if (!axie.canPressPlate()) continue;

      if (Phaser.Geom.Intersects.RectangleToRectangle(cell, axie.sprite.getBounds())) {
        on = true;
        break;
      }
    }

    if (on && !this.pressed) {
      this.pressed = true;
      this.sprite.setFillStyle(ANCHOR_COLOR_ON);
      this.whip.open();
    } else if (!on && this.pressed) {
      this.pressed = false;
      this.sprite.setFillStyle(ANCHOR_COLOR_OFF);
      this.whip.close();
    }
  }

  trySlamLock(origin: { x: number; y: number }): boolean {
    const dist = Phaser.Math.Distance.Between(
      origin.x,
      origin.y,
      this.sprite.x,
      this.sprite.y,
    );
    if (dist > SLAM_RADIUS + 8) return false;
    this.whip.lockTimed(5000);
    this.sprite.setFillStyle(ANCHOR_COLOR_ON);
    return true;
  }
}
