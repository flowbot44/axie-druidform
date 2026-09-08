import Phaser from "phaser";
import { Axie } from "../entities/Axie.ts";
import {
  PARTY,
  TILE_SIZE,
  ROOM_HEIGHT,
  FOLLOW_DISTANCE,
  FOLLOW_STOP_THRESHOLD,
  BREADCRUMB_INTERVAL,
} from "../config/constants.ts";

interface Breadcrumb {
  x: number;
  y: number;
}

/**
 * PartyManager — owns all three Axies and drives party state.
 *
 * Handles slot selection, follow/park toggling, and the breadcrumb
 * trail system that followers use to navigate around corners.
 */
export class PartyManager {
  private readonly scene: Phaser.Scene;
  private readonly axies: Axie[] = [];
  private activeSlot = 1;
  private trail: Breadcrumb[] = [];
  private lastTrailPos: Breadcrumb | null = null;
  private groupFollowPark: "follow" | "park" = "follow";

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

  /** Toggle Follow ↔ Park for BOTH inactive Axies as a group (GDD §8). */
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

  /** Call each frame after moving the active Axie. */
  update(): void {
    const active = this.getActive();

    // ── Record breadcrumbs from active's movement ──────────────────
    this.recordBreadcrumb(active);
    active.syncVisuals();

    // ── Move followers ─────────────────────────────────────────────
    const followers = this.axies.filter((a) => a.slot !== this.activeSlot);
    for (let i = 0; i < followers.length; i++) {
      const follower = followers[i]!;

      if (follower.followPark === "park") {
        follower.body.setVelocity(0, 0);
        follower.syncVisuals();
        continue;
      }

      // Determine target: trail breadcrumb or direct leader position
      const crumbsBack = Math.ceil(
        (FOLLOW_DISTANCE * (i + 1)) / BREADCRUMB_INTERVAL,
      );
      const trailIdx = this.trail.length - 1 - crumbsBack;

      let targetX: number;
      let targetY: number;
      let stopDist: number;

      if (trailIdx >= 0 && this.trail[trailIdx]) {
        // Trail breadcrumb available — follow it precisely
        const crumb = this.trail[trailIdx]!;
        targetX = crumb.x;
        targetY = crumb.y;
        stopDist = FOLLOW_STOP_THRESHOLD;
      } else {
        // Trail too short — move toward leader but maintain spacing
        targetX = active.sprite.x;
        targetY = active.sprite.y;
        stopDist = FOLLOW_DISTANCE * (i + 1);
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
        follower.body.setVelocity(
          Math.cos(angle) * follower.speed,
          Math.sin(angle) * follower.speed,
        );
      } else {
        follower.body.setVelocity(0, 0);
      }

      follower.syncVisuals();
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

  private updateActiveVisuals(): void {
    for (const axie of this.axies) {
      axie.setActive(axie.slot === this.activeSlot);
    }
  }

  private syncRegistry(): void {
    this.scene.registry.set("activeSlot", this.activeSlot);

    const states: Record<number, string> = {};
    for (const axie of this.axies) {
      states[axie.slot] =
        axie.slot === this.activeSlot ? "active" : axie.followPark;
    }
    this.scene.registry.set("partyStates", states);
  }
}
