import Phaser from "phaser";
import { ENERGY_PICKUP_AMOUNT } from "../config/constants.ts";
import { sfx, floater } from "../systems/Juice.ts";

/**
 * EnergyPickup — grants bonus energy when touched by any party member.
 */
export class EnergyPickup {
  public readonly sprite: Phaser.GameObjects.Arc;
  public readonly body: Phaser.Physics.Arcade.Body;
  
  private active = true;
  private scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    
    // Visuals: glowing gold circle
    this.sprite = scene.add.circle(x, y, 10, 0xffd54f, 0.9);
    this.sprite.setStrokeStyle(2, 0xffffff, 0.8);
    this.sprite.setDepth(2);
    
    // Physics body for overlap detection
    scene.physics.add.existing(this.sprite);
    this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.body.setCircle(10);
    
    // Idle bob animation
    scene.tweens.add({
      targets: this.sprite,
      y: y - 4,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
    
    // Glow pulse
    const glow = scene.add.circle(x, y, 16, 0xffd54f, 0.3);
    glow.setDepth(1.9);
    scene.tweens.add({
      targets: glow,
      scale: 1.4,
      alpha: 0,
      duration: 1000,
      yoyo: true,
      repeat: -1,
    });
  }

  isActive(): boolean {
    return this.active;
  }

  collect(): void {
    if (!this.active) return;
    this.active = false;
    
    this.body.enable = false;
    
    // Grant energy
    const current = (this.scene.registry.get("energy") as number) ?? 0;
    this.scene.registry.set("energy", current + ENERGY_PICKUP_AMOUNT);
    
    // Juice
    sfx.heal();
    floater(this.scene, this.sprite.x, this.sprite.y, `+${ENERGY_PICKUP_AMOUNT}`);
    
    this.scene.tweens.add({
      targets: this.sprite,
      scale: 2,
      alpha: 0,
      duration: 200,
      onComplete: () => this.sprite.destroy(),
    });
  }
  
  destroy(): void {
    this.active = false;
    this.sprite.destroy();
  }
}
