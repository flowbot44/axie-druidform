import Phaser from "phaser";
import { canvasTexture, fill, hash01, P, px, stamp } from "./paint.ts";
import { registerFormTextures } from "./forms.ts";

const T = 32;

type ThemePal = {
  floor: string;
  floorHi: string;
  floorLo: string;
  brick: string;
  brickHi: string;
  brickLo: string;
};

/** Per-room palettes in the ALttP dungeon register — original colors, not Nintendo tiles. */
const THEMES: Record<number, ThemePal> = {
  1: {
    floor: "#3a6a44",
    floorHi: "#5a8f54",
    floorLo: "#244830",
    brick: "#2a3e2c",
    brickHi: "#4a6250",
    brickLo: "#121c14",
  },
  2: {
    floor: "#2e5470",
    floorHi: "#4a78a0",
    floorLo: "#1a3848",
    brick: "#243448",
    brickHi: "#3a5068",
    brickLo: "#0e1820",
  },
  3: {
    floor: "#8a6a40",
    floorHi: "#b08a54",
    floorLo: "#5a4428",
    brick: "#5a4030",
    brickHi: "#7a5a40",
    brickLo: "#24180c",
  },
  4: {
    floor: "#4a3858",
    floorHi: "#6a5080",
    floorLo: "#2a2038",
    brick: "#342444",
    brickHi: "#4a3860",
    brickLo: "#100c18",
  },
  5: {
    floor: "#6a6850",
    floorHi: "#8a8868",
    floorLo: "#444030",
    brick: "#3e3c48",
    brickHi: "#5a5868",
    brickLo: "#18161c",
  },
};

function pal(theme: number): ThemePal {
  return THEMES[theme] ?? THEMES[1]!;
}

function diamond(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string): void {
  for (let y = -r; y <= r; y++) {
    const w = r - Math.abs(y);
    px(ctx, cx - w, cy + y, color, w * 2 + 1, 1);
  }
}

function floorTile(ctx: CanvasRenderingContext2D, variant: number, theme: number): void {
  const t = pal(theme);
  fill(ctx, t.floorLo);
  px(ctx, 2, 2, t.floor, 28, 28);
  px(ctx, 2, 2, t.floorHi, 28, 1);
  if (variant % 2 === 0) {
    diamond(ctx, 16, 16, 9, t.floorLo);
    diamond(ctx, 16, 16, 7, t.floorHi);
    diamond(ctx, 16, 14, 3, t.floor);
  } else {
    px(ctx, 11, 11, t.floorLo, 10, 10);
    px(ctx, 12, 12, t.floorHi, 8, 8);
    px(ctx, 15, 15, t.floorLo, 2, 2);
  }
}

function wallTile(ctx: CanvasRenderingContext2D, _variant: number, theme: number): void {
  const t = pal(theme);
  fill(ctx, t.brickLo);
  for (let row = 0; row < 4; row++) {
    const y = row * 8;
    const shift = (row % 2) * 8;
    for (let x = shift - 16; x < T; x += 16) {
      const bx = Math.max(0, x + 1);
      const ex = Math.min(T, x + 15);
      if (ex <= bx) continue;
      px(ctx, bx, y + 1, t.brick, ex - bx, 6);
      px(ctx, bx, y + 1, t.brickHi, ex - bx, 1);
    }
  }
  px(ctx, 0, 0, t.brickHi, T, 2);
}

function pitTile(ctx: CanvasRenderingContext2D, variant: number, theme: number): void {
  fill(ctx, P.void);
  if (hash01(variant, theme, 7) > 0.82) px(ctx, 10 + (variant % 12), 14 + (variant % 8), P.creamDk);
}

function vineFill(ctx: CanvasRenderingContext2D): void {
  fill(ctx, P.mossDk);
  for (let y = 2; y < T; y += 6) {
    px(ctx, 0, y, P.thorn, T, 3);
    px(ctx, 0, y + 1, P.leaf, T, 1);
  }
  px(ctx, 6, 0, P.bark, 3, T);
  px(ctx, 22, 0, P.barkLt, 2, T);
}

