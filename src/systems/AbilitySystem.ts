import Phaser from "phaser";
import type { Axie } from "../entities/Axie.ts";
import type { Bramble } from "../entities/Bramble.ts";
import type { EyeBeacon } from "../entities/EyeBeacon.ts";
import type { Crystal } from "../entities/Crystal.ts";
import type { BossCore } from "../entities/BossCore.ts";
import type { AnchorCell } from "../entities/AnchorCell.ts";
import type { HeavyPlate } from "../entities/HeavyPlate.ts";
import type { CrackedWall } from "../entities/CrackedWall.ts";
import {
  DART_COST,
  DART_RANGE,
  DART_STEP,
  EYE_HIT_RADIUS,
  GROUND_POUND_RADIUS_MUL,
  GROUND_POUND_STUN_MS,
  LONE_WOLF_RANGE_MUL,
  LONE_WOLF_SLASH_COST,
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
  isCatClass,
  isHeavyClass,
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
import { hitStop, kick, sfx, spendAt, floater, hitParticles } from "./Juice.ts";
import { puzzleDamage, type KitKind } from "../config/combat.ts";
import type { Enemy } from "../entities/Enemy.ts";

export interface AbilityTargets {
  brambles?: Bramble[];
  eyes?: EyeBeacon[];
  crystal?: Crystal;
  cores?: BossCore[];
  anchor?: AnchorCell;
  plates?: HeavyPlate[];
  crackedWalls?: CrackedWall[];
  enemies?: Enemy[];
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
    if (energy < kit.cost) {
      sfx.fail();
      return false;
    }

    this.scene.registry.set("energy", energy - kit.cost);
    bumpLedger(this.scene, "kit", kit.cost);
    spendAt(this.scene, origin.x, origin.y, kit.cost);
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
    const loneWolfMul = (this.scene.registry.get("loneWolfActive") as boolean) ? LONE_WOLF_RANGE_MUL : 1;
    const rangeMul = attacker.rangeMul() * partMul * loneWolfMul;

    if (kit.kind === "slash") {
      const cleave = catVerb(pile) === "cleave";
      if (cleave) toastOnce(this.scene, "cleave", verbToast("cleave"));
      this.slash(origin, dir, targets, rangeMul * (cleave ? CLEAVE_REACH_MUL : 1),
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

    if (isCatClass(attacker.axieClass)) {
      const loneWolf = !attacker.isDruidHost() && !attacker.isAbsorbed() &&
        (this.scene.registry.get("hasFusedHost") as boolean);
      if (loneWolf) {
        toastOnce(this.scene, "lone_wolf", "Lone Wolf — free slash while allies fused");
        this.scene.registry.set("loneWolfUsed", true);
        this.scene.registry.set("loneWolfActive", true);
      } else {
        this.scene.registry.set("loneWolfActive", false);
      }
      return priced(loneWolf ? LONE_WOLF_SLASH_COST : SLASH_COST, "slash");
    }
    if (isHeavyClass(attacker.axieClass)) {
      const delta = partCostDelta(attacker);
      return priced(Math.max(1, SLAM_COST + delta), "slam", delta < 0 ? 1 : 0);
    }
    return priced(DART_COST, "dart");
  }

  private slam(
    attacker: Axie,
    origin: { x: number; y: number },
    targets: AbilityTargets,
    rangeMul: number,
  ): void {
    if (attacker.isBear()) {
      return this.groundPound(attacker, origin, targets, rangeMul);
    }

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
    sfx.slam();
    hitStop(this.scene, 50);
    kick(this.scene, 0.007, 80);
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
      // Cracked walls — verb-gated shortcut
      for (const wall of targets.crackedWalls ?? []) {
        wall.tryBreak(verb, origin.x, origin.y, radius);
      }
    } else if (verb === "root_pull") {
      toastOnce(this.scene, "root_pull", verbToast("root_pull"));
      const dest = targets.pullParkedAlly?.(origin);
      if (dest) this.drawVine(origin, dest);
    }

    this.hitRadius(origin, radius, targets, "slam");
    this.fillNearestPit(origin, radius, targets);
  }

  private groundPound(
    attacker: Axie,
    origin: { x: number; y: number },
    targets: AbilityTargets,
    rangeMul: number,
  ): void {
    const radius = SLAM_RADIUS * rangeMul * GROUND_POUND_RADIUS_MUL;

    // Fissure lines (visual only)
    const g = this.scene.add.graphics();
    g.setDepth(5);
    g.lineStyle(2, 0xd7ccc8, 0.8);
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3 + (Math.random() - 0.5);
      const rOuter = radius * (0.6 + Math.random() * 0.4);
      g.moveTo(origin.x, origin.y);
      g.lineTo(origin.x + Math.cos(angle) * rOuter, origin.y + Math.sin(angle) * rOuter);
    }
    
    // Darker green ring
    const ring = this.scene.add.circle(origin.x, origin.y, radius, 0x1b5e20, 0.5);
    ring.setDepth(6);
    this.scene.tweens.add({
      targets: ring,
      alpha: 0,
      scale: 1.2,
      duration: 300,
      onComplete: () => {
        ring.destroy();
        g.destroy();
      },
    });

    this.scene.cameras.main.shake(120, 0.008);
    sfx.slam();
    hitStop(this.scene, 70);
    kick(this.scene, 0.01, 100);

    // Stun all brambles
    let stunned = false;
    for (const bramble of targets.brambles ?? []) {
      const dist = Math.hypot(
        origin.x - bramble.sprite.x,
        origin.y - bramble.sprite.y,
      );
      if (dist <= radius && !bramble.isCut()) {
        bramble.stun(GROUND_POUND_STUN_MS);
        stunned = true;
      }
    }
    
    if (stunned) {
      toastOnce(this.scene, "ground_pound", "Ground Pound — stuns and shatters");
      this.scene.registry.set("verbRoute_groundPound", true);
    }

    targets.anchor?.trySlamLock(origin);

    // The bear verb still applies (Thorn Hold / Root Pull)
    const verb = bearVerb(attacker.pile());
    if (verb === "thorn_hold") {
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
      for (const wall of targets.crackedWalls ?? []) {
        wall.tryBreak(verb, origin.x, origin.y, radius);
      }
    } else if (verb === "root_pull") {
      const dest = targets.pullParkedAlly?.(origin);
      if (dest) this.drawVine(origin, dest);
    }

    // Still damage eyes/cores normally
    this.hitRadius(origin, radius, targets, "slam");
    this.fillNearestPit(origin, radius, targets);
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
    targets: AbilityTargets,
    rangeMul: number,
    arcDeg: number,
    color: number,
  ): void {
    const facingAngle = Math.atan2(facing.y, facing.x);
    const halfArc = Phaser.Math.DegToRad(arcDeg / 2);
    const reach = SLASH_REACH * rangeMul;

    this.drawSlice(origin.x, origin.y, reach, facingAngle, halfArc, color);
    sfx.slash();
    hitStop(this.scene, 32);
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

    const inArc = (sprite: { x: number; y: number }) =>
      this.inArc(origin, sprite, facingAngle, halfArc, reach);

    const slashDmg = puzzleDamage("slash", "slash");
    const dartDmg = puzzleDamage("slash", "dart");

    for (const bramble of targets.brambles ?? []) {
      if (bramble.isCut() || !bramble.sprite.active) continue;
      if (!inArc(bramble.sprite)) continue;
      const dead = bramble.takeDamage(slashDmg);
      this.strike(bramble.sprite.x, bramble.sprite.y, slashDmg, dead);
    }
    for (const core of targets.cores ?? []) {
      if (!core.isExposed()) continue;
      if (!inArc(core.sprite)) continue;
      const dead = core.takeDamage(slashDmg);
      this.strike(core.sprite.x, core.sprite.y, slashDmg, dead);
    }
    for (const enemy of targets.enemies ?? []) {
      if (!enemy.body.enable) continue;
      if (!inArc(enemy.sprite)) continue;
      enemy.takeDamage(slashDmg);
      this.strike(enemy.sprite.x, enemy.sprite.y, slashDmg, true);
    }
    for (const eye of targets.eyes ?? []) {
      if (eye.isSolved()) continue;
      if (!inArc(eye.sprite)) continue;
      eye.receiveHit(dartDmg);
      this.strike(eye.sprite.x, eye.sprite.y, dartDmg, eye.isSolved());
    }
    const crystal = targets.crystal;
    if (crystal && !crystal.isSolved() && inArc(crystal.sprite)) {
      crystal.receiveHit(dartDmg);
      this.strike(crystal.sprite.x, crystal.sprite.y, dartDmg, crystal.isSolved());
    }
  }

  private dart(
    _attacker: Axie,
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
    let filledOnce = false;
    const dartKind: KitKind = seed ? "seed" : "dart";
    const dartDmg = puzzleDamage(dartKind, "dart");
    const slashDmg = puzzleDamage(dartKind, "slash");

    for (let d = DART_STEP; d <= range; d += DART_STEP) {
      const x = origin.x + facing.x * d;
      const y = origin.y + facing.y * d;
      if (targets.isPit?.(x, y)) {
        if (seed || !filledOnce) {
          targets.fillPitAt?.(x, y);
          if (!seed) filledOnce = true;
        }
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
        eye.receiveHit(dartDmg);
        impactX = eye.sprite.x;
        impactY = eye.sprite.y;
        hitEye = true;
        this.strike(eye.sprite.x, eye.sprite.y, dartDmg, eye.isSolved());
        hitStop(this.scene, 40);
        break;
      }
      if (hitEye) break;
      const crystal = targets.crystal;
      if (
        crystal &&
        !crystal.isSolved() &&
        Math.hypot(x - crystal.sprite.x, y - crystal.sprite.y) <= EYE_HIT_RADIUS
      ) {
        crystal.receiveHit(dartDmg);
        impactX = crystal.sprite.x;
        impactY = crystal.sprite.y;
        this.strike(crystal.sprite.x, crystal.sprite.y, dartDmg, crystal.isSolved());
        hitStop(this.scene, 40);
        break;
      }
      let hitBramble = false;
      for (const bramble of targets.brambles ?? []) {
        if (bramble.isCut() || !bramble.sprite.active) continue;
        if (Math.hypot(x - bramble.sprite.x, y - bramble.sprite.y) > EYE_HIT_RADIUS) {
          continue;
        }
        const dead = bramble.takeDamage(slashDmg);
        this.strike(bramble.sprite.x, bramble.sprite.y, slashDmg, dead);
        impactX = bramble.sprite.x;
        impactY = bramble.sprite.y;
        hitBramble = true;
        break;
      }
      if (hitBramble) break;
      let hitCore = false;
      for (const core of targets.cores ?? []) {
        if (!core.isExposed()) continue;
        if (Math.hypot(x - core.sprite.x, y - core.sprite.y) > EYE_HIT_RADIUS) {
          continue;
        }
        const dead = core.takeDamage(slashDmg);
        this.strike(core.sprite.x, core.sprite.y, slashDmg, dead);
        impactX = core.sprite.x;
        impactY = core.sprite.y;
        hitCore = true;
        hitStop(this.scene, 40);
        break;
      }
      if (hitCore) break;
      let hitEnemy = false;
      for (const enemy of targets.enemies ?? []) {
        if (!enemy.body.enable) continue;
        if (Math.hypot(x - enemy.sprite.x, y - enemy.sprite.y) > EYE_HIT_RADIUS) {
          continue;
        }
        enemy.takeDamage(slashDmg);
        this.strike(enemy.sprite.x, enemy.sprite.y, slashDmg, true);
        impactX = enemy.sprite.x;
        impactY = enemy.sprite.y;
        hitEnemy = true;
        hitStop(this.scene, 40);
        break;
      }
      if (hitEnemy) break;
    }

    const color = seed ? 0xb39ddb : pierceSkips > 0 ? 0xfff59d : 0x42a5f5;
    sfx.dart();
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

  private noteChip(): void {
    toastOnce(
      this.scene,
      "chip",
      "Chipped — matching job (slash / dart) one-shots.",
    );
  }

  private strike(
    x: number,
    y: number,
    amount: number,
    destroyed: boolean,
  ): void {
    hitParticles(this.scene, x, y, destroyed ? 0xffd54f : 0xffffff);
    floater(this.scene, x, y - 8, `-${amount}`, destroyed ? "#ffd54f" : "#eceff1");
    if (destroyed) sfx.clear();
    else {
      sfx.chip();
      this.noteChip();
    }
  }

  private hitRadius(
    origin: { x: number; y: number },
    radius: number,
    targets: AbilityTargets,
    kind: KitKind,
  ): void {
    const slashDmg = puzzleDamage(kind, "slash");
    const dartDmg = puzzleDamage(kind, "dart");
    const near = (sprite: { x: number; y: number }) =>
      Math.hypot(origin.x - sprite.x, origin.y - sprite.y) <= radius;
    for (const bramble of targets.brambles ?? []) {
      if (bramble.isCut() || !bramble.sprite.active) continue;
      if (!near(bramble.sprite)) continue;
      const dead = bramble.takeDamage(slashDmg);
      this.strike(bramble.sprite.x, bramble.sprite.y, slashDmg, dead);
    }
    for (const core of targets.cores ?? []) {
      if (!core.isExposed() || !near(core.sprite)) continue;
      const dead = core.takeDamage(slashDmg);
      this.strike(core.sprite.x, core.sprite.y, slashDmg, dead);
    }
    for (const enemy of targets.enemies ?? []) {
      if (!enemy.body.enable || !near(enemy.sprite)) continue;
      enemy.takeDamage(slashDmg);
      this.strike(enemy.sprite.x, enemy.sprite.y, slashDmg, true);
    }
    for (const eye of targets.eyes ?? []) {
      if (eye.isSolved() || !near(eye.sprite)) continue;
      eye.receiveHit(dartDmg);
      this.strike(eye.sprite.x, eye.sprite.y, dartDmg, eye.isSolved());
    }
    const crystal = targets.crystal;
    if (crystal && !crystal.isSolved() && near(crystal.sprite)) {
      crystal.receiveHit(dartDmg);
      this.strike(crystal.sprite.x, crystal.sprite.y, dartDmg, crystal.isSolved());
    }
  }

  private fillNearestPit(
    origin: { x: number; y: number },
    radius: number,
    targets: AbilityTargets,
  ): void {
    if (!targets.isPit || !targets.fillPitAt) return;
    let best: { x: number; y: number } | null = null;
    let bestD = radius;
    for (let dx = -radius; dx <= radius; dx += 8) {
      for (let dy = -radius; dy <= radius; dy += 8) {
        const x = origin.x + dx;
        const y = origin.y + dy;
        const d = Math.hypot(dx, dy);
        if (d > radius || d >= bestD) continue;
        if (!targets.isPit(x, y)) continue;
        bestD = d;
        best = { x, y };
      }
    }
    if (best) targets.fillPitAt(best.x, best.y);
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
