import { canvasTexture, P, px } from "./paint.ts";

/** Bear / Cat / Hawk bodies. Nearest-filter pixel, original tiles language. */
export function registerFormTextures(scene: Phaser.Scene): void {
  canvasTexture(scene, "form-bear", 32, 32, formBear);
  canvasTexture(scene, "form-cat", 32, 32, formCat);
  canvasTexture(scene, "form-hawk", 32, 32, formHawk);
}

function formBear(ctx: CanvasRenderingContext2D): void {
  const f = P.bark;
  const m = P.barkLt;
  const h = P.woodLt;
  const n = P.cream;
  px(ctx, 8, 10, f, 16, 14);
  px(ctx, 6, 12, f, 20, 10);
  px(ctx, 10, 8, m, 12, 4);
  px(ctx, 6, 6, f, 6, 6);
  px(ctx, 20, 6, f, 6, 6);
  px(ctx, 7, 7, m, 4, 4);
  px(ctx, 21, 7, m, 4, 4);
  px(ctx, 12, 14, n, 10, 8);
  px(ctx, 22, 16, n, 6, 5);
  px(ctx, 26, 17, P.ink, 2, 2);
  px(ctx, 11, 13, P.ink, 2, 2);
  px(ctx, 17, 13, P.ink, 2, 2);
  px(ctx, 12, 14, h, 2, 1);
  px(ctx, 18, 14, h, 2, 1);
  px(ctx, 8, 24, f, 5, 6);
  px(ctx, 19, 24, f, 5, 6);
  px(ctx, 8, 28, P.ink, 5, 2);
  px(ctx, 19, 28, P.ink, 5, 2);
}

function formCat(ctx: CanvasRenderingContext2D): void {
  const f = P.ember;
  const m = P.emberLt;
  const n = P.cream;
  px(ctx, 8, 12, f, 16, 10);
  px(ctx, 6, 14, f, 20, 8);
  px(ctx, 10, 10, f, 12, 4);
  px(ctx, 7, 4, f, 4, 8);
  px(ctx, 8, 5, m, 2, 5);
  px(ctx, 21, 4, f, 4, 8);
  px(ctx, 22, 5, m, 2, 5);
  px(ctx, 12, 14, n, 8, 6);
  px(ctx, 22, 15, f, 8, 4);
  px(ctx, 28, 16, m, 3, 2);
  px(ctx, 11, 13, P.ink, 2, 2);
  px(ctx, 16, 13, P.ink, 2, 2);
  px(ctx, 14, 17, P.ink, 3, 1);
  px(ctx, 8, 22, f, 4, 7);
  px(ctx, 18, 22, f, 4, 7);
  px(ctx, 24, 18, f, 3, 10);
  px(ctx, 25, 26, m, 2, 4);
}

function formHawk(ctx: CanvasRenderingContext2D): void {
  const f = "#3a6a9a";
  const m = "#6aa0d0";
  const w = P.moon;
  px(ctx, 10, 10, f, 12, 12);
  px(ctx, 12, 8, f, 8, 4);
  px(ctx, 2, 12, w, 10, 4);
  px(ctx, 3, 16, m, 9, 3);
  px(ctx, 20, 12, w, 10, 4);
  px(ctx, 20, 16, m, 9, 3);
  px(ctx, 4, 11, w, 6, 2);
  px(ctx, 22, 11, w, 6, 2);
  px(ctx, 14, 12, m, 6, 6);
  px(ctx, 20, 14, P.gold, 6, 3);
  px(ctx, 24, 15, P.goldDk, 3, 2);
  px(ctx, 13, 13, P.ink, 2, 2);
  px(ctx, 12, 22, f, 4, 7);
  px(ctx, 18, 22, f, 4, 7);
  px(ctx, 8, 20, w, 4, 2);
  px(ctx, 20, 20, w, 4, 2);
}
