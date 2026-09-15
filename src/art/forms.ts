import { canvasTexture, P, px } from "./paint.ts";

/** Ghost shells — hollow torso so the fireteam portraits sit inside. */
export function registerFormTextures(scene: Phaser.Scene): void {
  canvasTexture(scene, "form-shell-bear", 48, 48, formBear);
  canvasTexture(scene, "form-shell-cat", 48, 48, formCat);
  canvasTexture(scene, "form-shell-hawk", 48, 48, formHawk);
}

function formBear(ctx: CanvasRenderingContext2D): void {
  const rim = P.goldDk;
  const glass = "rgba(176, 122, 48, 0.28)";
  px(ctx, 12, 16, glass, 24, 20);
  px(ctx, 10, 18, glass, 28, 16);
  px(ctx, 14, 12, glass, 20, 8);
  px(ctx, 8, 8, glass, 8, 8);
  px(ctx, 32, 8, glass, 8, 8);
  outline(ctx, 8, 8, 8, 8, rim);
  outline(ctx, 32, 8, 8, 8, rim);
  outline(ctx, 10, 14, 28, 24, rim);
  ctx.clearRect(16, 18, 16, 12);
  px(ctx, 12, 34, rim, 6, 8);
  px(ctx, 30, 34, rim, 6, 8);
  px(ctx, 36, 22, P.cream, 6, 5);
  px(ctx, 40, 24, P.ink, 2, 2);
}

function formCat(ctx: CanvasRenderingContext2D): void {
  const rim = P.ember;
  const glass = "rgba(255, 152, 0, 0.26)";
  px(ctx, 12, 16, glass, 22, 16);
  px(ctx, 10, 18, glass, 26, 12);
  px(ctx, 14, 8, glass, 6, 12);
  px(ctx, 26, 8, glass, 6, 12);
  outline(ctx, 14, 6, 6, 12, rim);
  outline(ctx, 26, 6, 6, 12, rim);
  outline(ctx, 10, 14, 26, 18, rim);
  ctx.clearRect(16, 18, 14, 10);
  px(ctx, 12, 32, rim, 5, 8);
  px(ctx, 26, 32, rim, 5, 8);
  px(ctx, 34, 20, rim, 10, 4);
  px(ctx, 40, 18, rim, 4, 8);
}

function formHawk(ctx: CanvasRenderingContext2D): void {
  const rim = "#2a6aaa";
  const glass = "rgba(66, 165, 245, 0.26)";
  px(ctx, 16, 16, glass, 16, 14);
  px(ctx, 2, 16, glass, 14, 6);
  px(ctx, 32, 16, glass, 14, 6);
  outline(ctx, 2, 14, 16, 10, rim);
  outline(ctx, 30, 14, 16, 10, rim);
  outline(ctx, 16, 12, 16, 18, rim);
  ctx.clearRect(20, 18, 10, 8);
  px(ctx, 32, 18, P.gold, 8, 4);
  px(ctx, 38, 19, P.goldDk, 4, 3);
  px(ctx, 18, 32, rim, 5, 8);
  px(ctx, 26, 32, rim, 5, 8);
}

function outline(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  color: string,
): void {
  px(ctx, x, y, color, w, 2);
  px(ctx, x, y + h - 2, color, w, 2);
  px(ctx, x, y, color, 2, h);
  px(ctx, x + w - 2, y, color, 2, h);
}
