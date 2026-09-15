/** Tile & room dimensions (GDD §6) */
export const TILE_SIZE = 32;
export const ROOM_WIDTH = 20; // tiles
export const ROOM_HEIGHT = 11; // tiles
export const ROOM_COUNT = 5;
export const ROOM_PX_W = ROOM_WIDTH * TILE_SIZE;
export const ROOM_PX_H = ROOM_HEIGHT * TILE_SIZE;
export const RETRY_PENALTY_MS = 10_000;

/** Movement (GDD §6, §9) */
export const PLAYER_SPEED = 160; // px/sec — smooth at 32px tiles

/** Follow tether (GDD §8) — gap matches the cropped stills (~2 tiles). */
export const FOLLOW_DISTANCE = 80;
export const FOLLOW_STOP_THRESHOLD = 12;
export const BREADCRUMB_INTERVAL = 8; // record a breadcrumb every N px of leader movement

/** Fusion / Druidform (GDD §11) */
export const FUSE_RANGE = 40;
export const FUSE_COST = 3;
export const FORM_SWITCH_COST = 1;
export const SPLIT_POP = 32;
export const DRUID_2_COLOR = 0x9575cd;
export const DRUID_3_COLOR = 0xffd54f;
export const DAWN_COLOR = 0xb39ddb;
export const DRUID_2_MS = 8_000;
export const DRUID_3_MS = 14_000;
export const DRUID_SYNERGY_MS = 4_000;
export const DRUID_2_SPEED = 1.25;
export const DRUID_3_SPEED = 1.5;
export const DRUID_2_RANGE = 1.25;
export const DRUID_3_RANGE = 1.5;

/** Crystal (GDD §11, Room 4) */
export const CRYSTAL_INTERACT_RANGE = 64;

/** Energy (GDD §9) */
export const STARTING_ENERGY = 100;

/** Abilities (GDD §9) — Space / click fires the active (or Dawn) kit */
export const SLAM_COST = 2;
export const SLAM_RADIUS = 48;
export const SLASH_COST = 1;
export const SLASH_REACH = 64;
export const SLASH_ARC_DEG = 90;
export const DART_COST = 2;
export const DART_RANGE = 350;
export const DART_STEP = 8;
export const EYE_HIT_RADIUS = 18;
export const PIT_FALL_COST = 3;

/** Tile visual colors */
export const FLOOR_COLOR = 0x3a3a52;
export const WALL_COLOR = 0x1a1a2e;
export const WALL_ACCENT = 0x2a2a3e;
export const GRID_LINE_COLOR = 0x44445e;
export const PIT_COLOR = 0x0a0a14;
export const PIT_INNER = 0x12121f;

/** Tile indices used in room layout arrays */
export const TILE_FLOOR = 0;
export const TILE_WALL = 1;
export const TILE_PIT = 2;
/** Walkable overlay after a pit is filled (vines / bridge). */
export const TILE_FILL = 3;

/** Interactive object colors */
export const PLATE_COLOR_OFF = 0x555555;
export const PLATE_COLOR_ON = 0x4caf50;
export const GATE_COLOR_CLOSED = 0x8d6e63;
export const GATE_COLOR_OPEN = 0xd7ccc8;
export const CRYSTAL_COLOR_IDLE = 0x7e57c2;
export const CRYSTAL_COLOR_WRONG = 0xef5350;
export const CRYSTAL_COLOR_SOLVED = 0x80deea;
export const BRAMBLE_COLOR = 0x33691e;
export const BRAMBLE_STROKE = 0x1b5e20;
export const BELL_COLOR = 0xb0bec5;
export const LEVER_COLOR_OFF = 0x8d6e63;
export const LEVER_COLOR_ON = 0xffc107;
export const EYE_COLOR_IDLE = 0x26c6da;
export const EYE_COLOR_WRONG = 0xef5350;
export const EYE_COLOR_SOLVED = 0x69f0ae;
export const SIMULATED_AXP = 250;
export const WHIP_COLOR = 0x6d4c41;
export const CORE_COLOR = 0xff7043;
export const ANCHOR_COLOR_OFF = 0x455a64;
export const ANCHOR_COLOR_ON = 0x66bb6a;

// ---------------------------------------------------------------------------
// Party roster (GDD §4 — LOCKED)
// ---------------------------------------------------------------------------

export type AxieClass = "Plant" | "Beast" | "Bird" | "Aqua" | "Bug" | "Reptile" | "Mech" | "Dawn" | "Dusk";

export interface AxieParts {
  readonly eyes: string;
  readonly ears: string;
  readonly horn: string;
  readonly mouth: string;
  readonly back: string;
  readonly tail: string;
}

