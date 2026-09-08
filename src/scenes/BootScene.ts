import Phaser from "phaser";

/**
 * BootScene — tracer bullet proof-of-life.
 *
 * Draws the three starter Axies as colored ellipses and a status label.
 * No game logic. Just proves Phaser boots, Arcade physics init, and
 * the scene lifecycle runs.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  create(): void {
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;

    // Party slot colors from GDD §4:
    // Olek (Plant/Tank) = green, Buba (Beast/Striker) = orange, Puffy (Bird/Scout) = blue
    const party = [
      { name: "Olek — Tank", color: 0x4caf50, x: cx - 160 },
      { name: "Buba — Striker", color: 0xff9800, x: cx },
      { name: "Puffy — Scout", color: 0x42a5f5, x: cx + 160 },
    ];

    for (const axie of party) {
      // Colored ellipse body
      const gfx = this.add.graphics();
      gfx.fillStyle(axie.color, 1);
      gfx.fillEllipse(axie.x, cy, 64, 48);

      // Name label
      this.add
        .text(axie.x, cy + 44, axie.name, {
          fontSize: "14px",
          color: "#ffffff",
          fontFamily: "monospace",
        })
        .setOrigin(0.5);
    }

    // Pipeline status
    this.add
      .text(cx, cy - 120, "Axie Druidform — Totem of Lunacia", {
        fontSize: "28px",
        color: "#e0e0e0",
        fontFamily: "monospace",
        fontStyle: "bold",
      })
      .setOrigin(0.5);

    this.add
      .text(cx, cy + 120, "✓ Pipeline OK", {
        fontSize: "20px",
        color: "#66bb6a",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);

    this.add
      .text(cx, cy + 160, "Vite + Phaser 3 + TypeScript → Vercel", {
        fontSize: "14px",
        color: "#888888",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);
  }
}
