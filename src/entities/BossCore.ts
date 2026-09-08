import Phaser from "phaser";
import { CORE_COLOR, TILE_SIZE } from "../config/constants.ts";

/**
 * Exposed Treant core — Ronin Slash once after the weak eye is hit (GDD §12 beat 3).
 */
export class BossCore {
  public readonly sprite: Phaser.GameObjects.Rectangle;
  private readonly label: Phaser.GameObjects.Text;
  private exposed = false;
  private slashed = false;
  private readonly onSlashed: () => void;

  constructor(scene: Phaser.Scene, x: number, y: number, onSlashed: () => void) {
    this.onSlashed = onSlashed;
    this.sprite = scene.add.rectangle(x, y, TILE_SIZE - 6, TILE_SIZE - 6, CORE_COLOR);
    this.sprite.setStrokeStyle(2, 0xbf360c);
    this.sprite.setDepth(0.55);
    this.sprite.setVisible(false);
    this.label = scene.add
      .text(x, y - 20, "CORE", {
        fontSize: "9px",
        color: "#ffab91",
        fontFamily: "monospace",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setDepth(0.6)
      .setVisible(false);
  }

  isExposed(): boolean {
    return this.exposed && !this.slashed;
  }

  isSlashed(): boolean {
    return this.slashed;
  }

  expose(): void {
    if (this.slashed) return;
    this.exposed = true;
    this.sprite.setVisible(true);
    this.label.setVisible(true);
  }

  tryCut(): boolean {
    if (!this.exposed || this.slashed) return false;
    this.slashed = true;
    this.sprite.setFillStyle(0xffccbc);
    this.label.setText("BROKEN");
    this.onSlashed();
    return true;
  }

  reset(): void {
    this.exposed = false;
    this.slashed = false;
    this.sprite.setFillStyle(CORE_COLOR);
    this.sprite.setVisible(false);
    this.label.setText("CORE");
    this.label.setVisible(false);
  }
}