function bridgeFill(ctx: CanvasRenderingContext2D): void {
  fill(ctx, P.barkDk);
  for (let y = 0; y < T; y += 8) {
    px(ctx, 0, y, P.wood, T, 6);
    px(ctx, 0, y + 1, P.woodLt, T, 1);
    px(ctx, 0, y + 6, P.barkDk, T, 2);
    px(ctx, 8, y, P.bark, 1, 6);
    px(ctx, 20, y, P.bark, 1, 6);
  }
}

function particleDot(ctx: CanvasRenderingContext2D): void {
  px(ctx, 0, 0, P.white, 2, 2);
}

export function registerDungeonTextures(scene: Phaser.Scene): void {
  for (let theme = 1; theme <= 5; theme++) {
    for (let v = 0; v < 2; v++) {
      canvasTexture(scene, `tile-floor-${theme}-${v}`, T, T, (ctx) => floorTile(ctx, v, theme));
    }
    canvasTexture(scene, `tile-wall-${theme}-0`, T, T, (ctx) => wallTile(ctx, 0, theme));
    canvasTexture(scene, `tile-pit-${theme}-0`, T, T, (ctx) => pitTile(ctx, 0, theme));
  }
  canvasTexture(scene, "tile-vine", T, T, vineFill);
  canvasTexture(scene, "tile-bridge", T, T, bridgeFill);
  canvasTexture(scene, "px-dot", 2, 2, particleDot);

  canvasTexture(scene, "dec-mushroom", 12, 14, mushroom);
  canvasTexture(scene, "dec-tuft", 10, 8, tuft);
  canvasTexture(scene, "dec-rock", 12, 8, rock);
  canvasTexture(scene, "dec-lantern", 12, 20, torch);
  canvasTexture(scene, "dec-hang", 10, 22, hangVine);
  canvasTexture(scene, "dec-root", 18, 10, rootCurl);
  canvasTexture(scene, "dec-leaf", 8, 6, fallenLeaf);
  canvasTexture(scene, "dec-pot", 14, 16, pot);
  canvasTexture(scene, "dec-torch", 12, 20, torch);
  canvasTexture(scene, "door-w", T, T, doorWest);
  canvasTexture(scene, "door-e", T, T, doorEast);
  canvasTexture(scene, "shadow-n", T, 4, shadowN);

  canvasTexture(scene, "prop-bramble", T, T, bramble);
  canvasTexture(scene, "prop-gate", T, T, gateShut);
  canvasTexture(scene, "prop-gate-open", T, T, gateOpen);
  canvasTexture(scene, "prop-plate-off", T, T, plate(false));
  canvasTexture(scene, "prop-plate-on", T, T, plate(true));
  canvasTexture(scene, "prop-lever-off", 22, 32, lever(false));
  canvasTexture(scene, "prop-lever-on", 22, 32, lever(true));
  canvasTexture(scene, "prop-crystal-idle", 24, 40, crystal("idle"));
  canvasTexture(scene, "prop-crystal-ok", 24, 40, crystal("ok"));
  canvasTexture(scene, "prop-crystal-bad", 24, 40, crystal("bad"));
  canvasTexture(scene, "prop-eye-bird-idle", 32, 32, birdEye("idle"));
  canvasTexture(scene, "prop-eye-bird-ok", 32, 32, birdEye("ok"));
  canvasTexture(scene, "prop-eye-bird-bad", 32, 32, birdEye("bad"));
  canvasTexture(scene, "prop-eye-hawk-idle", 32, 32, hawkEye("idle"));
  canvasTexture(scene, "prop-eye-hawk-ok", 32, 32, hawkEye("ok"));
  canvasTexture(scene, "prop-eye-hawk-bad", 32, 32, hawkEye("bad"));
  canvasTexture(scene, "prop-whip", 32, 96, whip);
  canvasTexture(scene, "prop-whip-open", 32, 96, whipOpen);
  canvasTexture(scene, "prop-anchor-off", T, T, anchor(false));
  canvasTexture(scene, "prop-anchor-on", T, T, anchor(true));
  canvasTexture(scene, "prop-core", 28, 28, core(false));
  canvasTexture(scene, "prop-core-broken", 28, 28, core(true));
  canvasTexture(scene, "prop-treant", 72, 88, treant);
  canvasTexture(scene, "prop-shrine", 36, 52, shrine(false));
  canvasTexture(scene, "prop-shrine-lit", 36, 52, shrine(true));
  canvasTexture(scene, "prop-thorn", 22, 22, thornBlob);
  canvasTexture(scene, "rim-n", T, 6, (ctx) => pitRim(ctx, "n"));
  canvasTexture(scene, "rim-s", T, 6, (ctx) => pitRim(ctx, "s"));
  canvasTexture(scene, "rim-e", 6, T, (ctx) => pitRim(ctx, "e"));
  canvasTexture(scene, "rim-w", 6, T, (ctx) => pitRim(ctx, "w"));
  canvasTexture(scene, "wall-face", T, 12, wallFace);

  registerFormTextures(scene);
}

