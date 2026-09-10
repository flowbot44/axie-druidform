import Phaser from "phaser";
import {
  LEVER_COLOR_OFF,
  LEVER_COLOR_ON,
  TILE_SIZE,
} from "../config/constants.ts";
import type { Axie } from "./Axie.ts";

/**
 * Release lever — Room 3 far side (GDD §12).
 * Walk onto it to lock the gate open so the Tank can leave the plate.
 */
export class Lever {
  public readonly sprite: Phaser.GameObjects.Rectangle;
  private readonly label: Phaser.GameObjects.Text;
  private pulled = false;
  private readonly onPull: () => void;

  constructor(scene: Phaser.Scene, x: number, y: number, onPull: () => void) {
    this.onPull = onPull;
    this.sprite = scene.add.rectangle(x, y, 10, TILE_SIZE - 8, LEVER_COLOR_OFF);
    this.sprite.setStrokeStyle(2, 0x5d4037);
    this.sprite.setDepth(0.45);
    this.label = scene.add
      .text(x, y - 22, "Lever", {
        fontSize: "9px",
        color: "#bcaaa4",
        fontFamily: "monospace",
      })
      .setOrigin(0.5)
      .setDepth(0.5);
  }

  isPulled(): boolean {
    return this.pulled;
  }

  update(axies: Axie[]): void {
    if (this.pulled) return;
    const bounds = this.sprite.getBounds();
    for (const axie of axies) {
      if (axie.isAbsorbed()) continue;
      if (
        Phaser.Geom.Intersects.RectangleToRectangle(bounds, axie.sprite.getBounds())
      ) {
        this.pull();
        return;
      }
    }
  }

  reset(): void {
    this.pulled = false;
    this.sprite.setFillStyle(LEVER_COLOR_OFF);
    this.label.setColor("#bcaaa4");
  }

  private pull(): void {
    this.pulled = true;
    this.sprite.setFillStyle(LEVER_COLOR_ON);
    this.label.setColor("#ffc107");
    this.onPull();
  }
}