export interface AxieEvolved {
  readonly eyes: boolean;
  readonly ears: boolean;
  readonly mouth: boolean;
  readonly horn: boolean;
  readonly back: boolean;
  readonly tail: boolean;
}

export type AxieCollection =
  | "normal"
  | "mystic"
  | "origin"
  | "meo"
  | "shiny"
  | "xmas"
  | "japanese"
  | "nightmare"
  | "summer"
  | "agamo";

/**
 * The class of each of the Axie's 6 body parts.
 * Used by the Part Affinity system to score how well an Axie fits each Druidform.
 */
export interface AxiePartClasses {
  readonly eyes: AxieClass;
  readonly ears: AxieClass;
  readonly mouth: AxieClass;
  readonly horn: AxieClass;
  readonly back: AxieClass;
  readonly tail: AxieClass;
}

export interface PartyMember {
  readonly slot: number;
  readonly id: number;
  readonly name: string;
  readonly axieClass: AxieClass;
  readonly parts: AxieParts;
  readonly partClasses: AxiePartClasses;
  readonly evolved: AxieEvolved;
  readonly collection: AxieCollection;
  readonly color: number;
  readonly speed: number;
  readonly image?: string;
  readonly special?: string;
}

// ---------------------------------------------------------------------------
// Room layouts — hardcoded arrays for Steps 1–6.
// Replaced with Tiled JSON maps in Step 7.
// ---------------------------------------------------------------------------

const W = TILE_WALL;
const F = TILE_FLOOR;
const P = TILE_PIT;

