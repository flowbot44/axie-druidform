export function wantsTouch(): boolean {
  if (typeof navigator === "undefined") return false;
  return navigator.maxTouchPoints > 0 || "ontouchstart" in window;
}

export type TouchKind =
  | "kit"
  | "fuse"
  | "park"
  | "bear"
  | "cat"
  | "hawk"
  | "slot";

export interface TouchAction {
  t: number;
  kind: TouchKind;
  slot?: number;
}