function mushroom(ctx: CanvasRenderingContext2D): void {
  stamp(
    ctx,
    ["..rrrr..", ".rrwwrr.", "rrrrrrrr", ".rrrrrr.", "...ss...", "...ss...", "..sss..."],
    { r: P.ember, w: P.emberLt, s: P.barkLt },
    2,
    3,
  );
}

function tuft(ctx: CanvasRenderingContext2D): void {
  stamp(ctx, ["..g.g.g..", ".g.ggg.g.", "ggggggggg", "...ddd..."], { g: P.leaf, d: P.mossDk }, 0, 2);
}

function rock(ctx: CanvasRenderingContext2D): void {
  stamp(ctx, ["..hhhh..", ".hssshh.", "hssssssh", ".ssddss."], { h: P.stoneHi, s: P.stoneMid, d: P.stoneDk }, 2, 2);
}

function torch(ctx: CanvasRenderingContext2D): void {
  stamp(
    ctx,
    [
      "...yy...",
      "..yeee..",
      "..yeeey.",
      "...ee...",
      "...ii...",
      "...ii...",
      "..iiii..",
      "..iiii..",
    ],
    { y: P.gold, e: P.ember, i: P.iron },
    2,
    1,
  );
}

function hangVine(ctx: CanvasRenderingContext2D): void {
  stamp(
    ctx,
    [
      "gggggggg",
      ".g.gg.g.",
      "..g..g..",
      "..g..g..",
      ".gg..g..",
      ".g...gg.",
      "gg....g.",
      "g.....g.",
      "......g.",
      ".....gg.",
      "......g.",
    ],
    { g: P.leaf },
    1,
    0,
  );
}

function rootCurl(ctx: CanvasRenderingContext2D): void {
  stamp(
    ctx,
    ["bb........", "bbb.bb....", ".bbbbbb...", "..bb..bbb.", "......bbb."],
    { b: P.bark },
    2,
    2,
  );
}

function fallenLeaf(ctx: CanvasRenderingContext2D): void {
  stamp(ctx, [".gg.", "gggg", ".gg."], { g: P.leaf }, 2, 1);
}

function pot(ctx: CanvasRenderingContext2D): void {
  stamp(
    ctx,
    [
      "..hhhh..",
      ".hbbbbh.",
      "hbbwwbbh",
      "hbbbbbbh",
      "hbbbbbbh",
      ".hbbbbh.",
      "..hhhh..",
    ],
    { h: P.stoneDk, b: "#3a6a9a", w: P.moon },
    3,
    2,
  );
}

function doorWest(ctx: CanvasRenderingContext2D): void {
  fill(ctx, "clear");
  px(ctx, 0, 0, P.stoneDk, 6, T);
  px(ctx, 1, 0, P.stoneLt, 2, T);
  px(ctx, 0, 0, P.creamDk, 6, 2);
  px(ctx, 0, 30, P.creamDk, 6, 2);
}

function doorEast(ctx: CanvasRenderingContext2D): void {
  fill(ctx, "clear");
  px(ctx, 26, 0, P.stoneDk, 6, T);
  px(ctx, 28, 0, P.stoneLt, 2, T);
  px(ctx, 26, 0, P.creamDk, 6, 2);
  px(ctx, 26, 30, P.creamDk, 6, 2);
}

