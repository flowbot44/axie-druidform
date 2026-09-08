/** Tile & room dimensions (GDD §6) */
export const TILE_SIZE = 32;
export const ROOM_WIDTH = 20; // tiles
export const ROOM_HEIGHT = 11; // tiles

/** Movement (GDD §6, §9) */
export const PLAYER_SPEED = 160; // px/sec — smooth at 32px tiles

/** Energy (GDD §9) */
export const STARTING_ENERGY = 100;

/** Tile visual colors */
export const FLOOR_COLOR = 0x3a3a52;
export const WALL_COLOR = 0x1a1a2e;
export const WALL_ACCENT = 0x2a2a3e;
export const GRID_LINE_COLOR = 0x44445e;

/** Tile indices used in room layout arrays */
export const TILE_FLOOR = 0;
export const TILE_WALL = 1;

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

/** Room 1 — Entry Hall. Simple bordered room for Step 1. */
export const ROOM_1: number[][] = [
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
