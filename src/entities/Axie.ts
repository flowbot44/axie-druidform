import Phaser from "phaser";
import type { PartyMember, AxieClass, AxiePartClasses, AxieParts, AxieEvolved } from "../config/constants.ts";
import { axieTextureKey, fitPortrait } from "../config/collection.ts";
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
  isHeavyClass,
  pileAffinity,
  type DruidForm,
} from "../config/forms.ts";
import { TAILWIND_MUL } from "../config/parts.ts";

const BODY_W = 36;
const BODY_H = 26;
const PORTRAIT_BOX = { w: 64, h: 48 };
const INSIDE_BOX = { w: 26, h: 20 };
const FORM_SIZE: Record<string, { w: number; h: number }> = {
  bear: { w: 92, h: 78 },
  cat: { w: 96, h: 80 },
  hawk: { w: 118, h: 90 },
};

/** Chest knot. Offsets assume the animal faces left; caller flips X. */
function insideOffsets(count: number): { x: number; y: number }[] {
  if (count <= 1) return [{ x: -6, y: -14 }];
  if (count === 2) return [{ x: -10, y: -14 }, { x: 6, y: -10 }];
  return [{ x: -4, y: -18 }, { x: -12, y: -6 }, { x: 8, y: -6 }];
}
const LABEL_LIFT = 32;

/**
 * Axie — a single party member's world representation.
 *
 * { slot, axieClass, parts, followPark, guests, absorbedBy }
 */
export class Axie {
  public readonly slot: number;
  public readonly id: number;
  public readonly axieClass: AxieClass;
  public readonly parts: AxieParts;
  public readonly partClasses: AxiePartClasses;
  public readonly evolved: AxieEvolved;
  public readonly axeName: string;
  public readonly speed: number;
  public readonly baseColor: number;

  public readonly sprite: Phaser.GameObjects.Ellipse;
  public readonly body: Phaser.Physics.Arcade.Body;
  public readonly portrait: Phaser.GameObjects.Image | null;
  private readonly formBody: Phaser.GameObjects.Image;

  private readonly indicator: Phaser.GameObjects.Arc;
  private readonly shadow: Phaser.GameObjects.Ellipse;
  private readonly formAura: Phaser.GameObjects.Ellipse;
  private readonly slotLabel: Phaser.GameObjects.Text;
  private readonly scene: Phaser.Scene;

  public followPark: "follow" | "park" = "follow";
  public guests: Axie[] = [];
  public absorbedBy: Axie | null = null;
  public fuseUntil = 0;
  public form: DruidForm | null = null;
  public lastFacing = { x: 1, y: 0 };
  public lastSafe = { x: 0, y: 0 };
  public tailwindUntil = 0;
  private lastTailwindGhost = 0;

