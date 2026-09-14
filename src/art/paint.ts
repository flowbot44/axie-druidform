import Phaser from "phaser";

/** Deterministic 0..1 noise for tile variants. */
export function hash01(x: number, y: number, n = 0): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(n, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function canvasTexture(
  scene: Phaser.Scene,
  key: string,
  w: number,
  h: number,
  draw: (ctx: CanvasRenderingContext2D) => void,
): void {
  if (scene.textures.exists(key)) return;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error(`2d context failed for ${key}`);
  ctx.imageSmoothingEnabled = false;
  draw(ctx);
  const tex = scene.textures.addCanvas(key, c);
  if (!tex) throw new Error(`texture ${key} failed`);
  tex.setFilter(Phaser.Textures.FilterMode.NEAREST);
}

export function px(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  color: string,
  w = 1,
  h = 1,
): void {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

export function fill(ctx: CanvasRenderingContext2D, color: string, x = 0, y = 0, w?: number, h?: number): void {
  if (color === "clear") {
    ctx.clearRect(x, y, w ?? ctx.canvas.width, h ?? ctx.canvas.height);
    return;
  }
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w ?? ctx.canvas.width, h ?? ctx.canvas.height);
}

/** Stamp a row-string sprite. `.` = skip. Keys map to hex colors. */
export function stamp(
  ctx: CanvasRenderingContext2D,
  rows: readonly string[],
  palette: Record<string, string>,
  ox = 0,
  oy = 0,
): void {
  for (let y = 0; y < rows.length; y++) {
    const row = rows[y] ?? "";
    for (let x = 0; x < row.length; x++) {
      const ch = row[x] ?? ".";
      if (ch === ".") continue;
      const color = palette[ch];
      if (!color) continue;
      px(ctx, ox + x, oy + y, color);
    }
  }
}

export function ghostBody(obj: Phaser.GameObjects.Rectangle | Phaser.GameObjects.Arc): void {
  obj.setFillStyle(0x000000, 0);
  if ("setStrokeStyle" in obj) obj.setStrokeStyle(0, 0x000000, 0);
}

export function idlePulse(scene: Phaser.Scene, target: Phaser.GameObjects.Image): void {
  scene.tweens.add({
    targets: target,
    alpha: { from: 1, to: 0.7 },
    duration: 640,
    yoyo: true,
    repeat: -1,
  });
}

export const P = {
  void: "#07060f",
  abyss: "#0b0e1a",
  abyss2: "#12182a",
  abyssGlow: "#2a2450",
  mossDk: "#15261c",
  moss: "#1f3a28",
  mossMid: "#2c5338",
  mossLt: "#3e7348",
  leaf: "#5a9a4a",
  leafLt: "#86c45e",
  grout: "#101810",
  stoneDk: "#161820",
  stone: "#232836",
  stoneMid: "#323848",
  stoneLt: "#4a5268",
  stoneHi: "#6a7388",
  barkDk: "#24180f",
  bark: "#3a2818",
  barkLt: "#5c4030",
  wood: "#6a4a32",
  woodLt: "#8a6444",
  gold: "#e0b84a",
  goldDk: "#a07828",
  cyan: "#6ee7d8",
  cyanDk: "#2a8a88",
  moon: "#c5d4e8",
  thornDk: "#14220f",
  thorn: "#2a4a1c",
  thornLt: "#4e7a32",
  purple: "#4a3068",
  purpleLt: "#7a58a8",
  crystal: "#c4a0ff",
  ember: "#ff7043",
  emberLt: "#ffab91",
  iron: "#3a4048",
  ironLt: "#8a949c",
  bell: "#d4c8a0",
  bellDk: "#8a7a50",
  white: "#f4f0e8",
  ink: "#0a0c10",
  cream: "#d4c4a0",
  creamDk: "#8a7048",
} as const;