function shadowN(ctx: CanvasRenderingContext2D): void {
  px(ctx, 0, 0, "#000000", T, 4);
}

function bramble(ctx: CanvasRenderingContext2D): void {
  fill(ctx, "clear");
  px(ctx, 8, 10, P.thornDk, 16, 14);
  px(ctx, 6, 12, P.thorn, 20, 12);
  px(ctx, 10, 8, P.leaf, 12, 16);
  px(ctx, 12, 10, P.leafLt, 8, 8);
  px(ctx, 4, 6, P.leaf, 6, 4);
  px(ctx, 22, 6, P.leaf, 6, 4);
  px(ctx, 2, 16, P.thornLt, 6, 3);
  px(ctx, 24, 16, P.thornLt, 6, 3);
  px(ctx, 14, 4, P.leafLt, 4, 4);
}

function gateShut(ctx: CanvasRenderingContext2D): void {
  fill(ctx, P.stoneDk);
  px(ctx, 2, 2, P.stone, 4, 28);
  px(ctx, 26, 2, P.stone, 4, 28);
  for (let y = 4; y < 28; y += 6) {
    px(ctx, 6, y, P.wood, 20, 4);
    px(ctx, 6, y, P.woodLt, 20, 1);
    px(ctx, 6, y + 4, P.barkDk, 20, 1);
  }
  px(ctx, 14, 14, P.ironLt, 4, 4);
}

function gateOpen(ctx: CanvasRenderingContext2D): void {
  fill(ctx, "clear");
  px(ctx, 2, 0, P.stone, 4, 10);
  px(ctx, 26, 0, P.stone, 4, 10);
  px(ctx, 6, 0, P.wood, 20, 6);
}

function plate(on: boolean): (ctx: CanvasRenderingContext2D) => void {
  return (ctx) => {
    fill(ctx, P.stoneDk);
    px(ctx, 2, 2, P.stone, 28, 28);
    diamond(ctx, 16, 16, 11, P.ink);
    diamond(ctx, 16, 16, 9, on ? P.mossLt : P.stoneMid);
    diamond(ctx, 16, 16, 4, on ? P.gold : P.iron);
    if (on) diamond(ctx, 16, 15, 2, P.gold);
  };
}

function lever(on: boolean): (ctx: CanvasRenderingContext2D) => void {
  return (ctx) => {
    fill(ctx, "clear");
    px(ctx, 3, 22, P.stoneDk, 16, 10);
    px(ctx, 5, 24, P.stoneLt, 12, 6);
    px(ctx, 7, 26, P.creamDk, 8, 3);
    if (on) {
      px(ctx, 12, 4, P.goldDk, 6, 20);
      px(ctx, 13, 2, P.gold, 8, 6);
      px(ctx, 14, 4, P.gold, 4, 18);
    } else {
      px(ctx, 4, 4, P.wood, 6, 20);
      px(ctx, 2, 2, P.barkLt, 8, 6);
      px(ctx, 5, 4, P.woodLt, 3, 18);
    }
  };
}

function crystal(state: "idle" | "ok" | "bad"): (ctx: CanvasRenderingContext2D) => void {
  return (ctx) => {
    const body = state === "ok" ? P.cyan : state === "bad" ? P.ember : P.crystal;
    const hi = state === "ok" ? P.white : state === "bad" ? P.emberLt : P.moon;
    fill(ctx, "clear");
    px(ctx, 6, 30, P.stoneDk, 12, 10);
    px(ctx, 8, 32, P.stoneLt, 8, 6);
    px(ctx, 0, 28, P.leaf, 8, 4);
    px(ctx, 16, 28, P.leaf, 8, 4);
    px(ctx, 2, 26, P.leafLt, 4, 3);
    px(ctx, 18, 26, P.leafLt, 4, 3);
    diamond(ctx, 12, 16, 10, body);
    diamond(ctx, 12, 16, 6, hi);
    diamond(ctx, 12, 14, 3, body);
  };
}

