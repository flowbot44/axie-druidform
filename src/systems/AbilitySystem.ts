import Phaser from "phaser";
import type { Axie } from "../entities/Axie.ts";
import type { Bramble } from "../entities/Bramble.ts";
import type { EyeBeacon } from "../entities/EyeBeacon.ts";
import type { Crystal } from "../entities/Crystal.ts";
import type { BossCore } from "../entities/BossCore.ts";
import type { AnchorCell } from "../entities/AnchorCell.ts";
import type { HeavyPlate } from "../entities/HeavyPlate.ts";
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
import { bumpLedger } from "../config/energy.ts";
import {
  catSlashCost,
  hawkDartCost,
  pileAffinity,
} from "../config/forms.ts";
import {
  CLEAVE_ARC_DEG,
  CLEAVE_REACH_MUL,
  SPLIT_SPREAD_DEG,
  TAILWIND_MS,
  THORN_HOLD_MS,
  bearVerb,
  catVerb,
  hawkVerb,
  pileHasCloverEvo,
  pileHasWingHornEvo,
  toastOnce,
  verbToast,
} from "../config/parts.ts";

export interface AbilityTargets {
  brambles?: Bramble[];
  eyes?: EyeBeacon[];
  crystal?: Crystal;
  cores?: BossCore[];
  anchor?: AnchorCell;
  plates?: HeavyPlate[];
  dartBlockers?: { x: number; y: number; radius: number }[];
  isWall?: (x: number, y: number) => boolean;
  isPit?: (x: number, y: number) => boolean;
  fillPitAt?: (x: number, y: number) => void;
  pullParkedAlly?: (
    origin: { x: number; y: number },
  ) => { x: number; y: number } | null;
}

