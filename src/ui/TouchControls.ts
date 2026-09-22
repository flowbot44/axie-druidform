import Phaser from "phaser";
import type { TouchKind } from "../config/touch.ts";

type ActionFn = (kind: TouchKind, slot?: number) => void;

const GOLD = 0xd4c4a0;
const STONE = 0x1c1810;
const WELL = 0x0c0a08;
const DEPTH = 12;

type FormKey = "bear" | "cat" | "hawk";

interface PadBtn {
  kind: TouchKind;
  well: Phaser.GameObjects.Arc;
  rim: Phaser.GameObjects.Arc;
  icon: Phaser.GameObjects.Graphics;
  label: Phaser.GameObjects.Text;
  accent: number;
}

/**
 * Landscape thumb pad. Stone wells, gold rims, icons — not candy circles.
 */
export class TouchControls {
  dir = { x: 0, y: 0 };
  private stickId: number | null = null;
  private readonly stickX: number;
  private readonly stickY: number;
  private readonly stickR = 98;
  private readonly knob: Phaser.GameObjects.Arc;
  private readonly knobHi: Phaser.GameObjects.Arc;
  private stickRim!: Phaser.GameObjects.Arc;
  private readonly scene: Phaser.Scene;
  private readonly forms = new Map<FormKey, PadBtn>();

  constructor(scene: Phaser.Scene, onAction: ActionFn) {
    this.scene = scene;
    const w = scene.cameras.main.width;
    const h = scene.cameras.main.height;
    this.stickX = 128;
    this.stickY = h - 148;

    this.drawStick();
    this.knob = scene.add.circle(this.stickX, this.stickY, 36, GOLD, 0.92);
    this.knob.setStrokeStyle(3, 0xf3e6c8, 0.7);
    this.knob.setDepth(DEPTH + 2);
    this.knobHi = scene.add.circle(this.stickX - 8, this.stickY - 10, 10, 0xfff6de, 0.35);
    this.knobHi.setDepth(DEPTH + 3);

    const cx = w - 176;
    const kitY = h - 138;

    this.btn(cx, kitY, 58, "kit", "KIT", 0xe0b84a, onAction);
    this.btn(cx - 118, kitY - 4, 44, "fuse", "FUSE", 0xce93d8, onAction);
    this.btn(cx + 118, kitY - 4, 44, "park", "PARK", 0xff8a65, onAction);

    scene.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (this.stickId !== null) return;
      if (this.inStick(p.x, p.y)) {
        this.stickId = p.id;
        this.pull(p.x, p.y);
      }
    });
    scene.input.on("pointerup", (p: Phaser.Input.Pointer) => {
      if (p.id !== this.stickId) return;
      this.resetStick();
    });
  }

  setActiveForm(tag: string): void {
    const key = tag.toLowerCase() as FormKey;
    for (const [form, btn] of this.forms) {
      const on = form === key;
      btn.rim.setStrokeStyle(on ? 3.5 : 2.5, on ? 0xfff3c4 : GOLD, on ? 1 : 0.8);
      btn.well.setFillStyle(STONE, on ? 0.98 : 0.88);
    }
  }

  update(): void {
    if (this.stickId === null) return;
    const p = this.scene.input.manager.pointers.find((pt) => pt.id === this.stickId);
    if (!p || !p.isDown) {
      this.resetStick();
      return;
    }
    this.pull(p.x, p.y);
  }

  private drawStick(): void {
    const s = this.scene;
    s.add.circle(this.stickX + 4, this.stickY + 6, this.stickR + 4, 0x000000, 0.35).setDepth(DEPTH);
    s.add.circle(this.stickX, this.stickY, this.stickR, STONE, 0.9).setDepth(DEPTH);
    this.stickRim = s.add.circle(this.stickX, this.stickY, this.stickR - 3, STONE, 0);
    this.stickRim.setStrokeStyle(3, GOLD, 0.85);
    this.stickRim.setDepth(DEPTH + 1);
    s.add.circle(this.stickX, this.stickY, this.stickR - 18, WELL, 0.92).setDepth(DEPTH + 1);

    const ticks = s.add.graphics().setDepth(DEPTH + 1);
    ticks.lineStyle(2, GOLD, 0.35);
    for (const a of [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]) {
      const inner = this.stickR - 28;
      const outer = this.stickR - 20;
      ticks.lineBetween(
        this.stickX + Math.cos(a) * inner,
        this.stickY + Math.sin(a) * inner,
        this.stickX + Math.cos(a) * outer,
        this.stickY + Math.sin(a) * outer,
      );
    }
  }

  private btn(
    x: number,
    y: number,
    r: number,
    kind: TouchKind,
    caption: string,
    accent: number,
    onAction: ActionFn,
  ): PadBtn {
    const s = this.scene;
    s.add.circle(x + 3, y + 5, r + 2, 0x000000, 0.32).setDepth(DEPTH);
    const well = s.add.circle(x, y, r, STONE, 0.9);
    well.setDepth(DEPTH + 1);
    const rim = s.add.circle(x, y, r - 2, STONE, 0);
    rim.setStrokeStyle(2.5, GOLD, 0.88);
    rim.setDepth(DEPTH + 2);
    s.add.circle(x, y, r - 10, accent, 0.16).setDepth(DEPTH + 2);

    const icon = s.add.graphics();
    icon.setPosition(x, y);
    icon.setDepth(DEPTH + 3);
    drawIcon(icon, kind, accent);

    const label = s.add
      .text(x, y + r + 12, caption, {
        fontSize: "11px",
        color: "#e8d9b0",
        fontFamily: "monospace",
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0)
      .setDepth(DEPTH + 3);

    well.setInteractive({ useHandCursor: true });
    const press = () => {
      well.setScale(0.94);
      rim.setScale(0.94);
      icon.setScale(0.94);
      onAction(kind);
    };
    const rest = () => {
      well.setScale(1);
      rim.setScale(1);
      icon.setScale(1);
    };
    well.on("pointerdown", (p: Phaser.Input.Pointer) => {
      p.event.stopPropagation();
      press();
    });
    well.on("pointerup", rest);
    well.on("pointerout", rest);

    const pad: PadBtn = { kind, well, rim, icon, label, accent };
    return pad;
  }

  private inStick(x: number, y: number): boolean {
    const dx = x - this.stickX;
    const dy = y - this.stickY;
    const reach = this.stickR + 28;
    return dx * dx + dy * dy <= reach * reach;
  }

  private pull(x: number, y: number): void {
    let dx = x - this.stickX;
    let dy = y - this.stickY;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const cap = Math.min(len, this.stickR - 22);
    dx = (dx / len) * cap;
    dy = (dy / len) * cap;
    this.knob.setPosition(this.stickX + dx, this.stickY + dy);
    this.knobHi.setPosition(this.stickX + dx - 8, this.stickY + dy - 10);
    const nx = dx / (this.stickR - 22);
    const ny = dy / (this.stickR - 22);
    const dead = 0.16;
    this.dir = {
      x: Math.abs(nx) < dead ? 0 : nx,
      y: Math.abs(ny) < dead ? 0 : ny,
    };
    this.stickRim.setStrokeStyle(3, 0xf3e6c8, 1);
  }

  private resetStick(): void {
    this.stickId = null;
    this.dir = { x: 0, y: 0 };
    this.knob.setPosition(this.stickX, this.stickY);
    this.knobHi.setPosition(this.stickX - 8, this.stickY - 10);
    this.stickRim.setStrokeStyle(3, GOLD, 0.85);
  }
}

