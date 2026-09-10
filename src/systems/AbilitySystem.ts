import Phaser from "phaser";
import type { Axie } from "../entities/Axie.ts";
import type { Bramble } from "../entities/Bramble.ts";
import type { EyeBeacon } from "../entities/EyeBeacon.ts";
import type { Crystal } from "../entities/Crystal.ts";
import type { BossCore } from "../entities/BossCore.ts";
import type { AnchorCell } from "../entities/AnchorCell.ts";
import {
  DART_COST,
  DART_RANGE,
  DART_STEP,
  EYE_HIT_RADIUS,
  SLAM_COST,
  SLAM_RADIUS,
  SLASH_ARC_DEG,
  SLASH_COST,
  SLASH_REACH,
} from "../config/constants.ts";
import { partCostDelta, partRangeMul } from "../config/collection.ts";
import {
  catSlashCost,
  hawkDartCost,
  isCatClass,
  isFlyerClass,
} from "../config/forms.ts";

export interface AbilityTargets {
  brambles?: Bramble[];
  eyes?: EyeBeacon[];
  crystal?: Crystal;
  cores?: BossCore[];
  anchor?: AnchorCell;
  isWall?: (x: number, y: number) => boolean;
  isPit?: (x: number, y: number) => boolean;
  fillPitAt?: (x: number, y: number) => void;
}

/**
 * Space / click fires the active body's kit (GDD §9, §11).
 * Dawn Seed Dart is a Bird dart that also vines pit tiles.
 */
export class AbilitySystem {
  constructor(private readonly scene: Phaser.Scene) {}

  tryFire(
    attacker: Axie,
    origin: { x: number; y: number },
    facing: { x: number; y: number },
    targets: AbilityTargets = {},
  ): boolean {
    const kit = this.kitFor(attacker);
    if (!kit) return false;

    const energy = (this.scene.registry.get("energy") as number) ?? 0;
    if (energy < kit.cost) return false;

    this.scene.registry.set("energy", energy - kit.cost);

    const dir = this.normalize(facing);
    const partMul = Math.max(...attacker.pile().map((a) => partRangeMul(a)));
    const rangeMul = attacker.rangeMul() * partMul;
    if (kit.kind === "slash") {
      this.slash(origin, dir, targets.brambles ?? [], targets.cores ?? [], rangeMul);
    } else if (kit.kind === "slam") {
      this.slam(origin, targets.anchor, rangeMul);
    } else {
      this.dart(attacker, origin, dir, targets, kit.kind === "seed", rangeMul);
    }
    return true;
  }

  private kitFor(
    attacker: Axie,
  ): { cost: number; kind: "slash" | "slam" | "dart" | "seed" } | null {
    if (attacker.isBear()) {
      const cactus = Math.min(...attacker.pile().map((a) => partCostDelta(a)), 0);
      return {
        cost: Math.max(1, SLAM_COST + cactus),
        kind: "slam",
      };
    }
    if (attacker.isCat()) {
      return {
        cost: catSlashCost(attacker.lineageCount(isCatClass)),
        kind: "slash",
      };
    }
    if (attacker.isHawk()) {
      return {
        cost: hawkDartCost(attacker.lineageCount(isFlyerClass) > 0),
        kind: "seed",
      };
    }
    if (attacker.isDruidHost()) return null;

    if (attacker.axieClass === "Beast") {
      return { cost: SLASH_COST, kind: "slash" };
    }
    if (attacker.axieClass === "Plant") {
      return {
        cost: Math.max(1, SLAM_COST + partCostDelta(attacker)),
        kind: "slam",
      };
    }
    if (attacker.axieClass === "Bird") {
      return { cost: DART_COST, kind: "dart" };
    }
    return null;
  }

  private slash(
    origin: { x: number; y: number },
    facing: { x: number; y: number },
    brambles: Bramble[],
    cores: BossCore[],
    rangeMul: number,
  ): void {
    const facingAngle = Math.atan2(facing.y, facing.x);
    const halfArc = Phaser.Math.DegToRad(SLASH_ARC_DEG / 2);
    const reach = SLASH_REACH * rangeMul;

    this.drawSlice(origin.x, origin.y, reach, facingAngle, halfArc, 0xff9800);

    for (const bramble of brambles) {
      if (bramble.isCut() || !bramble.sprite.active) continue;
      if (this.inArc(origin, bramble.sprite, facingAngle, halfArc, reach)) {
        bramble.tryCut();
      }
    }
    for (const core of cores) {
      if (!core.isExposed()) continue;
      if (this.inArc(origin, core.sprite, facingAngle, halfArc, reach)) {
        core.tryCut();
      }
    }
  }

