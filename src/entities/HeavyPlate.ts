import Phaser from "phaser";
import { PLATE_COLOR_OFF, PLATE_COLOR_ON, TILE_SIZE } from "../config/constants.ts";
import type { Axie } from "./Axie.ts";
import type { Gate } from "./Gate.ts";

/**
 * HeavyPlate — pressure plate that requires Tank mass.
 * Evaluates overlapping Axies every frame to see if it should trigger.
 *
 * GDD §9 / §11: Plant as unstacked occupant OR Plant as stack **base**.
 * Riders never count. A non-Plant base does not trigger, even with a Tank on top.
 */
export class HeavyPlate {
  public readonly sprite: Phaser.GameObjects.Rectangle;
  private readonly target: Gate | null;
  private isPressed = false;

  constructor(scene: Phaser.Scene, x: number, y: number, target: Gate | null = null) {
    // Make it slightly smaller than a full tile visually
    this.sprite = scene.add.rectangle(x, y, TILE_SIZE - 4, TILE_SIZE - 4, PLATE_COLOR_OFF);
    
    // Draw an outline to make it look like a mechanism
    this.sprite.setStrokeStyle(2, 0x000000);

    // Put it on the floor (above tiles, below Axies)
    this.sprite.setDepth(0.1);

    this.target = target;
  }

  /**
   * Called every frame by GameScene to evaluate if a Tank is standing on it.
   */
  update(axies: Axie[]): void {
    let currentlyPressed = false;
    const plateBounds = this.sprite.getBounds();

    for (const axie of axies) {
      // Riders have no surface physics. Only the stack base (or an unstacked unit) counts.
      if (axie.mountedTo) continue;
      // GDD §9: Heavy plates require Tank mass (Plant class) on the cell.
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
      this.target?.open();
    } else if (!currentlyPressed && this.isPressed) {
      this.isPressed = false;
      this.sprite.setFillStyle(PLATE_COLOR_OFF);
      this.target?.close();
    }
  }
}