function birdEye(state: "idle" | "ok" | "bad"): (ctx: CanvasRenderingContext2D) => void {
  return (ctx) => {
    const iris = state === "ok" ? P.leafLt : state === "bad" ? P.ember : P.cyan;
    fill(ctx, "clear");
    px(ctx, 0, 10, P.leaf, 8, 10);
    px(ctx, 1, 8, P.leafLt, 6, 6);
    px(ctx, 24, 10, P.leaf, 8, 10);
    px(ctx, 25, 8, P.leafLt, 6, 6);
    px(ctx, 8, 6, P.stoneDk, 16, 20);
    px(ctx, 10, 8, P.stone, 12, 16);
    px(ctx, 10, 8, P.stoneHi, 12, 2);
    diamond(ctx, 16, 15, 6, iris);
    diamond(ctx, 16, 15, 3, P.white);
    px(ctx, 15, 14, P.ink, 2, 2);
    px(ctx, 14, 24, P.gold, 4, 4);
    px(ctx, 15, 28, P.goldDk, 2, 3);
  };
}

function hawkEye(state: "idle" | "ok" | "bad"): (ctx: CanvasRenderingContext2D) => void {
  return (ctx) => {
    const iris = state === "ok" ? P.leafLt : state === "bad" ? P.ember : P.gold;
    fill(ctx, "clear");
    px(ctx, 4, 4, P.stoneDk, 24, 24);
    px(ctx, 6, 6, P.stone, 20, 18);
    px(ctx, 6, 6, P.stoneHi, 20, 2);
    px(ctx, 8, 8, P.barkDk, 16, 3);
    diamond(ctx, 16, 14, 7, iris);
    diamond(ctx, 16, 14, 4, P.white);
    px(ctx, 15, 13, P.ink, 3, 3);
    px(ctx, 18, 22, P.goldDk, 10, 6);
    px(ctx, 22, 24, P.gold, 8, 4);
    px(ctx, 26, 26, P.gold, 4, 3);
  };
}

function whip(ctx: CanvasRenderingContext2D): void {
  fill(ctx, "clear");
  px(ctx, 8, 0, P.barkDk, 16, 96);
  px(ctx, 10, 0, P.bark, 12, 96);
  px(ctx, 12, 4, P.barkLt, 4, 88);
  for (let y = 8; y < 90; y += 12) {
    px(ctx, 0, y, P.bark, 12, 5);
    px(ctx, 0, y + 1, P.leaf, 10, 3);
    px(ctx, 20, y + 6, P.barkLt, 12, 5);
    px(ctx, 22, y + 7, P.leaf, 10, 3);
  }
  px(ctx, 4, 0, P.mossLt, 24, 8);
  px(ctx, 8, 2, P.leaf, 16, 4);
}

function whipOpen(ctx: CanvasRenderingContext2D): void {
  fill(ctx, "clear");
  px(ctx, 4, 0, P.bark, 8, 22);
  px(ctx, 20, 0, P.barkLt, 8, 18);
  px(ctx, 6, 0, P.leaf, 6, 12);
  px(ctx, 22, 2, P.leaf, 5, 10);
}

function anchor(on: boolean): (ctx: CanvasRenderingContext2D) => void {
  return (ctx) => {
    fill(ctx, P.stoneDk);
    px(ctx, 2, 2, P.stone, 28, 28);
    px(ctx, 4, 4, on ? P.mossMid : P.stoneMid, 24, 24);
    px(ctx, 6, 2, on ? P.gold : P.ironLt, 4, 8);
    px(ctx, 22, 2, on ? P.gold : P.ironLt, 4, 8);
    px(ctx, 6, 22, on ? P.gold : P.ironLt, 4, 8);
    px(ctx, 22, 22, on ? P.gold : P.ironLt, 4, 8);
    px(ctx, 10, 12, on ? P.leafLt : P.bark, 12, 8);
    px(ctx, 12, 10, on ? P.leafLt : P.barkLt, 8, 12);
  };
}

function core(broken: boolean): (ctx: CanvasRenderingContext2D) => void {
  return (ctx) => {
    fill(ctx, "clear");
    px(ctx, 6, 8, P.barkDk, 16, 16);
    const body = broken ? P.stoneLt : P.ember;
    const hi = broken ? P.moon : P.emberLt;
    diamond(ctx, 14, 14, 9, body);
    diamond(ctx, 14, 13, 5, hi);
    if (broken) {
      px(ctx, 10, 8, P.ink, 2, 12);
      px(ctx, 16, 10, P.ink, 2, 10);
    }
  };
}

