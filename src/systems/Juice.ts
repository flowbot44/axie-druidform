import Phaser from "phaser";

let audio: AudioContext | null = null;
let stopUntil = 0;

function ctx(): AudioContext | null {
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AC) return null;
  if (!audio) audio = new AC();
  if (audio.state === "suspended") void audio.resume();
  return audio;
}

function tone(
  freq: number,
  dur: number,
  type: OscillatorType,
  gain: number,
  slide?: number,
): void {
  const c = ctx();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), c.currentTime + dur);
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  o.connect(g);
  g.connect(c.destination);
  o.start();
  o.stop(c.currentTime + dur + 0.02);
}

function noise(dur: number, gain: number, freq = 400): void {
  const c = ctx();
  if (!c) return;
  const n = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const data = n.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = n;
  const filter = c.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = freq;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(c.destination);
  src.start();
  src.stop(c.currentTime + dur + 0.02);
}

export const sfx = {
  slam(): void {
    noise(0.12, 0.18, 280);
    tone(90, 0.14, "sine", 0.12, 50);
  },
  slash(): void {
    noise(0.06, 0.1, 1800);
    tone(520, 0.07, "square", 0.05, 220);
  },
  dart(): void {
    tone(1180, 0.07, "triangle", 0.06, 640);
  },
  fuse(): void {
    tone(196, 0.14, "sine", 0.08);
    tone(294, 0.2, "sine", 0.06);
  },
  split(): void {
    tone(330, 0.08, "triangle", 0.05, 180);
  },
  park(): void {
    tone(160, 0.06, "square", 0.04);
  },
  form(): void {
    tone(392, 0.08, "sine", 0.05);
    tone(523, 0.1, "sine", 0.04);
  },
  door(): void {
    noise(0.16, 0.1, 220);
    tone(70, 0.12, "sine", 0.07);
  },
  crystal(): void {
    tone(880, 0.12, "sine", 0.06);
    tone(1320, 0.16, "sine", 0.045);
  },
  shrine(): void {
    tone(262, 0.35, "sine", 0.08);
    tone(330, 0.4, "sine", 0.06);
    tone(392, 0.45, "sine", 0.05);
  },
  fail(): void {
    tone(140, 0.12, "sawtooth", 0.05, 70);
  },
  spend(): void {
    tone(740, 0.04, "triangle", 0.03);
  },
  heal(): void {
    tone(620, 0.08, "sine", 0.04);
    tone(880, 0.1, "sine", 0.03);
  },
  pit(): void {
    noise(0.1, 0.12, 160);
    tone(80, 0.14, "sine", 0.08, 40);
  },
  chip(): void {
    tone(520, 0.05, "triangle", 0.045);
  },
  clear(): void {
    tone(660, 0.08, "sine", 0.05);
    tone(990, 0.12, "sine", 0.04);
  },
};

export function hitStop(scene: Phaser.Scene, ms = 45): void {
  const now = scene.time.now;
  if (now < stopUntil) return;
  stopUntil = now + ms;
  scene.physics.world.pause();
  scene.time.delayedCall(ms, () => {
    scene.physics.world.resume();
  });
}

export function kick(scene: Phaser.Scene, intensity = 0.005, ms = 70): void {
  scene.cameras.main.shake(ms, intensity);
}

export function floater(
  scene: Phaser.Scene,
  x: number,
  y: number,
  text: string,
  color = "#ffeb3b",
): void {
  const label = scene.add
    .text(x, y - 18, text, {
      fontSize: "13px",
      color,
      fontFamily: "monospace",
      fontStyle: "bold",
    })
    .setOrigin(0.5)
    .setDepth(24);
  scene.tweens.add({
    targets: label,
    y: y - 44,
    alpha: 0,
    duration: 520,
    onComplete: () => label.destroy(),
  });
}

export function flashObj(
  scene: Phaser.Scene,
  obj: Phaser.GameObjects.Components.Tint,
  color = 0xffffff,
): void {
  obj.setTint(color);
  scene.time.delayedCall(70, () => obj.clearTint());
}

export function spendAt(
  scene: Phaser.Scene,
  x: number,
  y: number,
  amount: number,
): void {
  if (amount <= 0) return;
  sfx.spend();
  floater(scene, x, y, `−${amount}`);
}

export function hitParticles(scene: Phaser.Scene, x: number, y: number, color = 0xffffff): void {
  const particles = scene.add.particles(0, 0, 'tiles', {
    x,
    y,
    lifespan: 300,
    speed: { min: 50, max: 150 },
    angle: { min: 0, max: 360 },
    scale: { start: 0.1, end: 0 },
    blendMode: 'ADD',
    tint: color,
    emitting: false
  });
  particles.explode(6);
  scene.time.delayedCall(400, () => particles.destroy());
}

export function dashTrail(scene: Phaser.Scene, x: number, y: number, color = 0xffffff, size = 16): void {
  const trail = scene.add.circle(x, y, size, color, 0.4).setDepth(8);
  scene.tweens.add({
    targets: trail,
    scale: 0.1,
    alpha: 0,
    duration: 300,
    onComplete: () => trail.destroy()
  });
}

export function fuseParticles(scene: Phaser.Scene, x: number, y: number, color = 0xffffff): void {
  const ring = scene.add.circle(x, y, 10, color, 0.8).setDepth(20);
  scene.tweens.add({
    targets: ring,
    scale: 4,
    alpha: 0,
    duration: 400,
    ease: "Cubic.out",
    onComplete: () => ring.destroy()
  });

  const particles = scene.add.particles(0, 0, 'tiles', {
    x,
    y,
    lifespan: 500,
    speed: { min: 100, max: 200 },
    angle: { min: 0, max: 360 },
    scale: { start: 0.15, end: 0 },
    blendMode: 'ADD',
    tint: color,
    emitting: false
  });
  particles.explode(12);
  scene.time.delayedCall(600, () => particles.destroy());
}
