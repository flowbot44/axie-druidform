import Phaser from "phaser";
import type { TouchKind } from "../config/touch.ts";

type ActionFn = (kind: TouchKind, slot?: number) => void;

/**
 * Left stick + right kit/forms. Screen space; lives on HUDScene.
 */
export class TouchControls {
  dir = { x: 0, y: 0 };
  private stickId: number | null = null;
  private readonly stickX: number;
  private readonly stickY: number;
  private readonly stickR = 72;
  private readonly knob: Phaser.GameObjects.Arc;
  private readonly scene: Phaser.Scene;

  constructor(scene: Phaser.Scene, onAction: ActionFn) {
    this.scene = scene;
    const w = scene.cameras.main.width;
    const h = scene.cameras.main.height;
    this.stickX = 110;
    this.stickY = h - 118;

    scene.add.circle(this.stickX, this.stickY, this.stickR, 0x000000, 0.32).setDepth(5);
    scene.add
      .circle(this.stickX, this.stickY, this.stickR, 0x000000, 0)
      .setStrokeStyle(2, 0xd4c4a0, 0.55)
      .setDepth(5);
    this.knob = scene.add.circle(this.stickX, this.stickY, 28, 0xd4c4a0, 0.85);
    this.knob.setDepth(6);

    const right = w - 86;
    const by = h - 118;
    this.btn(right, by - 88, 42, "Kit", 0xffd54f, () => onAction("kit"));
    this.btn(right - 88, by, 34, "Fuse", 0xce93d8, () => onAction("fuse"));
    this.btn(right, by, 34, "Park", 0xff7043, () => onAction("park"));
    this.btn(right - 176, by - 88, 30, "Bear", 0xbcaaa4, () => onAction("bear"));
    this.btn(right - 176, by, 30, "Cat", 0xff9800, () => onAction("cat"));
    this.btn(right - 88, by - 88, 30, "Hawk", 0x42a5f5, () => onAction("hawk"));

    scene.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (this.stickId !== null) return;
      if (this.inStick(p.x, p.y)) {
        this.stickId = p.id;
        this.pull(p.x, p.y);
      }
    });
    scene.input.on("pointerup", (p: Phaser.Input.Pointer) => {
      if (p.id !== this.stickId) return;
      this.stickId = null;
      this.dir = { x: 0, y: 0 };
      this.knob.setPosition(this.stickX, this.stickY);
    });
  }

  update(): void {
    if (this.stickId === null) return;
    const pointers = this.scene.input.manager.pointers;
    const p = pointers.find((pt) => pt.id === this.stickId);
    if (!p || !p.isDown) {
      this.stickId = null;
      this.dir = { x: 0, y: 0 };
      this.knob.setPosition(this.stickX, this.stickY);
      return;
    }
    this.pull(p.x, p.y);
  }

  private inStick(x: number, y: number): boolean {
    const dx = x - this.stickX;
    const dy = y - this.stickY;
    return dx * dx + dy * dy <= (this.stickR + 24) * (this.stickR + 24);
  }

  private pull(x: number, y: number): void {
    let dx = x - this.stickX;
    let dy = y - this.stickY;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const cap = Math.min(len, this.stickR - 8);
    dx = (dx / len) * cap;
    dy = (dy / len) * cap;
    this.knob.setPosition(this.stickX + dx, this.stickY + dy);
    const nx = dx / (this.stickR - 8);
    const ny = dy / (this.stickR - 8);
    const dead = 0.18;
    this.dir = {
      x: Math.abs(nx) < dead ? 0 : nx,
      y: Math.abs(ny) < dead ? 0 : ny,
    };
  }

  private btn(
    x: number,
    y: number,
    r: number,
    label: string,
    color: number,
    onDown: () => void,
  ): void {
    const g = this.scene.add.circle(x, y, r, color, 0.28);
    g.setStrokeStyle(2, color, 0.9);
    g.setDepth(5);
    g.setInteractive({ useHandCursor: true });
    g.on("pointerdown", (p: Phaser.Input.Pointer) => {
      p.event.stopPropagation();
      g.setFillStyle(color, 0.55);
      onDown();
    });
    g.on("pointerup", () => g.setFillStyle(color, 0.28));
    g.on("pointerout", () => g.setFillStyle(color, 0.28));
    this.scene.add
      .text(x, y, label, {
        fontSize: r > 36 ? "16px" : "12px",
        color: "#ffffff",
        fontFamily: "monospace",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(6);
  }
}
