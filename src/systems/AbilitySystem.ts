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

export interface AbilityTargets {
  brambles?: Bramble[];
  eyes?: EyeBeacon[];
  crystal?: Crystal;
  cores?: BossCore[];
  anchor?: AnchorCell;
  isWall?: (x: number, y: number) => boolean;
}

/**
 * Space / click fires the **top** Axie's kit (GDD §9, §11).
 * Dart is a LOS hitscan; slash cuts brambles; slam is a melee zone.
 */
export class AbilitySystem {
  constructor(private readonly scene: Phaser.Scene) {}

  tryFire(
    attacker: Axie,
    origin: { x: number; y: number },
    facing: { x: number; y: number },
    targets: AbilityTargets = {},
  ): boolean {
    const spec = this.specFor(attacker.role);
    if (!spec) return false;

    const energy = (this.scene.registry.get("energy") as number) ?? 0;
    if (energy < spec.cost) return false;

    this.scene.registry.set("energy", energy - spec.cost);

    const dir = this.normalize(facing);
    if (attacker.role === "Striker") {
      this.slash(origin, dir, targets.brambles ?? [], targets.cores ?? []);
    } else if (attacker.role === "Tank") {
      this.slam(origin, targets.anchor);
    } else {
      this.dart(origin, dir, attacker.heightTier, targets);
    }
    return true;
  }

  private specFor(role: string): { cost: number } | null {
    if (role === "Striker") return { cost: SLASH_COST };
    if (role === "Tank") return { cost: SLAM_COST };
    if (role === "Scout") return { cost: DART_COST };
    return null;
  }

  private slash(
    origin: { x: number; y: number },
    facing: { x: number; y: number },
    brambles: Bramble[],
    cores: BossCore[],
  ): void {
    const facingAngle = Math.atan2(facing.y, facing.x);
    const halfArc = Phaser.Math.DegToRad(SLASH_ARC_DEG / 2);

    this.drawSlice(origin.x, origin.y, SLASH_REACH, facingAngle, halfArc, 0xff9800);

    for (const bramble of brambles) {
      if (bramble.isCut() || !bramble.sprite.active) continue;
      if (this.inArc(origin, bramble.sprite, facingAngle, halfArc, SLASH_REACH)) {
        bramble.tryCut();
      }
    }
    for (const core of cores) {
      if (!core.isExposed()) continue;
      if (this.inArc(origin, core.sprite, facingAngle, halfArc, SLASH_REACH)) {
        core.tryCut();
      }
    }
  }

  private slam(origin: { x: number; y: number }, anchor?: AnchorCell): void {
    const ring = this.scene.add.circle(origin.x, origin.y, SLAM_RADIUS, 0x4caf50, 0.28);
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
    origin: { x: number; y: number },
    facing: { x: number; y: number },
    heightTier: number,
    targets: AbilityTargets,
  ): void {
    let impactX = origin.x + facing.x * DART_RANGE;
    let impactY = origin.y + facing.y * DART_RANGE;

    for (let d = DART_STEP; d <= DART_RANGE; d += DART_STEP) {
      const x = origin.x + facing.x * d;
      const y = origin.y + facing.y * d;
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
        eye.receiveHit(heightTier);
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
        crystal.receiveHit(heightTier);
        impactX = crystal.sprite.x;
        impactY = crystal.sprite.y;
        break;
      }
    }

    const bolt = this.scene.add.rectangle(origin.x, origin.y, 10, 4, 0x42a5f5);
    bolt.setDepth(6);
    bolt.setRotation(Math.atan2(facing.y, facing.x));
    this.scene.tweens.add({
      targets: bolt,
      x: impactX,
      y: impactY,
      duration: Math.max(80, Math.hypot(impactX - origin.x, impactY - origin.y) * 0.6),
      onComplete: () => bolt.destroy(),
    });
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
