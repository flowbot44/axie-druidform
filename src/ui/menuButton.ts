import Phaser from "phaser";

export interface PlateButton {
  bg: Phaser.GameObjects.Rectangle;
  text: Phaser.GameObjects.Text;
  setLabel: (label: string) => void;
  setArmed: (on: boolean) => void;
}

/**
 * Stone plate with gold rim. Shared by collection / victory / board / retry.
 */
export function plateButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  label: string,
  onClick: () => void,
  opts?: {
    width?: number;
    height?: number;
    stroke?: number;
    fill?: number;
    color?: string;
    fontSize?: string;
    depth?: number;
  },
): PlateButton {
  const width = opts?.width ?? 260;
  const height = opts?.height ?? 52;
  const fill = opts?.fill ?? 0x1c1810;
  const stroke = opts?.stroke ?? 0xd4c4a0;
  const depth = opts?.depth ?? 8;
  const bg = scene.add.rectangle(x, y, width, height, fill, 0.94);
  bg.setStrokeStyle(2, stroke, 0.95);
  bg.setDepth(depth);
  bg.setInteractive({ useHandCursor: true });

  const text = scene.add
    .text(x, y, label, {
      fontSize: opts?.fontSize ?? "18px",
      color: opts?.color ?? "#f5e6c8",
      fontFamily: "monospace",
      fontStyle: "bold",
    })
    .setOrigin(0.5)
    .setDepth(depth + 1);

  const rest = () => {
    bg.setScale(1);
    bg.setFillStyle(fill, 0.94);
  };
  bg.on("pointerdown", () => {
    bg.setScale(0.97);
    bg.setFillStyle(fill, 1);
    onClick();
  });
  bg.on("pointerup", rest);
  bg.on("pointerout", rest);

  return {
    bg,
    text,
    setLabel: (next) => {
      text.setText(next);
    },
    setArmed: (on) => {
      bg.setAlpha(on ? 1 : 0.55);
      bg.setStrokeStyle(2, on ? stroke : 0x5a5346, on ? 0.95 : 0.6);
      text.setAlpha(on ? 1 : 0.55);
    },
  };
}
