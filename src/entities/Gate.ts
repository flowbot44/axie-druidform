import Phaser from "phaser";
import { TILE_SIZE } from "../config/constants.ts";
import { ghostBody } from "../art/paint.ts";

/**
 * Gate — a sealed door that can be opened/closed.
 * Backed by a static physics body to block movement.
 */
export class Gate {
  public readonly sprite: Phaser.GameObjects.Rectangle;
  public readonly body: Phaser.Physics.Arcade.StaticBody;
  private readonly art: Phaser.GameObjects.Image;

  private isOpen = false;
  private lockedOpen = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.sprite = scene.add.rectangle(x, y, TILE_SIZE, TILE_SIZE, 0x000000, 0);
    ghostBody(this.sprite);
    this.sprite.setDepth(0.5);
    this.art = scene.add.image(x, y, "prop-gate").setDepth(0.51);

    scene.physics.add.existing(this.sprite, true);
    this.body = this.sprite.body as Phaser.Physics.Arcade.StaticBody;
  }

  open(): void {
    if (this.isOpen) return;
    this.isOpen = true;
    this.art.setTexture("prop-gate-open");
    this.art.setAlpha(1);
    this.body.enable = false;
  }

  close(): void {
    if (this.lockedOpen) return;
    if (!this.isOpen) return;
    this.isOpen = false;
    this.art.setTexture("prop-gate");
    this.art.setAlpha(1);
    this.body.enable = true;
    this.body.updateFromGameObject();
  }

  /** Lever on the far side: gate stays open even if the plate is released. */
  lockOpen(): void {
    this.lockedOpen = true;
    this.open();
  }

  unlock(): void {
    this.lockedOpen = false;
    this.close();
  }
}