function treant(ctx: CanvasRenderingContext2D): void {
  fill(ctx, "clear");
  px(ctx, 10, 8, P.thornDk, 52, 32);
  px(ctx, 6, 14, P.thorn, 60, 24);
  px(ctx, 18, 4, P.thorn, 36, 8);
  px(ctx, 16, 2, P.leaf, 40, 22);
  px(ctx, 22, 0, P.leafLt, 28, 12);
  px(ctx, 4, 16, P.leaf, 14, 14);
  px(ctx, 54, 14, P.leaf, 14, 16);
  px(ctx, 12, 22, P.leafLt, 10, 6);
  px(ctx, 28, 26, P.barkDk, 18, 54);
  px(ctx, 30, 28, P.bark, 14, 50);
  px(ctx, 32, 30, P.barkLt, 5, 44);
  px(ctx, 31, 38, P.gold, 5, 6);
  px(ctx, 40, 38, P.gold, 5, 6);
  px(ctx, 33, 40, P.ink, 2, 3);
  px(ctx, 42, 40, P.ink, 2, 3);
  px(ctx, 34, 50, P.barkDk, 10, 4);
  px(ctx, 36, 51, P.ink, 6, 2);
  px(ctx, 4, 72, P.bark, 28, 8);
  px(ctx, 42, 70, P.bark, 26, 10);
  px(ctx, 0, 78, P.barkDk, 16, 6);
  px(ctx, 56, 76, P.barkDk, 16, 8);
  px(ctx, 18, 80, P.moss, 36, 8);
}

function shrine(lit: boolean): (ctx: CanvasRenderingContext2D) => void {
  return (ctx) => {
    fill(ctx, "clear");
    px(ctx, 2, 44, P.stoneDk, 32, 8);
    px(ctx, 6, 16, P.stone, 24, 32);
    px(ctx, 8, 18, P.stoneLt, 5, 28);
    px(ctx, 4, 14, P.stoneMid, 28, 6);
    const disc = lit ? P.gold : P.cream;
    diamond(ctx, 18, 10, 10, disc);
    diamond(ctx, 18, 10, 6, lit ? P.white : P.stoneHi);
    px(ctx, 16, 22, lit ? P.gold : P.goldDk, 4, 22);
    if (lit) {
      px(ctx, 8, 28, P.gold, 20, 2);
      px(ctx, 8, 36, P.gold, 20, 2);
      diamond(ctx, 18, 10, 3, P.gold);
    }
  };
}

function thornBlob(ctx: CanvasRenderingContext2D): void {
  px(ctx, 4, 4, P.thorn, 14, 14);
  px(ctx, 6, 6, P.leaf, 8, 8);
  px(ctx, 0, 8, P.leafLt, 4, 3);
  px(ctx, 16, 4, P.leaf, 4, 3);
}

function pitRim(ctx: CanvasRenderingContext2D, dir: "n" | "s" | "e" | "w"): void {
  const lip = P.cream;
  const dark = P.creamDk;
  if (dir === "n") {
    px(ctx, 0, 0, dark, T, 6);
    px(ctx, 0, 4, lip, T, 2);
  } else if (dir === "s") {
    px(ctx, 0, 0, lip, T, 2);
    px(ctx, 0, 2, dark, T, 4);
  } else if (dir === "w") {
    px(ctx, 0, 0, dark, 6, T);
    px(ctx, 4, 0, lip, 2, T);
  } else {
    px(ctx, 0, 0, lip, 2, T);
    px(ctx, 2, 0, dark, 4, T);
  }
}

function wallFace(ctx: CanvasRenderingContext2D): void {
  px(ctx, 0, 0, P.creamDk, T, 12);
  px(ctx, 0, 1, P.cream, T, 2);
  px(ctx, 0, 8, P.barkDk, T, 4);
  px(ctx, 8, 3, P.bark, 1, 6);
  px(ctx, 24, 3, P.bark, 1, 6);
}
