import Phaser from "phaser";
import { Axie } from "../entities/Axie.ts";
import {
  PARTY,
  TILE_SIZE,
  ROOM_HEIGHT,
  FOLLOW_DISTANCE,
  FOLLOW_STOP_THRESHOLD,
  BREADCRUMB_INTERVAL,
  STACK_RANGE,
  STACK_Y_OFFSET,
  DISMOUNT_POP,
  PLAYER_SPEED,
  PIT_FALL_COST,
  ROOM_PX_W,
  roomIndexAt,
} from "../config/constants.ts";

interface Breadcrumb {
  x: number;
  y: number;
}

/**
 * PartyManager — owns all three Axies and drives party state.
 *
 * Handles slot selection, follow/park toggling, breadcrumb follow,
 * and totem stack / full dismount (GDD §8, §11).
 */
export class PartyManager {
  private readonly scene: Phaser.Scene;
  private readonly axies: Axie[] = [];
  private activeSlot = 1;
  private trail: Breadcrumb[] = [];
  private lastTrailPos: Breadcrumb | null = null;
  private groupFollowPark: "follow" | "park" = "follow";
  private isHazard: ((x: number, y: number) => boolean) | null = null;
  private pitCooldownFrames = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.spawnParty();
    this.updateActiveVisuals();
    this.syncRegistry();
  }

  // ── Public API ───────────────────────────────────────────────────────

  getActive(): Axie {
    const active = this.axies.find((a) => a.slot === this.activeSlot);
    if (!active) throw new Error(`No Axie in slot ${this.activeSlot}`);
    return active;
  }

  getAxies(): Axie[] {
    return this.axies;
  }

  getSprites(): Phaser.GameObjects.Ellipse[] {
    return this.axies.map((a) => a.sprite);
  }

  selectSlot(slot: number): void {
    if (slot < 1 || slot > 3 || slot === this.activeSlot) return;

    // Previously active Axie adopts the group follow/park state
    this.getActive().followPark = this.groupFollowPark;

    this.activeSlot = slot;
    this.trail = [];
    this.lastTrailPos = null;
    this.updateActiveVisuals();
    this.syncRegistry();
  }

  cycleSlot(): void {
    this.selectSlot((this.activeSlot % 3) + 1);
  }

  /** Pit / mud query used to stop followers and skip hover-illegal tiles. */
  setHazardQuery(fn: (x: number, y: number) => boolean): void {
    this.isHazard = fn;
  }

  /** Scout hover only while Puffy is the active, unstacked unit (GDD §9, §11). */
  canHover(axie: Axie): boolean {
    return (
      axie.role === "Scout" &&
      axie.slot === this.activeSlot &&
      !axie.isInStack()
    );
  }

  /** Toggle Follow ↔ Park for BOTH inactive Axies as a group (GDD §8). Does not unstack. */
  toggleFollowPark(): void {
    this.groupFollowPark =
      this.groupFollowPark === "follow" ? "park" : "follow";

    for (const axie of this.axies) {
      if (axie.slot !== this.activeSlot) {
        axie.followPark = this.groupFollowPark;
      }
    }
    this.syncRegistry();
  }

  /**
   * Drive the active Axie, or the **base** if the active unit is in a stack (GDD §7).
   * Beast sprint applies only while Buba is the active, unstacked unit (GDD §6).
   */
  moveActive(direction: { x: number; y: number }): void {
    const active = this.getActive();
    const mover = active.getBase();
    if (active.isInStack()) {
      mover.body.setVelocity(
        direction.x * PLAYER_SPEED,
        direction.y * PLAYER_SPEED,
      );
      if (direction.x !== 0 || direction.y !== 0) {
        mover.lastFacing = { x: direction.x, y: direction.y };
      }
      return;
    }
    mover.move(direction);
  }

  /**
   * Attack origin is the stack **top**; facing comes from the driven base (GDD §11).
   */
  getAttackContext(): {
    attacker: Axie;
    origin: { x: number; y: number };
    facing: { x: number; y: number };
  } {
    const active = this.getActive();
    const attacker = active.getTop();
    const facingSource = active.isInStack() ? active.getBase() : active;
    return {
      attacker,
      origin: { x: attacker.sprite.x, y: attacker.sprite.y },
      facing: this.facingOf(facingSource),
    };
  }

  /**
   * `E` — mount onto the nearest ally within STACK_RANGE, or fully collapse
   * the totem if the active Axie is already stacked (GDD §11).
   */
  /**
   * Retry this room: dismount, snap local Axies to spawn, clear local parks.
   * Axies parked in other rooms are left alone (GDD §10).
   */
  resetLocalParty(roomIndex: number, spawnX: number, spawnY: number): void {
    this.dismountIfStacked();
    const origin = (roomIndex - 1) * ROOM_PX_W;
    const offsets = [
      { x: 0, y: 0 },
      { x: -TILE_SIZE, y: Math.floor(TILE_SIZE * 0.5) },
      { x: -TILE_SIZE, y: -Math.floor(TILE_SIZE * 0.5) },
    ];
    let n = 0;
    for (const axie of this.axies) {
      if (axie.sprite.x < origin || axie.sprite.x >= origin + ROOM_PX_W) {
        continue;
      }
      if (axie.slot !== this.activeSlot) {
        axie.followPark = this.groupFollowPark;
      }
      const off = offsets[n] ?? { x: 0, y: 0 };
      this.placeAt(axie, spawnX + off.x, spawnY + off.y);
      n += 1;
    }
    this.trail = [];
    this.lastTrailPos = null;
    this.syncRegistry();
  }

  dismountIfStacked(): void {
    for (const axie of this.axies) {
      if (axie.isInStack() && !axie.mountedTo) {
        this.fullDismount(axie);
        return;
      }
    }
  }

  tryStackOrDismount(): void {
    const active = this.getActive();

    if (active.isInStack()) {
      this.fullDismount(active.getBase());
      return;
    }

    const nearest = this.nearestAlly(active, STACK_RANGE);
    if (!nearest) return;

    const carrier = nearest.getTop();
    if (carrier === active) return;
    if (carrier.directRider) return;
    if (carrier.heightTier >= 3) return;

    this.mount(active, carrier);
  }

  /** Call each frame after moving the active Axie. */
  update(): void {
    const active = this.getActive();
    const driven = active.getBase();

    // ── Record breadcrumbs from the driven body's movement ─────────
    this.recordBreadcrumb(driven);

    // ── Move followers (skip riders; skip anyone in the active stack)
    const followers = this.axies.filter((a) => a.slot !== this.activeSlot);
    let followIndex = 0;
    for (const follower of followers) {
      if (follower.mountedTo) {
        continue;
      }

      const inActiveStack = follower.getBase() === driven;
      if (inActiveStack) {
        // Player is driving this stack via moveActive — do not follow.
        this.applyImmovable(follower, false);
        continue;
      }

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
          // GDD §8: no chasm hover; do not enter a room the leader hasn't.
          follower.body.setVelocity(0, 0);
        } else {
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

    if (this.pitCooldownFrames > 0) this.pitCooldownFrames -= 1;

    // ── Slave rider transforms to carriers, then sync labels ───────
    this.syncStackTransforms();
    this.recordSafeTiles();
    this.resolveHazards();
    for (const axie of this.axies) {
      axie.syncVisuals();
    }
  }

  // ── Private ──────────────────────────────────────────────────────────

  private spawnParty(): void {
    const baseX = 3 * TILE_SIZE + TILE_SIZE / 2;
    const baseY = Math.floor(ROOM_HEIGHT / 2) * TILE_SIZE + TILE_SIZE / 2;

    const offsets = [
      { x: 0, y: 0 }, // Olek — front
      { x: -TILE_SIZE, y: Math.floor(TILE_SIZE * 0.5) }, // Buba — behind-below
      { x: -TILE_SIZE, y: -Math.floor(TILE_SIZE * 0.5) }, // Puffy — behind-above
    ];

    for (let i = 0; i < PARTY.length; i++) {
      const member = PARTY[i]!;
      const offset = offsets[i]!;
      this.axies.push(
        new Axie(this.scene, baseX + offset.x, baseY + offset.y, member),
      );
    }
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

      // Trim to prevent unbounded growth
      const maxCrumbs =
        Math.ceil((FOLLOW_DISTANCE * 3) / BREADCRUMB_INTERVAL) + 20;
      while (this.trail.length > maxCrumbs) {
        this.trail.shift();
      }
    }
  }

  private mount(rider: Axie, carrier: Axie): void {
    rider.mountedTo = carrier;
    carrier.directRider = rider;
    rider.setBodyEnabled(false);
    this.recomputeTiers(carrier.getBase());
    this.syncStackTransforms();
    this.syncRegistry();
  }

  /**
   * Collapse the entire totem. Top pops DISMOUNT_POP px backward.
   * Follow/Park flags are left as-is (GDD §11).
   */
  private fullDismount(base: Axie): void {
    const top = base.getTop();
    const members: Axie[] = [];
    let node: Axie | null = base;
    while (node) {
      members.push(node);
      node = node.directRider;
    }

    const facing = this.facingOf(base);
    const popX = top.sprite.x - facing.x * DISMOUNT_POP;
    const popY = top.sprite.y - facing.y * DISMOUNT_POP;

    for (const axie of members) {
      axie.mountedTo = null;
      axie.directRider = null;
      axie.heightTier = 1;
      axie.setBodyEnabled(true);
      axie.applyStackDepth();
    }

    top.sprite.setPosition(popX, popY);
    for (const axie of members) {
      axie.body.reset(axie.sprite.x, axie.sprite.y);
      axie.syncVisuals();
    }

    this.syncRegistry();
  }

  private recomputeTiers(base: Axie): void {
    let tier = 1;
    let node: Axie | null = base;
    while (node) {
      node.heightTier = tier;
      node.applyStackDepth();
      node = node.directRider;
      tier += 1;
    }
  }

  /** Place each rider at carrier (x, y - STACK_Y_OFFSET). */
  private syncStackTransforms(): void {
    for (const axie of this.axies) {
      if (axie.mountedTo) continue;
      let carrier = axie;
      let rider = carrier.directRider;
      while (rider) {
        rider.sprite.setPosition(
          carrier.sprite.x,
          carrier.sprite.y - STACK_Y_OFFSET,
        );
        carrier = rider;
        rider = carrier.directRider;
      }
    }
  }

  private nearestAlly(from: Axie, range: number): Axie | null {
    let best: Axie | null = null;
    let bestDist = range;
    for (const other of this.axies) {
      if (other === from) continue;
      const dist = Phaser.Math.Distance.Between(
        from.sprite.x,
        from.sprite.y,
        other.sprite.x,
        other.sprite.y,
      );
      if (dist <= bestDist) {
        bestDist = dist;
        best = other;
      }
    }
    return best;
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
      if (axie.mountedTo) continue;
      if (this.isHazard?.(axie.sprite.x, axie.sprite.y)) continue;
      axie.lastSafe = { x: axie.sprite.x, y: axie.sprite.y };
    }
  }

  private resolveHazards(): void {
    if (!this.isHazard) return;
    if (this.pitCooldownFrames > 0) return;

    for (const axie of this.axies) {
      if (axie.mountedTo) continue;
      if (!this.isHazard(axie.sprite.x, axie.sprite.y)) continue;
      if (this.canHover(axie)) continue;

      // Parked / following Scout over a pit is illegal — snap that body only.
      if (axie.role === "Scout" && axie.slot !== this.activeSlot) {
        this.placeAt(axie, axie.lastSafe.x, axie.lastSafe.y);
        continue;
      }

      this.handlePitFall();
      return;
    }
  }

  /** GDD §10: snap all three, break stack, −3 energy once. */
  private handlePitFall(): void {
    this.pitCooldownFrames = 30;
    const active = this.getActive();
    if (active.isInStack()) this.fullDismount(active.getBase());

    const energy = (this.scene.registry.get("energy") as number) ?? 0;
    this.scene.registry.set("energy", Math.max(0, energy - PIT_FALL_COST));

    for (const axie of this.axies) {
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
    // Parked mass stays put on plates, but not while overlapping an ally
    // (full dismount can land the top on the carrier).
    if (immovable && this.overlapsAlly(axie)) {
      axie.body.setImmovable(false);
      return;
    }
    axie.body.setImmovable(immovable);
  }

  private overlapsAlly(axie: Axie): boolean {
    for (const other of this.axies) {
      if (other === axie || other.mountedTo) continue;
      const dist = Phaser.Math.Distance.Between(
        axie.sprite.x,
        axie.sprite.y,
        other.sprite.x,
        other.sprite.y,
      );
      if (dist < 24) return true;
    }
    return false;
  }

  private updateActiveVisuals(): void {
    for (const axie of this.axies) {
      axie.setActive(axie.slot === this.activeSlot);
    }
  }

  private syncRegistry(): void {
    this.scene.registry.set("activeSlot", this.activeSlot);

    const states: Record<number, string> = {};
    for (const axie of this.axies) {
      if (axie.isInStack()) {
        states[axie.slot] = "stacked";
      } else if (axie.slot === this.activeSlot) {
        states[axie.slot] = "active";
      } else {
        states[axie.slot] = axie.followPark;
      }
    }
    this.scene.registry.set("partyStates", states);

    const stackHeight = Math.max(...this.axies.map((a) => a.heightTier), 1);
    this.scene.registry.set("stackHeight", stackHeight);
  }
}
