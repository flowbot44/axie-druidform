import Phaser from "phaser";
import { hitParticles, sfx } from "../systems/Juice.ts";

export class Enemy {
  public sprite: Phaser.GameObjects.Ellipse;
  public body: Phaser.Physics.Arcade.Body;
  private scene: Phaser.Scene;
  private hp = 1;
  private speed = 50;

  private originalX: number;
  private originalY: number;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    this.scene = scene;
    this.originalX = x;
    this.originalY = y;
    this.sprite = scene.add.ellipse(x, y, 24, 24, 0xe53935);
    this.sprite.setDepth(0.6);
    scene.physics.add.existing(this.sprite);
    this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.body.setCollideWorldBounds(true);
    this.body.setBounce(1);
    
    this.pickDirection();
    scene.time.addEvent({
      delay: 1500 + Math.random() * 1000,
      loop: true,
      callback: () => this.pickDirection()
    });
  }

  reset() {
    this.hp = 1;
    this.body.enable = true;
    this.sprite.setVisible(true);
    this.sprite.setPosition(this.originalX, this.originalY);
    this.pickDirection();
  }

  private pickDirection() {
    if (!this.body.enable) return;
    const angle = Math.random() * Math.PI * 2;
    this.body.setVelocity(Math.cos(angle) * this.speed, Math.sin(angle) * this.speed);
  }

  takeDamage(amount: number): boolean {
    if (!this.body.enable) return false;
    this.hp -= amount;
    if (this.hp <= 0) {
      this.body.enable = false;
      this.sprite.setVisible(false);
      hitParticles(this.scene, this.sprite.x, this.sprite.y, 0xe53935);
      sfx.clear();
      return true;
    }
    return false;
  }
}
