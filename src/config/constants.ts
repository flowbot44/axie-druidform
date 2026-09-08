/** Tile & room dimensions (GDD §6) */
export const TILE_SIZE = 32;
export const ROOM_WIDTH = 20; // tiles
export const ROOM_HEIGHT = 11; // tiles
export const ROOM_COUNT = 5;
export const ROOM_PX_W = ROOM_WIDTH * TILE_SIZE;
export const ROOM_PX_H = ROOM_HEIGHT * TILE_SIZE;
export const BELL_PENALTY_MS = 10_000;

/** Movement (GDD §6, §9) */
export const PLAYER_SPEED = 160; // px/sec — smooth at 32px tiles

/** Follow tether (GDD §8) */
export const FOLLOW_DISTANCE = 60; // px gap between leader and each follower
export const FOLLOW_STOP_THRESHOLD = 8; // px; follower stops when this close to target
export const BREADCRUMB_INTERVAL = 8; // record a breadcrumb every N px of leader movement

/** Totem stack (GDD §11) */
export const STACK_RANGE = 40; // px; nearest ally must be within this to mount
export const STACK_Y_OFFSET = 28; // px; rider sits this far above the carrier
export const DISMOUNT_POP = 32; // px; top unit pops backward on full collapse

/** Crystal (GDD §11, Room 4) */
export const CRYSTAL_TARGET_TIER = 3;
export const CRYSTAL_INTERACT_RANGE = 64; // px from stack base (world cell) to crystal

/** Energy (GDD §9) */
export const STARTING_ENERGY = 100;

/** Abilities (GDD §9) — Space / click fires the stack top's kit */
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
export const EYE_TARGET_TIER = 1;
export const BOSS_EYE_TIER = 3;
export const SIMULATED_AXP = 250;
export const WHIP_COLOR = 0x6d4c41;
export const CORE_COLOR = 0xff7043;
export const ANCHOR_COLOR_OFF = 0x455a64;
export const ANCHOR_COLOR_ON = 0x66bb6a;

// ---------------------------------------------------------------------------
// Party roster (GDD §4 — LOCKED)
// ---------------------------------------------------------------------------

export interface PartyMember {
  readonly slot: number;
  readonly name: string;
  readonly role: string;
  readonly color: number;
  readonly speed: number;
}

export const PARTY: readonly PartyMember[] = [
  { slot: 1, name: "Olek", role: "Tank", color: 0x4caf50, speed: PLAYER_SPEED },
  {
    slot: 2,
    name: "Buba",
    role: "Striker",
    color: 0xff9800,
    speed: Math.floor(PLAYER_SPEED * 1.25), // +25% sprint passive (GDD §6)
  },
  { slot: 3, name: "Puffy", role: "Scout", color: 0x42a5f5, speed: PLAYER_SPEED },
];

// ---------------------------------------------------------------------------
// Room layouts — hardcoded arrays for Steps 1–6.
// Replaced with Tiled JSON maps in Step 7.
// ---------------------------------------------------------------------------

const W = TILE_WALL;
const F = TILE_FLOOR;
const P = TILE_PIT;

/** Room 1 — Entry Hall. Wall bisect; col 10 rows 4–6 are the bramble doorway. */
export const ROOM_1: number[][] = [
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

/** Room 2 — The Chasm. Pit at cols 8–10; LOS wall hides the T1 eye. */
export const ROOM_2: number[][] = [
  [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W],
  [W, F, F, F, F, F, F, F, P, P, P, F, W, W, F, F, F, F, F, W],
  [W, F, F, F, F, F, F, F, P, P, P, F, W, W, F, F, F, F, F, W],
  [W, F, F, F, F, F, F, F, P, P, P, F, W, W, F, F, F, F, F, W],
  [W, F, F, F, F, F, F, F, P, P, P, F, F, F, F, F, F, F, F, W],
  [W, F, F, F, F, F, F, F, P, P, P, F, F, F, F, F, F, F, F, W],
  [W, F, F, F, F, F, F, F, P, P, P, F, F, F, F, F, F, F, F, W],
  [W, F, F, F, F, F, F, F, P, P, P, F, F, F, F, F, F, F, F, W],
  [W, F, F, F, F, F, F, F, P, P, P, F, F, F, F, F, F, F, F, W],
  [W, F, F, F, F, F, F, F, P, P, P, F, F, F, F, F, F, F, F, W],
  [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W],
];

/** Room 5 — Boss Chamber placeholder until Step 8. */
export const ROOM_5: number[][] = [
  [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W],
  [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
  [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
  [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
  [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
  [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
  [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
  [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
  [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
  [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
  [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W],
];

/** Room 4 — The Totem Pillar. Open hall for Step 4 stack + crystal. */
export const ROOM_4: number[][] = [
  [W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W],
  [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
  [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
  [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
  [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
  [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
  [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
  [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
  [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
  [W, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, F, W],
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
  withDoors(ROOM_2, true, true),
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
    objective: "Slash the brambles — 2 Buba, Space",
    hint: "2 Buba  Space slash (1)  walk east  Bell retries the room",
  },
  {
    objective: "Park (F), hover as Puffy, dart the T1 eye",
    hint: "3 Puffy  hover the gap  Space dart (2)  Bell retries",
  },
  {
    objective: "Park Olek on the plate, walk through, pull the lever",
    hint: "F park Tank  swap  walk through  pull lever  Olek follows",
  },
  {
    objective: "Stack a Totem ×3, dart the T3 crystal",
    hint: "Park Olek  2 E  3 E  Space dart from the top",
  },
  {
    objective: "Anchor the whip — Olek on the cell, or Root Slam",
    hint: "Park Olek on ANCHOR  stack ×3  dart T3 eye  slash CORE",
  },
];