  constructor(scene: Phaser.Scene, x: number, y: number, config: PartyMember) {
    this.scene = scene;
    this.slot = config.slot;
    this.id = config.id;
    this.axieClass = config.axieClass;
    this.parts = config.parts;
    this.partClasses = config.partClasses;
    this.evolved = config.evolved;
    this.axeName = config.name;
    this.speed = config.speed;
    this.baseColor = config.color;

    this.indicator = scene.add.circle(x, y, 26, 0x000000, 0);
    this.indicator.setStrokeStyle(2, 0xffffff, 0.85);
    this.indicator.setVisible(false);
    this.indicator.setDepth(0.9);

    this.shadow = scene.add.ellipse(x, y + 14, 30, 10, 0x000000, 0.3);
    this.shadow.setDepth(0.92);

    this.formAura = scene.add.ellipse(x, y - 8, 58, 44, 0xffffff, 0);
    this.formAura.setStrokeStyle(3, 0xffffff, 0);
    this.formAura.setVisible(false);
    this.formAura.setDepth(1.3);

    this.sprite = scene.add.ellipse(x, y, BODY_W, BODY_H, config.color);
    this.sprite.setDepth(1);
    scene.physics.add.existing(this.sprite);
    this.body = this.sprite.body as Phaser.Physics.Arcade.Body;
    this.body.setCollideWorldBounds(true);
    this.lastSafe = { x, y };

    const key = axieTextureKey(config.id);
    if (scene.textures.exists(key)) {
      this.portrait = scene.add.image(x, y, key);
      fitPortrait(this.portrait, PORTRAIT_BOX.w, PORTRAIT_BOX.h);
      this.portrait.setOrigin(0.5, 0.72);
      this.portrait.setDepth(1.1);
      this.sprite.setAlpha(0);
    } else {
      this.portrait = null;
    }

    const formKey = scene.textures.exists("form-beast-bear")
      ? "form-beast-bear"
      : "form-shell-bear";
    this.formBody = scene.add.image(x, y, formKey);
    this.formBody.setOrigin(0.5, 0.86);
    this.formBody.setVisible(false);
    this.formBody.setDepth(1.05);

    this.slotLabel = scene.add
      .text(x, y - LABEL_LIFT, `${config.slot}`, {
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
    return pileAffinity(this.pile(), form);
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
    if (!this.isDruidHost()) {
      if (this.scene.time.now < this.tailwindUntil) {
        return Math.floor(base * TAILWIND_MUL);
      }
      return base;
    }
    const sizeMul = this.fusionSize() >= 3 ? DRUID_3_SPEED : DRUID_2_SPEED;
    const flyMul =
      this.form === "hawk"
        ? hawkSpeedMul(pileAffinity(this.pile(), "hawk"))
        : 1;
    let spd = Math.floor(base * sizeMul * flyMul);
    if (this.scene.time.now < this.tailwindUntil) {
      spd = Math.floor(spd * TAILWIND_MUL);
    }
    return spd;
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
    this.sprite.setFillStyle(color, this.portrait ? 0 : 1);
    this.sprite.setSize(triple ? 36 : 32, triple ? 28 : 24);
    this.portrait?.setVisible(true);
    if (this.portrait) fitPortrait(this.portrait, INSIDE_BOX.w, INSIDE_BOX.h);
    for (const guest of this.guests) {
      guest.portrait?.setVisible(true);
      if (guest.portrait) fitPortrait(guest.portrait, INSIDE_BOX.w, INSIDE_BOX.h);
    }
    const beast = this.form ? `form-beast-${this.form}` : "";
    const shell = this.form ? `form-shell-${this.form}` : "";
    const key =
      beast && this.scene.textures.exists(beast)
        ? beast
        : shell && this.scene.textures.exists(shell)
          ? shell
          : "";
    if (key) {
      this.formBody.setTexture(key);
      this.formBody.setVisible(true);
      const size = (this.form && FORM_SIZE[this.form]) || { w: 92, h: 78 };
      const k = triple ? 1.12 : 1;
      this.formBody.setDisplaySize(size.w * k, size.h * k);
      this.formBody.setAlpha(0.9);
      this.formBody.clearTint();
    }
    this.scene.tweens.killTweensOf(this.formAura);
    this.formAura.setVisible(false);
    this.indicator.setVisible(false);
    this.shadow.setScale(triple ? 1.55 : 1.35);
    const tag =
      this.form === "bear" ? "B" : this.form === "cat" ? "C" : "H";
    this.slotLabel.setText(`${tag}${triple ? "3" : "2"}`);
  }

  restoreLook(): void {
    this.sprite.setFillStyle(this.baseColor, this.portrait ? 0 : 1);
    this.sprite.setSize(BODY_W, BODY_H);
    this.formBody.setVisible(false);
    this.portrait?.setVisible(true);
    this.portrait?.clearTint();
    if (this.portrait) {
      fitPortrait(this.portrait, PORTRAIT_BOX.w, PORTRAIT_BOX.h);
    }
    this.scene.tweens.killTweensOf(this.formAura);
    this.formAura.setVisible(false);
    this.formAura.setAlpha(1);
    this.formAura.setScale(1);
    this.shadow.setScale(1);
    this.slotLabel.setText(`${this.slot}`);
    this.fuseUntil = 0;
    this.form = null;
  }

  setHidden(hidden: boolean): void {
    this.sprite.setVisible(!hidden);
    this.shadow.setVisible(!hidden);
    this.formAura.setVisible(false);
    this.formBody.setVisible(!hidden && this.isDruidHost());
    this.slotLabel.setVisible(!hidden);
    this.indicator.setVisible(!hidden && this.indicator.visible);
    this.setBodyEnabled(!hidden);
    if (this.isAbsorbed()) {
      this.portrait?.setVisible(true);
    } else {
      this.portrait?.setVisible(!hidden);
      if (!hidden && this.portrait && !this.isDruidHost()) {
        fitPortrait(this.portrait, PORTRAIT_BOX.w, PORTRAIT_BOX.h);
      }
    }
  }

  setBodyEnabled(enabled: boolean): void {
    this.body.enable = enabled;
    if (!enabled) {
      this.body.setVelocity(0, 0);
    }
  }

  setActive(active: boolean): void {
    this.scene.tweens.killTweensOf(this.indicator);
    const show = active && this.sprite.visible && !this.isDruidHost();
    this.indicator.setVisible(show);

    if (show) {
      this.indicator.setAlpha(0.85);
      this.scene.tweens.add({
        targets: this.indicator,
        alpha: { from: 0.85, to: 0.3 },
        duration: 800,
        yoyo: true,
        repeat: -1,
      });
    }
  }

  syncVisuals(): void {
    if (this.absorbedBy) {
      this.syncInsideHost(this.absorbedBy);
      return;
    }

    const x = this.sprite.x;
    const y = this.sprite.y;
    const moving = this.body.speed > 8;
    const bob = moving ? Math.sin(this.scene.time.now / 85) * 2.2 : 0;
    const flip = this.lastFacing.x > 0;
    const sign = flip ? -1 : 1;
    const depth = 1 + y * 0.01;
    this.indicator.setPosition(x, y);
    this.indicator.setDepth(depth - 0.05);
    this.shadow.setPosition(x, y + (this.isDruidHost() ? 18 : 14));
    this.shadow.setDepth(depth - 0.04);
    this.formAura.setPosition(x, y - 8 + bob);
    this.formAura.setDepth(depth + 0.05);
    this.formBody.setPosition(x, y + bob);
    this.formBody.setFlipX(flip);
    this.formBody.setDepth(depth + 0.06);
    if (this.isDruidHost() && this.portrait) {
      const off = insideOffsets(this.fusionSize())[0] ?? { x: 0, y: -14 };
      this.portrait.setPosition(x + off.x * sign, y + off.y + bob);
      this.portrait.setFlipX(flip);
      this.portrait.setDepth(depth + 0.24);
    } else {
      this.portrait?.setPosition(x, y + bob);
      this.portrait?.setFlipX(flip);
      this.portrait?.setDepth(depth);
    }
    const lift = this.isDruidHost() ? 52 : LABEL_LIFT;
    this.slotLabel.setPosition(x, y - lift + bob);
    this.slotLabel.setDepth(depth + 0.5);
    if (this.scene.time.now >= this.tailwindUntil) return;
    if (this.scene.time.now - this.lastTailwindGhost < 55) return;
    this.lastTailwindGhost = this.scene.time.now;
    if (this.portrait) {
      const ghost = this.scene.add.image(x, y, this.portrait.texture.key);
      ghost.setDisplaySize(
        this.portrait.displayWidth,
        this.portrait.displayHeight,
      );
      ghost.setOrigin(this.portrait.originX, this.portrait.originY);
      ghost.setFlipX(this.portrait.flipX);
      ghost.setTint(0x81d4fa);
      ghost.setAlpha(0.4);
      ghost.setDepth(0.96);
      this.scene.tweens.add({
        targets: ghost,
        alpha: 0,
        duration: 280,
        onComplete: () => ghost.destroy(),
      });
      return;
    }
    const blob = this.scene.add.ellipse(
      x,
      y,
      this.sprite.width,
      this.sprite.height,
      0x81d4fa,
      0.4,
    );
    blob.setDepth(0.9);
    this.scene.tweens.add({
      targets: blob,
      alpha: 0,
      duration: 280,
      onComplete: () => blob.destroy(),
    });
  }

  private syncInsideHost(host: Axie): void {
    const pile = host.pile();
    const i = Math.max(0, pile.indexOf(this));
    const off = insideOffsets(pile.length)[i] ?? { x: 0, y: 0 };
    const moving = host.body.speed > 8;
    const bob = moving ? Math.sin(this.scene.time.now / 85) * 2.2 : 0;
    const flip = host.lastFacing.x > 0;
    const sign = flip ? -1 : 1;
    const x = host.sprite.x + off.x * sign;
    const y = host.sprite.y + off.y + bob;
    const depth = 1 + host.sprite.y * 0.01;
    this.portrait?.setVisible(true);
    this.portrait?.setPosition(x, y);
    this.portrait?.setFlipX(flip);
    this.portrait?.setDepth(depth + 0.24);
  }

  getWeightTier(): number {
    if (this.isAbsorbed()) return 1;
    if (this.canPressPlate()) return 3;
    if (this.hasClass("Beast")) return 2;
    return 1;
  }
}
