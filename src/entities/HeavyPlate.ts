import Phaser from "phaser";
import { PLATE_COLOR_OFF, PLATE_COLOR_ON, TILE_SIZE } from "../config/constants.ts";
import type { Axie } from "./Axie.ts";
import type { Gate } from "./Gate.ts";

/**
 * HeavyPlate — pressure plate that requires Tank mass.
 * Evaluates overlapping Axies every frame to see if it should trigger.
 */
export class HeavyPlate {
  public readonly sprite: Phaser.GameObjects.Rectangle;
  private readonly target: Gate;
  private isPressed = false;

  constructor(scene: Phaser.Scene, x: number, y: number, target: Gate) {
    // Make it slightly smaller than a full tile visually
    this.sprite = scene.add.rectangle(x, y, TILE_SIZE - 4, TILE_SIZE - 4, PLATE_COLOR_OFF);
    
    // Draw an outline to make it look like a mechanism
    this.sprite.setStrokeStyle(2, 0x000000);

    // Put it on the floor (below Axies)
    this.sprite.setDepth(-1);

    this.target = target;
  }

  /**
   * Called every frame by GameScene to evaluate if a Tank is standing on it.
   */
  update(axies: Axie[]): void {
    let currentlyPressed = false;
    const plateBounds = this.sprite.getBounds();

    for (const axie of axies) {
      // GDD §9: Heavy plates require Tank mass (Plant class)
      if (axie.role !== "Tank") continue;

      const axieBounds = axie.sprite.getBounds();

      // Simple bounding box intersection
      if (Phaser.Geom.Intersects.RectangleToRectangle(plateBounds, axieBounds)) {
        currentlyPressed = true;
        break; // One tank is enough
      }
    }

    // Handle state transitions
    if (currentlyPressed && !this.isPressed) {
      this.isPressed = true;
      this.sprite.setFillStyle(PLATE_COLOR_ON);
      this.target.open();
    } else if (!currentlyPressed && this.isPressed) {
      this.isPressed = false;
      this.sprite.setFillStyle(PLATE_COLOR_OFF);
      this.target.close();
    }
  }
}
