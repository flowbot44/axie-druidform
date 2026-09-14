import Phaser from "phaser";
import { TILE_SIZE } from "../config/constants.ts";
import { ghostBody } from "../art/paint.ts";
import type { Axie } from "./Axie.ts";

/**
 * Release lever — Room 3 far side (GDD §12).
 * Walk onto it to lock the gate open so the Tank can leave the plate.
 */
export class Lever {
  public readonly sprite: Phaser.GameObjects.Rectangle;
  private readonly art: Phaser.GameObjects.Image;
  private pulled = false;
  private readonly onPull: () => void;

  constructor(scene: Phaser.Scene, x: number, y: number, onPull: () => void) {
    this.onPull = onPull;
    this.sprite = scene.add.rectangle(x, y, 14, TILE_SIZE - 4, 0x000000, 0);
    ghostBody(this.sprite);
    this.sprite.setDepth(0.45);
    this.art = scene.add.image(x, y, "prop-lever-off").setDepth(0.46);
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
    this.art.setTexture("prop-lever-off");
  }

  private pull(): void {
    this.pulled = true;
    this.art.setTexture("prop-lever-on");
    this.onPull();
  }
}