/** Room 1 — Bramble L in the north gap. Center of col 10 is wall; go up, slash, around. */
export const ROOM_1: number[][] = [
  [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W],
  [W, F, F, F, F, F, F, F, F, F, W, F, F, F, F, F, F, F, F, W],
  [W, F, F, F, F, F, F, F, F, F, W, F, F, F, F, F, F, F, F, W],
  [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
  [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
  [W, F, F, F, F, F, F, F, F, F, W, F, F, F, F, F, F, F, F, W],
  [W, F, F, F, F, F, F, F, F, F, W, F, F, F, F, F, F, F, F, W],
  [W, F, F, F, F, F, F, F, F, F, W, F, F, F, F, F, F, F, F, W],
  [W, F, F, F, F, F, F, F, F, F, W, F, F, F, F, F, F, F, F, W],
  [W, F, F, F, F, F, F, F, F, F, W, F, F, F, F, F, F, F, F, W],
  [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W],
];

/** Room 2 — Chasm. Eye in the SE corner behind a south LOS wall. East door sealed. */
export const ROOM_2: number[][] = [
  [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W],
  [W, F, F, F, F, F, F, F, P, P, P, F, F, F, F, F, F, F, F, W],
  [W, F, F, F, F, F, F, F, P, P, P, F, F, F, F, F, F, F, F, W],
  [W, F, F, F, F, F, F, F, P, P, P, F, F, F, F, F, F, F, F, W],
  [W, F, F, F, F, F, F, F, P, P, P, F, F, F, F, F, F, F, F, W],
  [W, F, F, F, F, F, F, F, P, P, P, F, F, F, F, F, F, F, F, W],
  [W, F, F, F, F, F, F, F, P, P, P, F, F, F, F, F, F, F, F, W],
  [W, F, F, F, F, F, F, F, P, P, P, F, W, W, F, F, F, F, F, W],
  [W, F, F, F, F, F, F, F, P, P, P, F, W, W, F, F, F, F, F, W],
  [W, F, F, F, F, F, F, F, P, P, P, F, W, W, F, F, F, F, F, W],
  [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W],
];

/** Room 5 — Shrine. West foyer, root doorway, east core. No walk-around. */
export const ROOM_5: number[][] = [
  [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W],
  [W, F, F, F, F, F, F, F, F, F, W, F, F, F, F, F, F, F, F, W],
  [W, F, F, F, F, F, F, F, F, F, W, F, F, F, F, F, F, F, F, W],
  [W, F, F, F, F, F, F, F, F, F, W, F, F, F, F, F, F, F, F, W],
  [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
  [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
  [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
  [W, F, F, F, F, F, F, F, F, F, W, F, F, F, F, F, F, F, F, W],
  [W, F, F, F, F, F, F, F, F, F, W, F, F, F, F, F, F, F, F, W],
  [W, F, F, F, F, F, F, F, F, F, W, F, F, F, F, F, F, F, F, W],
  [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W],
];

/** Room 4 — Short fly-gap, thorn door, optional crystal in the SE alcove. */
export const ROOM_4: number[][] = [
  [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W],
  [W, F, F, F, F, F, W, W, W, F, F, F, F, W, W, W, W, W, W, W],
  [W, F, F, F, F, F, W, W, W, F, F, F, F, W, W, W, W, W, W, W],
  [W, F, F, F, F, F, W, W, W, F, F, F, F, F, F, F, F, F, F, W],
  [W, F, F, F, F, F, P, P, F, F, F, F, F, F, F, F, F, F, F, W],
  [W, F, F, F, F, F, P, P, F, F, F, F, F, F, F, F, F, F, F, W],
  [W, F, F, F, F, F, P, P, F, F, F, F, F, F, F, F, F, F, F, W],
  [W, F, F, F, F, F, W, W, W, F, F, F, F, F, F, F, F, F, F, W],
  [W, F, F, F, F, F, W, W, W, F, F, F, F, F, F, F, F, F, F, W],
  [W, F, F, F, F, F, W, W, W, F, F, F, F, W, W, W, W, W, W, W],
  [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W],
];

/** Room 3 — Dual Weight Vault. Bisected room for Step 3. */
export const ROOM_3: number[][] = [
  [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W],
  [W, F, F, F, F, F, F, F, F, F, W, F, F, F, F, F, F, F, F, W],
  [W, F, F, F, F, F, F, F, F, F, W, F, F, F, F, F, F, F, F, W],
  [W, F, F, F, F, F, F, F, F, F, W, F, F, F, F, F, F, F, F, W],
  [W, F, F, F, F, F, F, F, F, F, W, F, F, F, F, F, F, F, F, W],
  [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W], // Gap for gate at col 10
  [W, F, F, F, F, F, F, F, F, F, W, F, F, F, F, F, F, F, F, W],
  [W, F, F, F, F, F, F, F, F, F, W, F, F, F, F, F, F, F, F, W],
  [W, F, F, F, F, F, F, F, F, F, W, F, F, F, F, F, F, F, F, W],
  [W, F, F, F, F, F, F, F, F, F, W, F, F, F, F, F, F, F, F, W],
  [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W],
];

function cloneGrid(grid: number[][]): number[][] {
  return grid.map((row) => row.slice());
}

/** Punch a 3-tile door in the west / east walls at rows 4–6. */
export function withDoors(
  grid: number[][],
  west: boolean,
  east: boolean,
): number[][] {
  const copy = cloneGrid(grid);
  for (const r of [4, 5, 6]) {
    const row = copy[r];
    if (!row) continue;
    if (west) row[0] = TILE_FLOOR;
    if (east) row[ROOM_WIDTH - 1] = TILE_FLOOR;
  }
  return copy;
}

export function stitchRooms(rooms: number[][][]): number[][] {
  const rows: number[][] = [];
  for (let r = 0; r < ROOM_HEIGHT; r++) {
    const row: number[] = [];
    for (const room of rooms) {
      row.push(...(room[r] ?? []));
    }
    rows.push(row);
  }
  return rows;
}

export const DUNGEON_LAYOUT: number[][] = stitchRooms([
  withDoors(ROOM_1, false, true),
  withDoors(ROOM_2, true, false),
  withDoors(ROOM_3, true, true),
  withDoors(ROOM_4, true, true),
  withDoors(ROOM_5, true, false),
]);

export function roomIndexAt(worldX: number): number {
  const i = Math.floor(worldX / ROOM_PX_W);
  return Math.max(1, Math.min(ROOM_COUNT, i + 1));
}

export function roomOriginX(index: number): number {
  return (index - 1) * ROOM_PX_W;
}

export function worldCenter(
  room: number,
  col: number,
  row: number,
): { x: number; y: number } {
  return {
    x: roomOriginX(room) + col * TILE_SIZE + TILE_SIZE / 2,
    y: row * TILE_SIZE + TILE_SIZE / 2,
  };
}

export const ROOM_COPY: readonly { objective: string; hint: string }[] = [
  { objective: "", hint: "" },
  {
    objective: "Go north — slash the bramble L",
    hint: "X Cat / Beast Space  ·  Dual Blade one Space",
  },
  {
    objective: "Fly, then dart the SE eye — that opens the east door",
    hint: "C Hawk hover the pit  ·  walk south  ·  dart the eye",
  },
  {
    objective: "Plate is NW — lock the lever SE",
    hint: "Park Plant on the plate  ·  or Bear then leftover through  ·  lever is down-right",
  },
  {
    objective: "Fly the gap, Cat the thorns, crystal is SE",
    hint: "C across the ditch  ·  X the door thorns  ·  crystal down-right is optional",
  },
  {
    objective: "Paw SW, eye NE, ember SE",
    hint: "Z the paw (roots stay)  ·  walk in  ·  C the NE eye  ·  X the SE ember",
  },
];
