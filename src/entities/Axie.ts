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

  private readonly indicator: Phaser.GameObjects.Arc;
  private readonly slotLabel: Phaser.GameObjects.Text;
  private readonly scene: Phaser.Scene;

  // State — GDD §14 implementation notes
  public heightTier = 1;
  public followPark: "follow" | "park" = "follow";
  public mountedTo: Axie | null = null;
  /** Direct rider parented on this Axie (one child; walk to the top). */
  public directRider: Axie | null = null;
  /** Last non-zero move direction; used for dismount pop (GDD §11). */
  public lastFacing = { x: 1, y: 0 };
  /** Last floor position; used for pit snap (GDD §8, §10). */
  public lastSafe = { x: 0, y: 0 };

  constructor(scene: Phaser.Scene, x: number, y: number, config: PartyMember) {
    this.scene = scene;
    this.slot = config.slot;
    this.role = config.role;
    this.axeName = config.name;
    this.speed = config.speed;

    // Active indicator ring (rendered behind the ellipse)
    this.indicator = scene.add.circle(x, y, 18, 0x000000, 0);
    this.indicator.setStrokeStyle(2, 0xffffff, 0.8);
    this.indicator.setVisible(false);
    this.indicator.setDepth(0);

    // Colored ellipse — "colored primitive bodies" (GDD §14, days 1–3)
    this.sprite = scene.add.ellipse(x, y, 28, 22, config.color);
    this.sprite.setDepth(1);
    scene.physics.add.existing(this.sprite);
    this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.body.setCollideWorldBounds(true);
    this.lastSafe = { x, y };

    // Slot number label above the body
    this.slotLabel = scene.add
      .text(x, y - 18, `${config.slot}`, {
        fontSize: "10px",
        color: "#ffffff",
        fontFamily: "monospace",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(2);
  }

  /** Apply a normalized direction vector as velocity. */
  move(direction: { x: number; y: number }): void {
    this.body.setVelocity(direction.x * this.speed, direction.y * this.speed);
    if (direction.x !== 0 || direction.y !== 0) {
      this.lastFacing = { x: direction.x, y: direction.y };
    }
  }

  /** True if this Axie is a rider or is carrying at least one rider. */
  isInStack(): boolean {
    return this.mountedTo !== null || this.directRider !== null;
  }

  /** Walk down to the stack base (self if unstacked). */
  getBase(): Axie {
    let node: Axie = this;
    while (node.mountedTo) node = node.mountedTo;
    return node;
  }

  /** Walk up to the stack top (self if unstacked). */
  getTop(): Axie {
    let node: Axie = this;
    while (node.directRider) node = node.directRider;
    return node;
  }

  /** Enable/disable the independent Arcade body (riders have none). */
  setBodyEnabled(enabled: boolean): void {
    this.body.enable = enabled;
    if (!enabled) {
      this.body.setVelocity(0, 0);
    }
  }

  /** Draw riders above carriers (heightTier 1..3). */
  applyStackDepth(): void {
    this.sprite.setDepth(this.heightTier);
    this.indicator.setDepth(this.heightTier - 0.1);
    this.slotLabel.setDepth(this.heightTier + 0.1);
  }

  /** Toggle the active indicator ring with a pulsing tween. */
  setActive(active: boolean): void {
    this.scene.tweens.killTweensOf(this.indicator);
    this.indicator.setVisible(active);

    if (active) {
      this.indicator.setAlpha(0.8);
      this.scene.tweens.add({
        targets: this.indicator,
        alpha: { from: 0.8, to: 0.3 },
        duration: 800,
        yoyo: true,
        repeat: -1,
      });
    }
  }

  /** Sync child visuals (indicator, label) to the sprite position. Call after physics. */
  syncVisuals(): void {
    this.indicator.setPosition(this.sprite.x, this.sprite.y);
    this.slotLabel.setPosition(this.sprite.x, this.sprite.y - 18);
  }
}