  private slam(
    origin: { x: number; y: number },
    anchor: AnchorCell | undefined,
    rangeMul: number,
  ): void {
    const radius = SLAM_RADIUS * rangeMul;
    const ring = this.scene.add.circle(origin.x, origin.y, radius, 0x4caf50, 0.28);
    ring.setDepth(6);
    this.scene.tweens.add({
      targets: ring,
      alpha: 0,
      scale: 1.15,
      duration: 180,
      onComplete: () => ring.destroy(),
    });
    anchor?.trySlamLock(origin);
  }

  private dart(
    attacker: Axie,
    origin: { x: number; y: number },
    facing: { x: number; y: number },
    targets: AbilityTargets,
    seed: boolean,
    rangeMul: number,
  ): void {
    const range = DART_RANGE * rangeMul;
    let impactX = origin.x + facing.x * range;
    let impactY = origin.y + facing.y * range;

    for (let d = DART_STEP; d <= range; d += DART_STEP) {
      const x = origin.x + facing.x * d;
      const y = origin.y + facing.y * d;
      if (seed && targets.isPit?.(x, y)) {
        targets.fillPitAt?.(x, y);
      }
      if (targets.isWall?.(x, y)) {
        impactX = x;
        impactY = y;
        break;
      }
      const eyes = targets.eyes ?? [];
      let hitEye = false;
      for (const eye of eyes) {
        if (eye.isSolved()) continue;
        if (Math.hypot(x - eye.sprite.x, y - eye.sprite.y) > EYE_HIT_RADIUS) {
          continue;
        }
        eye.receiveHit(attacker);
        impactX = eye.sprite.x;
        impactY = eye.sprite.y;
        hitEye = true;
        break;
      }
      if (hitEye) break;
      const crystal = targets.crystal;
      if (
        crystal &&
        !crystal.isSolved() &&
        Math.hypot(x - crystal.sprite.x, y - crystal.sprite.y) <= EYE_HIT_RADIUS
      ) {
        crystal.receiveHit(attacker);
        impactX = crystal.sprite.x;
        impactY = crystal.sprite.y;
        break;
      }
    }

    const color = seed ? 0xb39ddb : 0x42a5f5;
    const bolt = this.scene.add.rectangle(origin.x, origin.y, 10, 4, color);
    bolt.setDepth(6);
    bolt.setRotation(Math.atan2(facing.y, facing.x));
    this.scene.tweens.add({
      targets: bolt,
      x: impactX,
      y: impactY,
      duration: Math.max(80, Math.hypot(impactX - origin.x, impactY - origin.y) * 0.6),
      onComplete: () => bolt.destroy(),
    });

    if (seed) {
      const sprout = this.scene.add.circle(impactX, impactY, 6, 0x81c784, 0.5);
      sprout.setDepth(5);
      this.scene.tweens.add({
        targets: sprout,
        alpha: 0,
        scale: 2,
        duration: 280,
        onComplete: () => sprout.destroy(),
      });
    }
  }

  private drawSlice(
    x: number,
    y: number,
    radius: number,
    facingAngle: number,
    halfArc: number,
    color: number,
  ): void {
    const gfx = this.scene.add.graphics();
    gfx.setDepth(6);
    gfx.fillStyle(color, 0.35);
    gfx.slice(x, y, radius, facingAngle - halfArc, facingAngle + halfArc, false);
    gfx.fillPath();
    this.scene.tweens.add({
      targets: gfx,
      alpha: 0,
      duration: 160,
      onComplete: () => gfx.destroy(),
    });
  }

  private inArc(
    origin: { x: number; y: number },
    sprite: { x: number; y: number },
    facingAngle: number,
    halfArc: number,
    reach: number,
  ): boolean {
    const dx = sprite.x - origin.x;
    const dy = sprite.y - origin.y;
    const dist = Math.hypot(dx, dy);
    if (dist > reach) return false;
    const delta = Phaser.Math.Angle.Wrap(Math.atan2(dy, dx) - facingAngle);
    return Math.abs(delta) <= halfArc;
  }

  private normalize(v: { x: number; y: number }): { x: number; y: number } {
    const len = Math.hypot(v.x, v.y);
    if (len < 0.001) return { x: 1, y: 0 };
    return { x: v.x / len, y: v.y / len };
  }
}
