import Phaser from "phaser";
import { PLATE_COLOR_OFF, PLATE_COLOR_ON, TILE_SIZE } from "../config/constants.ts";
import { bearHoldMs } from "../config/forms.ts";
import type { Axie } from "./Axie.ts";
import type { Gate } from "./Gate.ts";

/**
 * Unfused Plant, or Bear form.
 * Bear stepping off keeps the gate down long enough for any trio to cross.
 */
export class HeavyPlate {
  public readonly sprite: Phaser.GameObjects.Rectangle;
  private readonly target: Gate | null;
  private readonly scene: Phaser.Scene;
  private isPressed = false;
  private holdUntil = 0;
  private lastBearRating = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, target: Gate | null = null) {
    this.scene = scene;
    this.sprite = scene.add.rectangle(x, y, TILE_SIZE - 4, TILE_SIZE - 4, PLATE_COLOR_OFF);
    this.sprite.setStrokeStyle(2, 0x000000);
    this.sprite.setDepth(0.1);
    this.target = target;
  }

  update(axies: Axie[]): void {
    let currentlyPressed = false;
    let bearRating = 0;
    const plateBounds = this.sprite.getBounds();

    for (const axie of axies) {
      if (axie.isAbsorbed()) continue;
      if (!axie.canPressPlate()) continue;
      const axieBounds = axie.sprite.getBounds();
      if (!Phaser.Geom.Intersects.RectangleToRectangle(plateBounds, axieBounds)) {
        continue;
      }
      currentlyPressed = true;
      if (axie.isBear()) bearRating = axie.formRating("bear");
      break;
    }

    if (currentlyPressed) {
      this.holdUntil = 0;
      if (bearRating > 0) this.lastBearRating = bearRating;
      if (!this.isPressed) {
        this.isPressed = true;
        this.sprite.setFillStyle(PLATE_COLOR_ON);
        this.target?.open();
      }
      return;
    }

    if (this.isPressed) {
      if (this.lastBearRating > 0) {
        this.holdUntil = this.scene.time.now + bearHoldMs(this.lastBearRating);
      }
      this.isPressed = false;
      this.lastBearRating = 0;
    }

    if (this.scene.time.now < this.holdUntil) {
      this.sprite.setFillStyle(PLATE_COLOR_ON);
      this.target?.open();
      return;
    }

    this.sprite.setFillStyle(PLATE_COLOR_OFF);
    this.target?.close();
  }
}
