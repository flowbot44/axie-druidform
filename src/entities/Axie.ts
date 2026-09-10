import Phaser from "phaser";
import type { PartyMember, AxieClass, AxieParts } from "../config/constants.ts";
import {
  DRUID_2_RANGE,
  DRUID_2_SPEED,
  DRUID_3_RANGE,
  DRUID_3_SPEED,
  PLAYER_SPEED,
} from "../config/constants.ts";
import {
  defaultFormFor,
  formColor,
  formLabel,
  hawkSpeedMul,
  isFlyerClass,
  isHeavyClass,
  lineageScore,
  type DruidForm,
} from "../config/forms.ts";

/**
 * Axie — a single party member's world representation.
 *
 * { slot, axieClass, parts, followPark, guests, absorbedBy }
 */
export class Axie {
  public readonly slot: number;
  public readonly axieClass: AxieClass;
  public readonly parts: AxieParts;
  public readonly axeName: string;
  public readonly speed: number;
  public readonly baseColor: number;

  public readonly sprite: Phaser.GameObjects.Ellipse;
  public readonly body: Phaser.Physics.Arcade.Body;

  private readonly indicator: Phaser.GameObjects.Arc;
  private readonly slotLabel: Phaser.GameObjects.Text;
  private readonly scene: Phaser.Scene;

  public followPark: "follow" | "park" = "follow";
  public guests: Axie[] = [];
  public absorbedBy: Axie | null = null;
  public fuseUntil = 0;
  public form: DruidForm | null = null;
  public lastFacing = { x: 1, y: 0 };
  public lastSafe = { x: 0, y: 0 };

  constructor(scene: Phaser.Scene, x: number, y: number, config: PartyMember) {
    this.scene = scene;
    this.slot = config.slot;
    this.axieClass = config.axieClass;
    this.parts = config.parts;
    this.axeName = config.name;
    this.speed = config.speed;
    this.baseColor = config.color;

    this.indicator = scene.add.circle(x, y, 18, 0x000000, 0);
    this.indicator.setStrokeStyle(2, 0xffffff, 0.8);
    this.indicator.setVisible(false);
    this.indicator.setDepth(0);

    this.sprite = scene.add.ellipse(x, y, 28, 22, config.color);
    this.sprite.setDepth(1);
    scene.physics.add.existing(this.sprite);
    this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.body.setCollideWorldBounds(true);
    this.lastSafe = { x, y };

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

  move(direction: { x: number; y: number }): void {
    const spd = this.moveSpeed();
    this.body.setVelocity(direction.x * spd, direction.y * spd);
    if (direction.x !== 0 || direction.y !== 0) {
      this.lastFacing = { x: direction.x, y: direction.y };
    }
  }

  isDruidHost(): boolean {
    return this.guests.length > 0;
  }

  isAbsorbed(): boolean {
    return this.absorbedBy !== null;
  }

  isFused(): boolean {
    return this.isDruidHost() || this.isAbsorbed();
  }

  fusionSize(): number {
    return 1 + this.guests.length;
  }

  hasClass(cls: AxieClass): boolean {
    if (this.axieClass === cls) return true;
    return this.guests.some((g) => g.axieClass === cls);
  }

  /** Official Plant + Bird pair inside this Druidform (duration / vine bonus). */
  isDawnSynergy(): boolean {
    return this.isDruidHost() && this.hasClass("Plant") && this.hasClass("Bird");
  }

  pile(): Axie[] {
    return [this, ...this.guests];
  }

  lineageCount(pred: (cls: AxieClass) => boolean): number {
    return this.pile().filter((a) => pred(a.axieClass)).length;
  }

  formRating(form: DruidForm): number {
    return this.pile().reduce((sum, a) => sum + lineageScore(a.axieClass, form), 0);
  }

  isBear(): boolean {
    return this.isDruidHost() && this.form === "bear";
  }

  isCat(): boolean {
    return this.isDruidHost() && this.form === "cat";
  }

  isHawk(): boolean {
    return this.isDruidHost() && this.form === "hawk";
  }

  canPressPlate(): boolean {
    if (this.isAbsorbed()) return false;
    if (this.isDruidHost()) return this.form === "bear";
    return isHeavyClass(this.axieClass);
  }

  getRole(): string {
    if (this.isDruidHost() && this.form) {
      return `${formLabel(this.form)} ×${this.fusionSize()}`;
    }
    if (this.axieClass === "Plant") return "Tank";
    if (this.axieClass === "Beast") return "Striker";
    if (this.axieClass === "Bird") return "Scout";
    return this.axieClass;
  }

  moveSpeed(): number {
    const base =
      this.axieClass === "Beast" && !this.isDruidHost()
        ? this.speed
        : PLAYER_SPEED;
    if (!this.isDruidHost()) return base;
    const sizeMul = this.fusionSize() >= 3 ? DRUID_3_SPEED : DRUID_2_SPEED;
    const flyMul =
      this.form === "hawk"
        ? hawkSpeedMul(this.lineageCount(isFlyerClass))
        : 1;
    return Math.floor(base * sizeMul * flyMul);
  }

  rangeMul(): number {
    if (!this.isDruidHost()) return 1;
    return this.fusionSize() >= 3 ? DRUID_3_RANGE : DRUID_2_RANGE;
  }

  beginForm(form: DruidForm = defaultFormFor(this.axieClass)): void {
    this.form = form;
    this.applyDruidLook();
  }

  applyDruidLook(): void {
    const triple = this.fusionSize() >= 3;
    const color = this.form ? formColor(this.form) : 0x9575cd;
    this.sprite.setFillStyle(color, 1);
    this.sprite.setSize(triple ? 36 : 32, triple ? 28 : 24);
    const tag =
      this.form === "bear" ? "B" : this.form === "cat" ? "C" : "H";
    this.slotLabel.setText(`${tag}${triple ? "3" : "2"}`);
  }

  restoreLook(): void {
    this.sprite.setFillStyle(this.baseColor, 1);
    this.sprite.setSize(28, 22);
    this.slotLabel.setText(`${this.slot}`);
    this.fuseUntil = 0;
    this.form = null;
  }

  setHidden(hidden: boolean): void {
    this.sprite.setVisible(!hidden);
    this.slotLabel.setVisible(!hidden);
    this.indicator.setVisible(!hidden && this.indicator.visible);
    this.setBodyEnabled(!hidden);
  }

  setBodyEnabled(enabled: boolean): void {
    this.body.enable = enabled;
    if (!enabled) {
      this.body.setVelocity(0, 0);
    }
  }

  setActive(active: boolean): void {
    this.scene.tweens.killTweensOf(this.indicator);
    this.indicator.setVisible(active && this.sprite.visible);

    if (active && this.sprite.visible) {
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

  syncVisuals(): void {
    this.indicator.setPosition(this.sprite.x, this.sprite.y);
    this.slotLabel.setPosition(this.sprite.x, this.sprite.y - 18);
  }

  getWeightTier(): number {
    if (this.isAbsorbed()) return 1;
    if (this.canPressPlate()) return 3;
    if (this.hasClass("Beast")) return 2;
    return 1;
  }
}
