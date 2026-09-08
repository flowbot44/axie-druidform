import Phaser from "phaser";
import type { PartyMember } from "../config/constants.ts";

/**
 * Axie — a single party member's world representation.
 *
 * Wraps a colored ellipse with an Arcade physics body.
 * Properties match GDD §14 implementation notes:
 *   { slot, role, followPark, heightTier, mountedTo }
 */
export class Axie {
  public readonly slot: number;
  public readonly role: string;
  public readonly axeName: string;
  public readonly speed: number;

  /** The physics-enabled game object. Use for collision setup. */
  public readonly sprite: Phaser.GameObjects.Ellipse;
  public readonly body: Phaser.Physics.Arcade.Body;

  // State — wired in later steps
  public heightTier = 1;
  public followPark: "follow" | "park" = "follow";
  public mountedTo: Axie | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, config: PartyMember) {
    this.slot = config.slot;
    this.role = config.role;
    this.axeName = config.name;
    this.speed = config.speed;

    // Colored ellipse — "colored primitive bodies" (GDD §14, days 1–3)
    this.sprite = scene.add.ellipse(x, y, 28, 22, config.color);
    scene.physics.add.existing(this.sprite);

    this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.body.setCollideWorldBounds(true);
  }

  /** Apply a normalized direction vector as velocity. */
  move(direction: { x: number; y: number }): void {
    this.body.setVelocity(
      direction.x * this.speed,
      direction.y * this.speed,
    );
  }
}
