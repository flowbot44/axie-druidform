import Phaser from "phaser";
import { Axie } from "../entities/Axie.ts";
import {
  TILE_SIZE,
  ROOM_HEIGHT,
  FOLLOW_DISTANCE,
  FOLLOW_STOP_THRESHOLD,
  BREADCRUMB_INTERVAL,
  FUSE_COST,
  SPLIT_POP,
  DRUID_2_MS,
  DRUID_3_MS,
  DRUID_SYNERGY_MS,
  PIT_FALL_COST,
  ROOM_PX_W,
  roomIndexAt,
  type PartyMember,
} from "../config/constants.ts";
import { partFuseBonusMs } from "../config/collection.ts";
import { bumpLedger } from "../config/energy.ts";
import { formForSize, formLabel } from "../config/forms.ts";
import { floater, hitStop, sfx, spendAt, fuseParticles } from "./Juice.ts";
import {
  HERBIVORE_CAP_PER_ROOM,
  HERBIVORE_PERIOD_MS,
  ROOT_PULL_TILES,
  pileHasHerbivore,
  toastOnce,
  verbForBody,
  verbLabel,
} from "../config/parts.ts";

interface Breadcrumb {
  x: number;
  y: number;
}

const SPAWN_OFFSETS = [
  { x: 0, y: 0 },
  { x: -54, y: 38 },
  { x: -54, y: -38 },
] as const;

/**
 * PartyManager — owns all three Axies and drives party state.
 *
 * Slot select, follow/park, breadcrumb follow, any-2/3 Druidform fuse (GDD §8, §11).
 */