/**
 * Space / click fires the active body's kit (GDD §9, §11).
 * Named parts change how the kit behaves. Rooms still ask for the same jobs.
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
    bumpLedger(this.scene, "kit", kit.cost);
    if (kit.cactusSaved > 0) bumpLedger(this.scene, "cactusSaved", kit.cactusSaved);
    if (kit.clover) {
      bumpLedger(this.scene, "cloverSaved", 1);
      const room = (this.scene.registry.get("roomIndex") as number) ?? 1;
      this.scene.registry.set("cloverKitRoom", room);
      toastOnce(this.scene, "clover_evo", "Clover evo — first kit −1e");
    }

    const dir = this.normalize(facing);
    const pile = attacker.pile();
    const partMul = Math.max(...pile.map((a) => partRangeMul(a)));
    const rangeMul = attacker.rangeMul() * partMul;

    if (kit.kind === "slash") {
      const cleave = catVerb(pile) === "cleave";
      if (cleave) toastOnce(this.scene, "cleave", verbToast("cleave"));
      this.slash(
        origin,
        dir,
        targets.brambles ?? [],
        targets.cores ?? [],
        rangeMul * (cleave ? CLEAVE_REACH_MUL : 1),
        cleave ? CLEAVE_ARC_DEG : SLASH_ARC_DEG,
        cleave ? 0xffd54f : 0xff9800,
      );
    } else if (kit.kind === "slam") {
      this.slam(attacker, origin, targets, rangeMul);
    } else {
      this.fireDart(attacker, origin, dir, targets, kit.kind === "seed", rangeMul);
    }
    return true;
  }

  private kitFor(
    attacker: Axie,
  ): {
    cost: number;
    kind: "slash" | "slam" | "dart" | "seed";
    clover: boolean;
    cactusSaved: number;
  } | null {
    const pile = attacker.pile();
    const room = (this.scene.registry.get("roomIndex") as number) ?? 1;
    const cloverReady =
      pileHasCloverEvo(pile) &&
      (this.scene.registry.get("cloverKitRoom") as number | undefined) !== room;
    const discount = cloverReady ? 1 : 0;

    const priced = (
      cost: number,
      kind: "slash" | "slam" | "dart" | "seed",
      cactusSaved = 0,
    ): {
      cost: number;
      kind: "slash" | "slam" | "dart" | "seed";
      clover: boolean;
      cactusSaved: number;
    } => ({
      cost: Math.max(0, cost - discount),
      kind,
      clover: cloverReady,
      cactusSaved,
    });

    if (attacker.isBear()) {
      const cactus = Math.min(...pile.map((a) => partCostDelta(a)), 0);
      return priced(Math.max(1, SLAM_COST + cactus), "slam", cactus < 0 ? 1 : 0);
    }
    if (attacker.isCat()) {
      return priced(catSlashCost(pileAffinity(pile, "cat")), "slash");
    }
    if (attacker.isHawk()) {
      return priced(hawkDartCost(pileAffinity(pile, "hawk")), "seed");
    }
    if (attacker.isDruidHost()) return null;

    if (attacker.axieClass === "Beast") {
      return priced(SLASH_COST, "slash");
    }
    if (attacker.axieClass === "Plant") {
      const delta = partCostDelta(attacker);
      return priced(Math.max(1, SLAM_COST + delta), "slam", delta < 0 ? 1 : 0);
    }
    if (attacker.axieClass === "Bird") {
      return priced(DART_COST, "dart");
    }
    return null;
  }

  private slam(
    attacker: Axie,
    origin: { x: number; y: number },
    targets: AbilityTargets,
    rangeMul: number,
  ): void {
    const radius = SLAM_RADIUS * rangeMul;
    const verb = bearVerb(attacker.pile());
    const color = verb === "thorn_hold" ? 0x2e7d32 : 0x4caf50;
    const ring = this.scene.add.circle(origin.x, origin.y, radius, color, 0.4);
    ring.setDepth(6);
    this.scene.tweens.add({
      targets: ring,
      alpha: 0,
      scale: verb === "thorn_hold" ? 1.45 : 1.2,
      duration: 240,
      onComplete: () => ring.destroy(),
    });
    this.scene.cameras.main.shake(70, 0.004);
    targets.anchor?.trySlamLock(origin);

    if (verb === "thorn_hold") {
      toastOnce(this.scene, "thorn_hold", verbToast("thorn_hold"));
      for (const plate of targets.plates ?? []) {
        const dist = Math.hypot(
          origin.x - plate.sprite.x,
          origin.y - plate.sprite.y,
        );
        if (dist <= radius) plate.addThornHold(THORN_HOLD_MS);
      }
      const anchor = targets.anchor;
      if (anchor) {
        const dist = Math.hypot(
          origin.x - anchor.sprite.x,
          origin.y - anchor.sprite.y,
        );
        if (dist <= radius) anchor.addThornHold(THORN_HOLD_MS);
      }
    } else if (verb === "root_pull") {
      toastOnce(this.scene, "root_pull", verbToast("root_pull"));
      const dest = targets.pullParkedAlly?.(origin);
      if (dest) this.drawVine(origin, dest);
    }
  }

  private fireDart(
    attacker: Axie,
    origin: { x: number; y: number },
    facing: { x: number; y: number },
    targets: AbilityTargets,
    seed: boolean,
    rangeMul: number,
  ): void {
    const verb = hawkVerb(attacker.pile());
    if (verb) toastOnce(this.scene, verb, verbToast(verb));
    else if (pileHasWingHornEvo(attacker.pile())) {
      toastOnce(this.scene, "wing_horn_evo", "Wing Horn evo — longer dart");
    }

    if (verb === "tailwind") {
      attacker.tailwindUntil = this.scene.time.now + TAILWIND_MS;
      this.windBurst(origin);
    }

    const pierceSkips = verb === "pierce" ? 1 : 0;
    if (verb === "split") {
      this.splitFlash(origin, facing);
      this.dart(
        attacker,
        origin,
        this.rotate(facing, -SPLIT_SPREAD_DEG),
        targets,
        seed,
        rangeMul,
        0,
      );
      this.dart(
        attacker,
        origin,
        this.rotate(facing, SPLIT_SPREAD_DEG),
        targets,
        seed,
        rangeMul,
        0,
      );
      return;
    }
    this.dart(attacker, origin, facing, targets, seed, rangeMul, pierceSkips);
  }

  private slash(
    origin: { x: number; y: number },
    facing: { x: number; y: number },
    brambles: Bramble[],
    cores: BossCore[],
    rangeMul: number,
    arcDeg: number,
    color: number,
  ): void {
    const facingAngle = Math.atan2(facing.y, facing.x);
    const halfArc = Phaser.Math.DegToRad(arcDeg / 2);
    const reach = SLASH_REACH * rangeMul;

    this.drawSlice(origin.x, origin.y, reach, facingAngle, halfArc, color);
    if (arcDeg >= CLEAVE_ARC_DEG) {
      this.drawSlice(
        origin.x,
        origin.y,
        reach * 0.72,
        facingAngle,
        halfArc * 0.85,
        0xfff59d,
      );
      this.scene.cameras.main.shake(50, 0.003);
    }

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

  private dart(
    attacker: Axie,
    origin: { x: number; y: number },
    facing: { x: number; y: number },
    targets: AbilityTargets,
    seed: boolean,
    rangeMul: number,
    pierceSkips: number,
  ): void {
    const range = DART_RANGE * rangeMul;
    let impactX = origin.x + facing.x * range;
    let impactY = origin.y + facing.y * range;
    let skips = pierceSkips;
    let insideSkip = false;

    for (let d = DART_STEP; d <= range; d += DART_STEP) {
      const x = origin.x + facing.x * d;
      const y = origin.y + facing.y * d;
      if (seed && targets.isPit?.(x, y)) {
        targets.fillPitAt?.(x, y);
      }

      const blocked = this.isDartBlocked(x, y, targets);
      if (blocked) {
        if (insideSkip) continue;
        if (skips > 0) {
          skips -= 1;
          insideSkip = true;
          this.pierceSpark(x, y);
          continue;
        }
        impactX = x;
        impactY = y;
        break;
      }
      insideSkip = false;

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

    const color = seed ? 0xb39ddb : pierceSkips > 0 ? 0xfff59d : 0x42a5f5;
    const bolt = this.scene.add.rectangle(
      origin.x,
      origin.y,
      pierceSkips > 0 ? 16 : 10,
      pierceSkips > 0 ? 6 : 4,
      color,
    );
    bolt.setDepth(6);
    bolt.setRotation(Math.atan2(facing.y, facing.x));
    this.scene.tweens.add({
      targets: bolt,
      x: impactX,
      y: impactY,
      duration: Math.max(
        80,
        Math.hypot(impactX - origin.x, impactY - origin.y) * 0.6,
      ),
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

  private isDartBlocked(
    x: number,
    y: number,
    targets: AbilityTargets,
  ): boolean {
    if (targets.isWall?.(x, y)) return true;
    for (const b of targets.dartBlockers ?? []) {
      if (Math.hypot(x - b.x, y - b.y) <= b.radius) return true;
    }
    return false;
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
    gfx.fillStyle(color, 0.5);
    gfx.slice(x, y, radius, facingAngle - halfArc, facingAngle + halfArc, false);
    gfx.fillPath();
    this.scene.tweens.add({
      targets: gfx,
      alpha: 0,
      duration: 240,
      onComplete: () => gfx.destroy(),
    });
  }

  private pierceSpark(x: number, y: number): void {
    const spark = this.scene.add.circle(x, y, 10, 0xfffde7, 0.95);
    spark.setDepth(7);
    this.scene.tweens.add({
      targets: spark,
      alpha: 0,
      scale: 2.4,
      duration: 220,
      onComplete: () => spark.destroy(),
    });
  }

  private splitFlash(
    origin: { x: number; y: number },
    facing: { x: number; y: number },
  ): void {
    const flash = this.scene.add.circle(origin.x, origin.y, 8, 0x81d4fa, 0.7);
    flash.setDepth(6);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 2,
      duration: 180,
      onComplete: () => flash.destroy(),
    });
    const left = this.rotate(facing, -SPLIT_SPREAD_DEG);
    const right = this.rotate(facing, SPLIT_SPREAD_DEG);
    for (const dir of [left, right]) {
      const tick = this.scene.add.rectangle(
        origin.x + dir.x * 18,
        origin.y + dir.y * 18,
        16,
        3,
        0x81d4fa,
        0.8,
      );
      tick.setRotation(Math.atan2(dir.y, dir.x));
      tick.setDepth(6);
      this.scene.tweens.add({
        targets: tick,
        alpha: 0,
        duration: 200,
        onComplete: () => tick.destroy(),
      });
    }
  }

  private windBurst(origin: { x: number; y: number }): void {
    const ring = this.scene.add.circle(origin.x, origin.y, 16, 0x81d4fa, 0.0);
    ring.setStrokeStyle(3, 0xb3e5fc, 0.95);
    ring.setDepth(6);
    this.scene.tweens.add({
      targets: ring,
      scale: 2.2,
      alpha: 0,
      duration: 320,
      onComplete: () => ring.destroy(),
    });
  }

  private drawVine(
    from: { x: number; y: number },
    to: { x: number; y: number },
  ): void {
    const gfx = this.scene.add.graphics();
    gfx.setDepth(6);
    gfx.lineStyle(3, 0x66bb6a, 0.9);
    gfx.lineBetween(from.x, from.y, to.x, to.y);
    this.scene.tweens.add({
      targets: gfx,
      alpha: 0,
      duration: 280,
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

  private rotate(
    v: { x: number; y: number },
    deg: number,
  ): { x: number; y: number } {
    const r = Phaser.Math.DegToRad(deg);
    return {
      x: v.x * Math.cos(r) - v.y * Math.sin(r),
      y: v.x * Math.sin(r) + v.y * Math.cos(r),
    };
  }
}
