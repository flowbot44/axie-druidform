import Phaser from "phaser";
import { TILE_SIZE } from "../config/constants.ts";
import { bearHoldMs } from "../config/forms.ts";
import { ghostBody } from "../art/paint.ts";
import type { Axie } from "./Axie.ts";
import type { Gate } from "./Gate.ts";

/**
 * Unfused Plant, or Bear form.
 * Bear stepping off keeps the gate down long enough for any trio to cross.
 * Cactus Thorn Hold is a separate 2s weight on the plate.
 */
export class HeavyPlate {
  public readonly sprite: Phaser.GameObjects.Rectangle;
  private readonly target: Gate | null;
  private readonly scene: Phaser.Scene;
  private isPressed = false;
  private holdUntil = 0;
  private lastBearRating = 0;
  private thornUntil = 0;
  private readonly thornSprite: Phaser.GameObjects.Image;
  private readonly thornRing: Phaser.GameObjects.Arc;
  private readonly art: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, x: number, y: number, target: Gate | null = null) {
    this.scene = scene;
    this.sprite = scene.add.rectangle(x, y, TILE_SIZE - 4, TILE_SIZE - 4, 0x000000, 0);
    ghostBody(this.sprite);
    this.sprite.setDepth(0.1);
    this.art = scene.add.image(x, y, "prop-plate-off").setDepth(0.11);
    this.target = target;
    this.thornRing = scene.add.circle(x, y, 16, 0x1b5e20, 0);
    this.thornRing.setStrokeStyle(3, 0x69f0ae, 1);
    this.thornRing.setDepth(0.15);
    this.thornRing.setVisible(false);
    this.thornSprite = scene.add.image(x, y, "prop-thorn").setDepth(0.16);
    this.thornSprite.setVisible(false);
  }

  addThornHold(ms: number): void {
    this.thornUntil = Math.max(this.thornUntil, this.scene.time.now + ms);
    this.thornSprite.setVisible(true);
    this.thornSprite.setAlpha(1);
    this.thornRing.setVisible(true);
    this.thornRing.setAlpha(1);
    this.thornRing.setScale(0.7);
    this.scene.tweens.killTweensOf(this.thornSprite);
    this.scene.tweens.killTweensOf(this.thornRing);
    this.scene.tweens.add({
      targets: this.thornRing,
      scale: 1.2,
      duration: 180,
    });
    this.scene.tweens.add({
      targets: this.thornSprite,
      scale: { from: 0.75, to: 1.2 },
      alpha: { from: 1, to: 0.5 },
      duration: 380,
      yoyo: true,
      repeat: -1,
    });
  }

  clearThorn(): void {
    this.thornUntil = 0;
    this.scene.tweens.killTweensOf(this.thornSprite);
    this.scene.tweens.killTweensOf(this.thornRing);
    this.thornSprite.setVisible(false);
    this.thornSprite.setScale(1);
    this.thornRing.setVisible(false);
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

    const thornActive = this.scene.time.now < this.thornUntil;
    if (!thornActive && this.thornSprite.visible) this.clearThorn();
    this.thornSprite.setVisible(thornActive);
    this.thornRing.setVisible(thornActive);

    if (currentlyPressed) {
      this.holdUntil = 0;
      if (bearRating > 0) this.lastBearRating = bearRating;
      if (!this.isPressed) {
        this.isPressed = true;
        this.art.setTexture("prop-plate-on");
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

    if (this.scene.time.now < this.holdUntil || thornActive) {
      this.art.setTexture("prop-plate-on");
      this.target?.open();
      return;
    }

    this.art.setTexture("prop-plate-off");
    this.target?.close();
  }
}
