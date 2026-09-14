import Phaser from "phaser";
import { SLAM_RADIUS, TILE_SIZE } from "../config/constants.ts";
import { bearHoldMs } from "../config/forms.ts";
import { ghostBody } from "../art/paint.ts";
import type { Axie } from "./Axie.ts";
import type { WhipBarrier } from "./WhipBarrier.ts";

/**
 * Bear / Plant on this cell drops the root doorway (GDD §12 Room 5).
 * Same hold rules as Room 3's plate: parked Plant holds, Bear gets a 2s+ race.
 */
export class AnchorCell {
  public readonly sprite: Phaser.GameObjects.Rectangle;
  private readonly whip: WhipBarrier;
  private readonly scene: Phaser.Scene;
  private isPressed = false;
  private holdUntil = 0;
  private lastBearRating = 0;
  private thornUntil = 0;
  private readonly thornSprite: Phaser.GameObjects.Image;
  private readonly art: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, x: number, y: number, whip: WhipBarrier) {
    this.scene = scene;
    this.whip = whip;
    this.sprite = scene.add.rectangle(x, y, TILE_SIZE - 4, TILE_SIZE - 4, 0x000000, 0);
    ghostBody(this.sprite);
    this.sprite.setDepth(0.1);
    this.art = scene.add.image(x, y, "prop-anchor-off").setDepth(0.11);
    this.thornSprite = scene.add.image(x, y, "prop-thorn").setDepth(0.16);
    this.thornSprite.setVisible(false);
  }

  addThornHold(ms: number): void {
    this.thornUntil = Math.max(this.thornUntil, this.scene.time.now + ms);
    this.thornSprite.setVisible(true);
    this.thornSprite.setAlpha(1);
    this.scene.tweens.killTweensOf(this.thornSprite);
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
    this.thornSprite.setVisible(false);
    this.thornSprite.setScale(1);
  }

  update(axies: Axie[]): void {
    let currentlyPressed = false;
    let bearRating = 0;
    const cell = this.sprite.getBounds();
    for (const axie of axies) {
      if (axie.isAbsorbed()) continue;
      if (!axie.canPressPlate()) continue;
      if (!Phaser.Geom.Intersects.RectangleToRectangle(cell, axie.sprite.getBounds())) {
        continue;
      }
      currentlyPressed = true;
      if (axie.isBear()) bearRating = axie.formRating("bear");
      break;
    }

    const thornActive = this.scene.time.now < this.thornUntil;
    if (!thornActive && this.thornSprite.visible) this.clearThorn();
    this.thornSprite.setVisible(thornActive);

    if (currentlyPressed) {
      this.holdUntil = 0;
      if (bearRating > 0) this.lastBearRating = bearRating;
      if (!this.isPressed) {
        this.isPressed = true;
        this.art.setTexture("prop-anchor-on");
        this.whip.open();
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
      this.art.setTexture("prop-anchor-on");
      this.whip.open();
      return;
    }

    this.art.setTexture("prop-anchor-off");
    this.whip.close();
  }

  trySlamLock(origin: { x: number; y: number }, holdMs = 2_000): boolean {
    const dist = Phaser.Math.Distance.Between(
      origin.x,
      origin.y,
      this.sprite.x,
      this.sprite.y,
    );
    if (dist > SLAM_RADIUS + 8) return false;
    this.whip.lockTimed(holdMs);
    this.art.setTexture("prop-anchor-on");
    return true;
  }

  reset(): void {
    this.isPressed = false;
    this.holdUntil = 0;
    this.lastBearRating = 0;
    this.clearThorn();
    this.art.setTexture("prop-anchor-off");
  }
}
