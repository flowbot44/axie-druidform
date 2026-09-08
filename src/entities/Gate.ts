import Phaser from "phaser";
import { GATE_COLOR_CLOSED, GATE_COLOR_OPEN, TILE_SIZE } from "../config/constants.ts";

/**
 * Gate — a sealed door that can be opened/closed.
 * Backed by a static physics body to block movement.
 */
export class Gate {
  public readonly sprite: Phaser.GameObjects.Rectangle;
  public readonly body: Phaser.Physics.Arcade.StaticBody;

  private isOpen = false;
  private lockedOpen = false;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.sprite = scene.add.rectangle(x, y, TILE_SIZE, TILE_SIZE, GATE_COLOR_CLOSED);
    this.sprite.setDepth(0.5);
    
    // Static body so it doesn't move when pushed
    scene.physics.add.existing(this.sprite, true);
    this.body = this.sprite.body as Phaser.Physics.Arcade.StaticBody;
  }

  open(): void {
    if (this.isOpen) return;
    this.isOpen = true;

    this.sprite.setFillStyle(GATE_COLOR_OPEN);
    this.sprite.setAlpha(0.2); // Make it look passable
    
    // Disable physics body so Axies can walk through
    this.body.enable = false;
  }

  close(): void {
    if (this.lockedOpen) return;
    if (!this.isOpen) return;
    this.isOpen = false;

    this.sprite.setFillStyle(GATE_COLOR_CLOSED);
    this.sprite.setAlpha(1.0);

    this.body.enable = true;
    this.body.updateFromGameObject();
  }

  /** Lever on the far side: gate stays open even if the plate is released. */
  lockOpen(): void {
    this.lockedOpen = true;
    this.open();
    this.sprite.setFillStyle(GATE_COLOR_OPEN);
    this.sprite.setAlpha(0.35);
  }

  unlock(): void {
    this.lockedOpen = false;
    this.close();
  }
}
