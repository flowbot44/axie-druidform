import Phaser from "phaser";
import { CollectionScene } from "./scenes/CollectionScene.ts";
import { GameScene } from "./scenes/GameScene.ts";
import { HUDScene } from "./scenes/HUDScene.ts";
import { LeaderboardScene } from "./scenes/LeaderboardScene.ts";
import { PreloadScene } from "./scenes/PreloadScene.ts";
import { VictoryScene } from "./scenes/VictoryScene.ts";

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: 1280,
  height: 720,
  parent: "game",
  backgroundColor: "#0e0e1a",
  physics: {
    default: "arcade",
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  input: {
    activePointers: 3,
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    autoRound: true,
    expandParent: true,
  },
  roundPixels: true,
  pixelArt: false,
  scene: [PreloadScene, CollectionScene, GameScene, HUDScene, VictoryScene, LeaderboardScene],
};

const game = new Phaser.Game(config);
if (import.meta.env.DEV) {
  (window as unknown as { __game: Phaser.Game }).__game = game;
}