function drawIcon(g: Phaser.GameObjects.Graphics, kind: TouchKind, color: number): void {
  g.clear();
  g.lineStyle(3, color, 1);
  g.fillStyle(color, 1);
  if (kind === "kit") {
    for (let i = 0; i < 4; i++) {
      const a = (Math.PI / 2) * i + Math.PI / 4;
      g.lineBetween(Math.cos(a) * 5, Math.sin(a) * 5, Math.cos(a) * 16, Math.sin(a) * 16);
    }
    g.fillCircle(0, 0, 4);
    return;
  }
  if (kind === "fuse") {
    g.strokeCircle(-7, 0, 10);
    g.strokeCircle(7, 0, 10);
    return;
  }
  if (kind === "park") {
    g.strokeRect(-9, -8, 18, 14);
    g.lineBetween(0, 6, 0, 16);
    g.fillTriangle(-5, 16, 5, 16, 0, 22);
    return;
  }
  if (kind === "bear") {
    g.beginPath();
    g.moveTo(0, -14);
    g.lineTo(12, -4);
    g.lineTo(8, 14);
    g.lineTo(-8, 14);
    g.lineTo(-12, -4);
    g.closePath();
    g.strokePath();
    return;
  }
  if (kind === "cat") {
    g.lineBetween(-14, -8, 4, 12);
    g.lineBetween(-4, -12, 14, 8);
    return;
  }
  if (kind === "hawk") {
    g.beginPath();
    g.moveTo(0, -14);
    g.lineTo(14, 6);
    g.lineTo(0, 0);
    g.lineTo(-14, 6);
    g.closePath();
    g.strokePath();
  }
}
