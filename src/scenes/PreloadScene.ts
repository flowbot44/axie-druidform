import Phaser from "phaser";
import {
  OWNED_AXIES,
  axieImagePath,
  axieTextureKey,
  prepareAxieTexture,
} from "../config/collection.ts";

/**
 * Load the nine owned stills before collection. Mixer stays vision (GDD §14).
 */
export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: "PreloadScene" });
  }

  preload(): void {
    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;
    this.add.rectangle(
      cx,
      cy,
      this.cameras.main.width,
      this.cameras.main.height,
      0x0e0e1a,
    );
    this.add
      .text(cx, cy - 24, "Axie Druidform", {
        fontSize: "28px",
        color: "#e0e0e0",
        fontFamily: "monospace",
        fontStyle: "bold",
      })
      .setOrigin(0.5);
    this.add
      .text(cx, cy + 16, "Loading your Axies…", {
        fontSize: "14px",
        color: "#90a4ae",
        fontFamily: "monospace",
      })
      .setOrigin(0.5);

    for (const axie of OWNED_AXIES) {
      this.load.image(axieTextureKey(axie.id), axieImagePath(axie.id));
    }
    this.load.image("form-beast-bear", "/forms/bear.png");
    this.load.image("form-beast-cat", "/forms/cat.png");
    this.load.image("form-beast-hawk", "/forms/hawk.png");
  }

  create(): void {
    for (const axie of OWNED_AXIES) {
      prepareAxieTexture(this.textures, axie.id);
    }
    this.scene.start("CollectionScene");
  }
}
