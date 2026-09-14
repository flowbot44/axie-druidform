# Axie Druidform — Totem of Lunacia

A top-down Zelda-style puzzle-action game where you pick three owned Axies, then swap, park, and fuse them into Bear, Cat, or Hawk to purify the Shrine of Lunacia on a tight energy budget.

> Axie Vibeathon · Round 1 Prototype

## Tech Stack

- **Vite** + **Phaser 3** + **TypeScript**
- Deployed via **Vercel** (auto-deploy on push to `main`)

## Development

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

## Leaderboard

All-time, honor system, no wallet. Energy remaining ranks first; time is the tie-break. Collection **Board** to view; victory screen to submit a name.

Local `npm run dev` writes via `gh` (gist scope). Production needs a Vercel env `GITHUB_TOKEN` with gist access so `/api/scores` can POST.

## Build

```bash
npm run build
npm run preview   # preview the production build locally
```