export class PartyManager {
  private readonly scene: Phaser.Scene;
  private readonly axies: Axie[] = [];
  private activeSlot = 1;
  private trail: Breadcrumb[] = [];
  private lastTrailPos: Breadcrumb | null = null;
  private groupFollowPark: "follow" | "park" = "follow";
  private isHazard: ((x: number, y: number) => boolean) | null = null;
  private isBlocked: ((x: number, y: number) => boolean) | null = null;
  private pitCooldownFrames = 0;
  private herbivoreNextAt = 0;
  private herbivoreGained = 0;
  private herbivoreRoom = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.spawnParty();
    this.updateActiveVisuals();
    this.syncRegistry();
  }

  getActive(): Axie {
    const raw = this.axies.find((a) => a.slot === this.activeSlot);
    if (!raw) throw new Error(`No Axie in slot ${this.activeSlot}`);
    return raw.absorbedBy ?? raw;
  }

  getAxies(): Axie[] {
    return this.axies;
  }

  getSprites(): Phaser.GameObjects.Ellipse[] {
    return this.axies.map((a) => a.sprite);
  }

  selectSlot(slot: number): void {
    if (slot < 1 || slot > 3) return;
    const target = this.axies.find((a) => a.slot === slot);
    if (!target) return;
    const resolved = target.absorbedBy ?? target;
    if (resolved.slot === this.activeSlot && !target.isAbsorbed()) return;

    const previous = this.getActive();
    // Leave a Druidform body where it stands (Room 3: park Bear, take the free Axie).
    if (previous.isDruidHost() && previous !== resolved) {
      previous.followPark = "park";
    } else {
      previous.followPark = this.groupFollowPark;
    }
    this.activeSlot = resolved.slot;
    this.trail = [];
    this.lastTrailPos = null;
    this.updateActiveVisuals();
    this.syncRegistry();
  }

  cycleSlot(): void {
    for (let i = 1; i <= 3; i++) {
      const next = ((this.activeSlot - 1 + i) % 3) + 1;
      const axie = this.axies.find((a) => a.slot === next);
      if (axie && !axie.isAbsorbed()) {
        this.selectSlot(next);
        return;
      }
    }
  }

  setHazardQuery(fn: (x: number, y: number) => boolean): void {
    this.isHazard = fn;
  }

  setBlockedQuery(fn: (x: number, y: number) => boolean): void {
    this.isBlocked = fn;
  }

  pullNearestParked(
    origin: { x: number; y: number },
  ): { x: number; y: number } | null {
    const attacker = this.getActive();
    let best: Axie | null = null;
    let bestDist = Infinity;
    for (const other of this.axies) {
      if (other === attacker || other.isAbsorbed()) continue;
      if (other.followPark !== "park") continue;
      const dist = Phaser.Math.Distance.Between(
        origin.x,
        origin.y,
        other.sprite.x,
        other.sprite.y,
      );
      if (dist < bestDist) {
        bestDist = dist;
        best = other;
      }
    }
    if (!best) return null;

    const dx = origin.x - best.sprite.x;
    const dy = origin.y - best.sprite.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = dx / len;
    const ny = dy / len;
    const max = ROOT_PULL_TILES * TILE_SIZE;
    const step = 4;
    let x = best.sprite.x;
    let y = best.sprite.y;
    let moved = 0;
    while (moved + step <= max) {
      const tx = x + nx * step;
      const ty = y + ny * step;
      if (this.isBlocked?.(tx, ty)) break;
      x = tx;
      y = ty;
      moved += step;
    }
    if (moved < 1) return null;
    this.placeAt(best, x, y);
    return { x, y };
  }

  private tickHerbivore(): void {
    const room = (this.scene.registry.get("roomIndex") as number) ?? 1;
    if (room !== this.herbivoreRoom) {
      this.herbivoreRoom = room;
      this.herbivoreGained = 0;
      this.herbivoreNextAt = 0;
    }

    const parked = this.axies.filter(
      (a) =>
        !a.isAbsorbed() &&
        a.followPark === "park" &&
        a.slot !== this.activeSlot,
    );
    const charging = parked.some((a) => pileHasHerbivore(a.pile()));
    if (!charging) {
      this.herbivoreNextAt = 0;
      return;
    }

    const now = this.scene.time.now;
    if (this.herbivoreNextAt === 0) {
      this.herbivoreNextAt = now + HERBIVORE_PERIOD_MS;
      return;
    }
    if (now < this.herbivoreNextAt) return;
    if (this.herbivoreGained >= HERBIVORE_CAP_PER_ROOM) return;

    const energy = (this.scene.registry.get("energy") as number) ?? 0;
    this.scene.registry.set("energy", energy + 1);
    bumpLedger(this.scene, "herbivore", 1);
    this.herbivoreGained += 1;
    this.herbivoreNextAt = now + HERBIVORE_PERIOD_MS;
    const src = parked[0];
    if (src) {
      sfx.heal();
      floater(this.scene, src.sprite.x, src.sprite.y, "+1", "#81c784");
    }
    toastOnce(this.scene, "herbivore", "Herbivore — parked regen");
  }

  /** Unfused Bird, or Hawk form, only while active. */
  canHover(axie: Axie): boolean {
    if (axie.isAbsorbed()) return false;
    if (axie.slot !== this.activeSlot) return false;
    if (axie.isHawk()) return true;
    return axie.axieClass === "Bird" && !axie.isDruidHost();
  }

  toggleFollowPark(): void {
    this.groupFollowPark =
      this.groupFollowPark === "follow" ? "park" : "follow";

    for (const axie of this.axies) {
      if (axie.isAbsorbed()) continue;
      if (axie.slot !== this.activeSlot) {
        axie.followPark = this.groupFollowPark;
      }
    }
    sfx.park();
    this.syncRegistry();
  }

  moveActive(direction: { x: number; y: number }): void {
    this.getActive().move(direction);
  }

  getAttackContext(): {
    attacker: Axie;
    origin: { x: number; y: number };
    facing: { x: number; y: number };
  } {
    const attacker = this.getActive();
    return {
      attacker,
      origin: { x: attacker.sprite.x, y: attacker.sprite.y },
      facing: this.facingOf(attacker),
    };
  }

  resetLocalParty(roomIndex: number, spawnX: number, spawnY: number): void {
    this.splitIfFused();
    const origin = (roomIndex - 1) * ROOM_PX_W;
    let n = 0;
    for (const axie of this.axies) {
      if (axie.sprite.x < origin || axie.sprite.x >= origin + ROOM_PX_W) {
        continue;
      }
      if (axie.slot !== this.activeSlot) {
        axie.followPark = this.groupFollowPark;
      }
      const off = SPAWN_OFFSETS[n] ?? { x: 0, y: 0 };
      this.placeAt(axie, spawnX + off.x, spawnY + off.y);
      n += 1;
    }
    this.trail = [];
    this.lastTrailPos = null;
    this.herbivoreNextAt = 0;
    this.herbivoreGained = 0;
    this.scene.registry.set("cloverKitRoom", 0);
    this.syncRegistry();
  }

  splitIfFused(): void {
    for (const axie of this.axies) {
      if (axie.isDruidHost()) {
        this.split(axie);
        return;
      }
    }
  }

  tryFuseOrSplit(): void {
    const active = this.getActive();
    const existing = this.axies.find((a) => a.isDruidHost()) ?? null;

    if (existing && existing.fusionSize() >= 3) {
      this.split(existing);
      return;
    }

    const host = existing ?? active;
    const extras = this.fuseCandidates(host);
    if (extras.length === 0) {
      if (existing) this.split(existing);
      return;
    }

    let pile = existing;
    for (const extra of extras) {
      if ((pile?.fusionSize() ?? 1) >= 3) break;
      if (!this.spendFuseCost()) return;
      if (!pile) {
        this.fuse(host, extra);
        pile = host;
      } else {
        this.addGuest(pile, extra);
        if (extra === active) {
          this.activeSlot = pile.slot;
          this.updateActiveVisuals();
        }
      }
    }
  }

  update(): void {
    const driven = this.getActive();
    this.recordBreadcrumb(driven);
    this.tickHerbivore();

    const followers = this.axies.filter(
      (a) => a.slot !== driven.slot && !a.isAbsorbed(),
    );
    let followIndex = 0;
    for (const follower of followers) {
      if (follower.followPark === "park") {
        follower.body.setVelocity(0, 0);
        this.applyImmovable(follower, true);
        continue;
      }

      this.applyImmovable(follower, false);

      const crumbsBack = Math.ceil(
        (FOLLOW_DISTANCE * (followIndex + 1)) / BREADCRUMB_INTERVAL,
      );
      const trailIdx = this.trail.length - 1 - crumbsBack;
      followIndex += 1;

      let targetX: number;
      let targetY: number;
      let stopDist: number;

      if (trailIdx >= 0 && this.trail[trailIdx]) {
        const crumb = this.trail[trailIdx]!;
        targetX = crumb.x;
        targetY = crumb.y;
        stopDist = FOLLOW_STOP_THRESHOLD;
      } else {
        targetX = driven.sprite.x;
        targetY = driven.sprite.y;
        stopDist = FOLLOW_DISTANCE * followIndex;
      }

      const dist = Phaser.Math.Distance.Between(
        follower.sprite.x,
        follower.sprite.y,
        targetX,
        targetY,
      );

      if (dist > stopDist) {
        const angle = Phaser.Math.Angle.Between(
          follower.sprite.x,
          follower.sprite.y,
          targetX,
          targetY,
        );
        const lookX = follower.sprite.x + Math.cos(angle) * 20;
        const lookY = follower.sprite.y + Math.sin(angle) * 20;
        const leaderRoom = roomIndexAt(driven.sprite.x);
        const nextRoom = roomIndexAt(lookX);
        const blockedByDoor =
          nextRoom !== roomIndexAt(follower.sprite.x) &&
          nextRoom !== leaderRoom;
        if (
          this.isHazard?.(lookX, lookY) ||
          this.isHazard?.(targetX, targetY) ||
          blockedByDoor
        ) {
          follower.body.setVelocity(0, 0);
        } else {
          follower.lastFacing = { x: Math.cos(angle), y: Math.sin(angle) };
          follower.body.setVelocity(
            Math.cos(angle) * follower.speed,
            Math.sin(angle) * follower.speed,
          );
        }
      } else {
        follower.body.setVelocity(0, 0);
      }
    }

    this.applyImmovable(driven, false);

    if (driven.isDruidHost() && this.scene.time.now >= driven.fuseUntil) {
      this.split(driven);
    }

    if (this.pitCooldownFrames > 0) this.pitCooldownFrames -= 1;

    this.recordSafeTiles();
    this.resolveHazards();
    for (const axie of this.axies) {
      axie.syncVisuals();
    }
    this.syncFuseHud();
  }

  private spawnParty(): void {
    const baseX = 3 * TILE_SIZE + TILE_SIZE / 2;
    const baseY = Math.floor(ROOM_HEIGHT / 2) * TILE_SIZE + TILE_SIZE / 2;

    const party = (this.scene.registry.get("party") as PartyMember[] | undefined) ?? [];
    for (let i = 0; i < party.length; i++) {
      const member = party[i]!;
      const offset = SPAWN_OFFSETS[i] ?? { x: 0, y: 0 };
      this.axies.push(
        new Axie(this.scene, baseX + offset.x, baseY + offset.y, member),
      );
    }
  }

  private spendFuseCost(): boolean {
    const energy = (this.scene.registry.get("energy") as number) ?? 0;
    if (energy < FUSE_COST) {
      sfx.fail();
      return false;
    }
    const active = this.getActive();
    this.scene.registry.set("energy", energy - FUSE_COST);
    bumpLedger(this.scene, "fuse", FUSE_COST);
    spendAt(this.scene, active.sprite.x, active.sprite.y, FUSE_COST);
    return true;
  }

  private enemyHitCooldown = 0;

  takeEnemyDamage(): boolean {
    if (this.scene.time.now < this.enemyHitCooldown) return false;
    this.enemyHitCooldown = this.scene.time.now + 1000;
    const energy = (this.scene.registry.get("energy") as number) ?? 0;
    this.scene.registry.set("energy", energy - 1);
    bumpLedger(this.scene, "enemyHit", 1);
    const active = this.getActive();
    spendAt(this.scene, active.sprite.x, active.sprite.y, 1);
    this.scene.cameras.main.shake(100, 0.005);
    this.scene.cameras.main.flash(150, 229, 57, 53, false);
    sfx.fail();
    return true;
  }

  private fuseDurationMs(host: Axie): number {
    const base = host.fusionSize() >= 3 ? DRUID_3_MS : DRUID_2_MS;
    const synergy = host.isDawnSynergy() ? DRUID_SYNERGY_MS : 0;
    const parts = partFuseBonusMs([host, ...host.guests]);
    return base + synergy + parts;
  }

  /** Form follows pile size: ×2 Bear, ×3 Hawk. */
  private refreshFuseTimer(host: Axie): void {
    host.fuseUntil = this.scene.time.now + this.fuseDurationMs(host);
    const next = formForSize(host.fusionSize());
    if (host.form !== next) {
      host.beginForm(next);
      sfx.form();
    } else host.applyDruidLook();
  }

  private fuse(host: Axie, guest: Axie): void {
    this.addGuest(host, guest);
    this.activeSlot = host.slot;
    this.trail = [];
    this.lastTrailPos = null;
    this.updateActiveVisuals();
  }

  private addGuest(host: Axie, guest: Axie): void {
    guest.absorbedBy = host;
    host.guests.push(guest);
    guest.setHidden(true);
    this.refreshFuseTimer(host);
    this.fusePop(host);
    this.syncRegistry();
  }

  private fusePop(host: Axie): void {
    // Gold burst
    const pop = this.scene.add.circle(
      host.sprite.x,
      host.sprite.y,
      14,
      0xffd54f,
      0.55,
    );
    pop.setDepth(6);
    this.scene.tweens.add({
      targets: pop,
      scale: 2.6,
      alpha: 0,
      duration: 280,
      onComplete: () => pop.destroy(),
    });

    // Form-colored ring
    const formCol = host.form === "hawk" ? 0x42a5f5 : 0x8d6e63;
    const ring = this.scene.add.circle(
      host.sprite.x,
      host.sprite.y,
      20,
      formCol,
      0.0,
    );
    ring.setStrokeStyle(3, formCol, 0.8);
    ring.setDepth(6);
    this.scene.tweens.add({
      targets: ring,
      scale: 3.2,
      alpha: 0,
      duration: 360,
      onComplete: () => ring.destroy(),
    });

    // White flash overlay
    const cam = this.scene.cameras.main;
    const flash = this.scene.add.rectangle(
      cam.scrollX + cam.width / 2,
      cam.scrollY + cam.height / 2,
      cam.width * 2,
      cam.height * 2,
      0xffffff,
      0.25,
    );
    flash.setDepth(50);
    flash.setScrollFactor(0);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 150,
      onComplete: () => flash.destroy(),
    });

    // Camera zoom-punch
    cam.zoomTo(2.16, 180, "Sine.easeOut", false, (_c, p) => {
      if (p >= 1) cam.zoomTo(2, 280, "Sine.easeIn");
    });

    // Stronger shake
    cam.shake(120, 0.008);

    sfx.fuse();
    hitStop(this.scene, 60);
    fuseParticles(this.scene, host.sprite.x, host.sprite.y, formCol);
  }

  private split(host: Axie): void {
    const guests = host.guests.slice();
    if (guests.length === 0) return;

    const facing = this.facingOf(host);
    host.guests = [];
    host.restoreLook();

    for (let i = 0; i < guests.length; i++) {
      const guest = guests[i]!;
      const angle = Math.atan2(facing.y, facing.x) + Math.PI + (i - (guests.length - 1) / 2) * 0.7;
      guest.absorbedBy = null;
      guest.setHidden(false);
      this.placeAt(
        guest,
        host.sprite.x + Math.cos(angle) * SPLIT_POP,
        host.sprite.y + Math.sin(angle) * SPLIT_POP,
      );
    }
    host.body.reset(host.sprite.x, host.sprite.y);
    sfx.split();
    fuseParticles(this.scene, host.sprite.x, host.sprite.y, 0xffffff);
    this.updateActiveVisuals();
    this.syncRegistry();
  }

  private recordBreadcrumb(active: Axie): void {
    const pos: Breadcrumb = { x: active.sprite.x, y: active.sprite.y };
    if (this.isHazard?.(pos.x, pos.y)) return;

    if (
      !this.lastTrailPos ||
      Phaser.Math.Distance.Between(
        pos.x,
        pos.y,
        this.lastTrailPos.x,
        this.lastTrailPos.y,
      ) >= BREADCRUMB_INTERVAL
    ) {
      this.trail.push(pos);
      this.lastTrailPos = { ...pos };

      const maxCrumbs =
        Math.ceil((FOLLOW_DISTANCE * 3) / BREADCRUMB_INTERVAL) + 20;
      while (this.trail.length > maxCrumbs) {
        this.trail.shift();
      }
    }
  }

  private fuseCandidates(host: Axie): Axie[] {
    const room = roomIndexAt(host.sprite.x);
    const found: { axie: Axie; dist: number }[] = [];
    for (const other of this.axies) {
      if (other === host || other.isAbsorbed() || other.isDruidHost()) continue;
      if (other.followPark === "park") continue;
      if (roomIndexAt(other.sprite.x) !== room) continue;
      found.push({
        axie: other,
        dist: Phaser.Math.Distance.Between(
          host.sprite.x,
          host.sprite.y,
          other.sprite.x,
          other.sprite.y,
        ),
      });
    }
    found.sort((a, b) => a.dist - b.dist);
    return found.map((row) => row.axie);
  }

  private facingOf(axie: Axie): { x: number; y: number } {
    const vx = axie.body.velocity.x;
    const vy = axie.body.velocity.y;
    if (vx !== 0 || vy !== 0) {
      const len = Math.hypot(vx, vy) || 1;
      return { x: vx / len, y: vy / len };
    }
    const f = axie.lastFacing;
    const len = Math.hypot(f.x, f.y) || 1;
    return { x: f.x / len, y: f.y / len };
  }

  private recordSafeTiles(): void {
    for (const axie of this.axies) {
      if (axie.isAbsorbed()) continue;
      if (this.isHazard?.(axie.sprite.x, axie.sprite.y)) continue;
      axie.lastSafe = { x: axie.sprite.x, y: axie.sprite.y };
    }
  }

  private resolveHazards(): void {
    if (!this.isHazard) return;
    if (this.pitCooldownFrames > 0) return;

    for (const axie of this.axies) {
      if (axie.isAbsorbed()) continue;
      if (!this.isHazard(axie.sprite.x, axie.sprite.y)) continue;
      if (this.canHover(axie)) continue;

      if (axie.axieClass === "Bird" && axie.slot !== this.activeSlot) {
        this.placeAt(axie, axie.lastSafe.x, axie.lastSafe.y);
        continue;
      }

      this.handlePitFall();
      return;
    }
  }

  private handlePitFall(): void {
    this.pitCooldownFrames = 30;
    this.splitIfFused();

    const energy = (this.scene.registry.get("energy") as number) ?? 0;
    const lost = Math.min(PIT_FALL_COST, energy);
    this.scene.registry.set("energy", energy - lost);
    bumpLedger(this.scene, "pit", lost);
    const driven = this.getActive();
    sfx.pit();
    if (lost > 0) floater(this.scene, driven.sprite.x, driven.sprite.y, `−${lost}`, "#ef5350");

    for (const axie of this.axies) {
      if (axie.isAbsorbed()) continue;
      this.placeAt(axie, axie.lastSafe.x, axie.lastSafe.y);
    }
  }

  private placeAt(axie: Axie, x: number, y: number): void {
    axie.body.setVelocity(0, 0);
    axie.sprite.setPosition(x, y);
    if (axie.body.enable) {
      axie.body.reset(x, y);
    }
    axie.syncVisuals();
  }

  private applyImmovable(axie: Axie, immovable: boolean): void {
    if (immovable && this.overlapsAlly(axie)) {
      axie.body.setImmovable(false);
      return;
    }
    axie.body.setImmovable(immovable);
  }

  private overlapsAlly(axie: Axie): boolean {
    for (const other of this.axies) {
      if (other === axie || other.isAbsorbed()) continue;
      const dist = Phaser.Math.Distance.Between(
        axie.sprite.x,
        axie.sprite.y,
        other.sprite.x,
        other.sprite.y,
      );
      if (dist < 32) return true;
    }
    return false;
  }

  private updateActiveVisuals(): void {
    const active = this.getActive();
    for (const axie of this.axies) {
      axie.setActive(axie === active);
    }
  }

  private syncRegistry(): void {
    this.scene.registry.set("activeSlot", this.activeSlot);
    this.scene.registry.set("hasFusedHost", this.axies.some((a) => a.isDruidHost()));

    const states: Record<number, string> = {};
    for (const axie of this.axies) {
      if (axie.slot === this.activeSlot && !axie.isAbsorbed()) {
        states[axie.slot] = "active";
      } else if (axie.isDruidHost() && axie.followPark === "park") {
        states[axie.slot] = "park";
      } else if (axie.isFused()) {
        states[axie.slot] = "fused";
      } else {
        states[axie.slot] = axie.followPark;
      }
    }
    this.scene.registry.set("partyStates", states);
    this.syncFuseHud();
  }

  private syncFuseHud(): void {
    const driven = this.getActive();
    const verb = verbForBody(
      driven.pile(),
      driven.isDruidHost() ? driven.form : null,
      driven.axieClass,
    );
    this.scene.registry.set("formVerb", verb ? verbLabel(verb) : "");

    const host = this.axies.find((a) => a.isDruidHost());
    if (!host) {
      this.scene.registry.set("fused", "");
      this.scene.registry.set("fuseMs", 0);
      this.scene.registry.set("fuseTag", "");
      return;
    }
    this.scene.registry.set("fused", `×${host.fusionSize()}`);
    this.scene.registry.set("fuseMs", Math.max(0, host.fuseUntil - this.scene.time.now));
    this.scene.registry.set(
      "fuseTag",
      host.form ? formLabel(host.form) : "Druidform",
    );
  }
}
