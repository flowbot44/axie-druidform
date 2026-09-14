# Game Design Document

**Axie Druidform — Totem of Lunacia**  
Axie Vibeathon · Round 1 Prototype + Product Vision  
Status: **LOCKED** — matches the current prototype  
Last updated: 2026-09-11

---

## 0. How to use this document

- **Round 1 (Sep 8–21):** this file is the lock. Code that disagrees with a LOCK is wrong.  
- **Vision / submission copy:** use §1 word-for-word.  
- Phaser, one tested feature at a time, approved assets, wallet-free play.  
- Do not reintroduce: morph-of-one-hero, totem stacking, wallet login, live Market API, mixers, API keys in the client, default starters (Olek / Buba / Puffy), or `1`/`2`/`3` as form keys.  
- Axie Core Discord notes are **starting points, not a checklist.** Token integration is not required.

---

## 1. Locked product vision (word-for-word)

> The long-term fantasy of Axie Druidform is commanding Axies you actually own as a tactical fireteam—picking who enters the dungeon, then combining any two or three into Bear, Cat, or Hawk. The form does the puzzle job. The part name changes what Space does. Evolved parts and collectibles are why you brought this body, not any cactus.

**R1 ownership:** `src/data/owned-axies.json` — nine Axies (3 Plant, 3 Beast, 3 Bird) snapshotted from `0xdf8b35668c8fcf82b1d1707875c98cd05b6927c4`. No wallet connect. No live Market call.

**Mixer / Market (vision only):** Axie ID → Market GraphQL genes → Mixer. No player wallet required. API key stays out of the client and public repo.

**Axie Core one-liner:**  
**Every trio can purify the shrine.** You seek a Plant because Bear is the plate job. You seek a cactus because slam plants Thorn Hold. You seek #10865685 because its Clover is evolved. Three of one class still finish — they just spend more energy. Mystics, Origins, and Meos play the same rooms with a fireteam signature. They are never a gate.

---

## 2. One-sentence pitch

A top-down Zelda-style puzzle-action game where you pick three owned Axies, then swap, park, and fuse them into Bear, Cat, or Hawk to purify the Shrine of Lunacia on a tight energy budget.

---

## 3. Design pillars

1. **Owned bodies.** Pick 3 from the JSON. No default fireteam.  
2. **Any trio can finish.** Multiple paths. Mixed classes score better; three Plants still clear.  
3. **Form is the job.** Bear plates, Cat slash, Hawk fly. Parts never skip a form’s room.  
4. **Three layers of “why this Axie.”** Class = which job. Part name = which verb on Space. Evo / collectible = this body, not any cactus.  
5. **×2 vs ×3.** More bodies in the pile = better move, range, and fuse clock.  
6. **Keys do one job.** `1`/`2`/`3` pick Axies. `Z`/`X`/`C` pick forms.  
7. **Energy is the score.** Planning beats speed.  
8. **Readable in four minutes.** Wallet-free.

---

## 4. Round 1 collection (LOCK)

**File:** `src/data/owned-axies.json`  
**Owner (snapshot):** `0xdf8b35668c8fcf82b1d1707875c98cd05b6927c4`  
Pick **any three**. Slots `1`/`2`/`3` are pick order. Three Plants is legal and completable.

| Class | Id | Name | Notable parts |
| --- | --- | --- | --- |
| Plant | 10865685 | Axie #10865685 | cactus horn, clover-2 |
| Plant | 6932506 | T_1 | cactus + pumpkin |
| Plant | 4060820 | BBP PLANT2 | pumpkin back |
| Beast | 95221 | Axie #95221 | dual-blade |
| Beast | 4551303 | B2 | imp + ronin |
| Beast | 4919477 | Axie #4919477 | dual-blade |
| Bird | 11070928 | Axie #11070928 | pigeon-post |
| Bird | 11367315 | Axie #11367315 | swallow |
| Bird | 12025435 | AOE Bird | wing-horn-2 |

**Language:** swap, park, fuse, split, **Bear / Cat / Hawk**. Never morph, stack, totem, Chimera Shift, or despawn in HUD. Product title may keep “Totem of Lunacia”; the win object is the **Shrine of Lunacia**.

---

## 5. Player fantasy

You choose three Axies you own. Unfused they keep class jobs. When you need a body the party does not have, you **fuse** two or three into Druidform and press **`Z` Bear, `X` Cat, `C` Hawk**. The form does the room. The parts in the pile change what Space does (Thorn Hold, Cleave, Pierce). An evolved part or a collectible is why that slot is this Axie, not a generic cactus.

---

## 6. Camera, space, movement (LOCK)

- Top-down, 32×32 tiles, arcade velocity, room camera (five rooms stitched east–west).  
- Beast unfused: +25% speed (ronin back ×1.15 more).  
- Hawk form: hover pits + fly speed `× (1 + 0.15 × flyer count)` on top of ×2/×3.

---

## 7. Controls (LOCK)

| Input | What it does |
| --- | --- |
| Collection click | Pick up to 3, then **Play** |
| WASD / touch stick | Move the selected Axie (or the form, if you are driving it) |
| `1` `2` `3` / tap portraits | **Always pick a party Axie.** Absorbed slots jump to the form body. Switching *off* a form body **auto-parks it** where it stands (Room 3). |
| `Tab` | Cycle visible Axies (skips absorbed) |
| `Z` / Bear | **Bear** — plates / slam |
| `X` / Cat | **Cat** — slash |
| `C` / Hawk | **Hawk** — fly + dart (vines pits) |
| `Space` / click / Kit | Kit of the body you are driving |
| `F` / Park | Follow ↔ Park the two inactives as a group |
| `E` / Fuse | Fuse nearest ally (3 energy) / add the third (3) / split (0) |
| HUD Retry | Energy 0: room retry (+10s, restore `energyOnRoomEnter`, split) |

Form keys work even while you drive the leftover unfused Axie. HUD while fused: **`Z Bear    X Cat    C Hawk`**. Unfused HUD: `E fuse  ·  then Z Bear / X Cat / C Hawk`.

`1`/`2`/`3` **never** change form. That duplication is cut.

---

## 8. Party states (LOCK)

| State | Behavior |
| --- | --- |
| Active | Input. |
| Follow | Tether. No pit hover. |
| Park | Anchored. Holds a plate after a door. Auto-applied to a form body when you swap off it. |
| Fused host | One collider. Form is Bear, Cat, or Hawk. Badge PARK if left on a plate. |
| Absorbed | Hidden. Its slot key selects the form body. |

---

## 9. Jobs, forms, lineage, parts (LOCK)

**Energy:** 100. Move / swap / park / split = 0. Fuse = 3 per join. Form switch = 1 if you have energy, **never blocked at 0**. No general regen. **Herbivore** (parked) is the exception: 1 energy / 4s, cap 3 per room.

### Unfused class jobs (still work — the easy mixed path)

| Class | Job |
| --- | --- |
| Plant (also Reptile, Dusk if present) | Heavy plate, slam (2, cactus → 1) |
| Beast (also Bug, Mech) | Slash brambles (1), sprint |
| Bird (also Aquatic, Dawn) | Hover, dart (2) |

### Druidform — any 2 or 3, any classes (the any-trio path)

Default form on fuse matches the host’s lineage (Plant→Bear, Beast→Cat, Bird→Hawk). Then **`Z`/`X`/`C`** switch.

| Form | Key | Kit | Native lineage (score 3) | Off-lineage (score 1) |
| --- | --- | --- | --- | --- |
| **Bear** | `Z` | Slam; presses plates / boss anchor | Plant, Reptile, Dusk | everyone else |
| **Cat** | `X` | Slash | Beast, Bug, Mech | everyone else |
| **Hawk** | `C` | Hover + dart; **always** Seed-vines pits so a leftover ally can follow | Bird, Aquatic, Dawn | everyone else |

**Form rating** = sum of lineage scores in the pile (3 or 1 per body).

**×2 / ×3**

| | ×2 | ×3 |
| --- | --- | --- |
| Move | ×1.25 | ×1.5 |
| Ability range | ×1.25 | ×1.5 |
| Fuse clock | 8s | 14s |

Plant+Bird in the pile: **+4s** (Dawn bonus). JSON parts add +2s each (pumpkin, pigeon-post, swallow).

**Bear — time to get across**  
After a Bear steps off a heavy plate, the gate stays down `max(2.0s, 0.4s × Bear rating)`. Any Bear can cross; heavier piles get more time. Unfused Plant **parked** still holds forever.

**Cat — less energy**  
Slash cost = `max(1, 2 − Cat-lineage count)`. Three Beasts → 1. Three Plants → 2.

**Hawk — fly faster**  
Hover speed × `(1 + 0.15 × flyer count)`. Dart cost 2, or **1** if at least one flyer is in the pile. Three Plants can Hawk; they fly at ×1.0 and pay 2 per dart. Hawk dart **always** vines pit tiles it crosses.

### Parts — three layers (LOCK)

Official Core question: *what would make a player seek out a particular Axie for a specific purpose?* This game answers it in three layers. None of them are keys. Any L1 trio still finishes.

| Layer | What you seek | What you get | R1 |
| --- | --- | --- | --- |
| 1. Class | a Plant / Beast / Bird | Bear / Cat / Hawk **job** | shipped |
| 2. Part name | a cactus, a dual-blade, a pigeon-post | which **verb** Space does | shipped |
| 3a. Evolved (`-2`) | **this** cactus, not T_1’s | the same verb, louder / a body mark | shipped on clover-2 + wing-horn-2 |
| 3b. Collectible | **your** Mystic / Origin / Meo | fireteam **signature** | schema only; gameplay is §16 |

**Rule:** part name = verb. Evo = intensity of that body. Collectible = how the fireteam exists. Parts do not skip a form’s room. Rare is not “bigger Cleave.”

Named parts change **what Space does**. Affinity still changes numbers. One verb per form (priority).

**Bear** Cactus Thorn Hold > Carrot Root Pull  
**Cat** Dual Blade Cleave  
**Hawk** Pigeon Post Pierce > Eggshell Split Dart > Swallow Tailwind

| Part | Effect |
| --- | --- |
| cactus horn | **Thorn Hold** — slam plants a 2s weight on a nearby plate. Plant cactus still −1 slam cost. |
| carrot tail | **Root Pull** — slam tugs the nearest parked ally 2 tiles (if no cactus in the pile) |
| dual-blade horn | **Cleave** — wider slash. Core still needs expose. |
| pigeon-post back | **Pierce** — dart skips the first wall / Treant. Also +2s fuse. |
| eggshell horn | **Split Dart** — two bolts at 15° (if no pigeon-post) |
| swallow tail | **Tailwind** — ×2 move for 2s after dart (if no pigeon-post / eggshell). Also +2s fuse. |
| herbivore mouth | Parked pile regen 1 energy / 4s, cap 3 per room |
| imp horn on a Beast | Cat slash range ×1.25 |
| cuckoo horn | Hawk dart range ×1.25 |
| ronin back | extra sprint on that body |
| pumpkin back | +2s Druidform |
| **clover ears L2** (`ears-clover-2`) | **Clover evo** — first kit in each room costs −1 energy. Why #10865685 ≠ T_1. |
| **wing horn L2** (`horn-wing-horn-2`) | **Wing Horn evo** — dart range ×1.25. Why AOE Bird is not a blank card. |

Part names stay (cactus, clover). The `-2` suffix is stored as `evolved` on that slot — not stripped. Evo pips on the collection card (`Evo ●○○○○○`).

Collectible fields on the snapshot (`parts[].specialGenes`, `title`) parse Mystic / Origin / Meo / etc. **No collectible gameplay in R1.** Signatures are vision (§16).

---

## 10. Scoring and failure (LOCK)

Primary: energy remaining at shrine. Tie-break: time.

| Fail | Result |
| --- | --- |
| Energy 0 | Exhaustion. HUD: Retry room (+10s) |
| Pit | Snap, split, −3 once |
| Softlock | HUD retry at energy 0 |

---

## 11. Fusion rules (LOCK)

- Nearest ally within 40px. Any classes.  
- ×2 costs 3. Adding the third costs 3 more and refreshes the clock.  
- `Z`/`X`/`C` change form (even while driving the leftover Axie).  
- Swapping off the form with `1`/`2`/`3` **parks** it.  
- Split: guests pop 32px, cost 0. Timer and pits also split.

| Object | Accepts |
| --- | --- |
| Room 1 brambles | Unfused Beast **or** Cat |
| Room 2 eye | Unfused Bird **or** Hawk |
| Room 3 plate / Room 5 anchor | Unfused Plant **or** Bear |
| Room 4 thorn gate | Unfused Beast on the landing **or** Cat |
| Room 4 crystal | Hawk (optional alcove, not the exit) |
| Room 5 eye | Hawk |
| Room 5 core | Unfused Beast **or** Cat |

---

## 12. Dungeon (LOCK)

Five rooms, 3–4 minutes. **Multiple paths.** Three of one class is a supported route.

### Collection

Nine cards from the JSON. Pick three. Copy: *Any 3 can finish. 1/2/3 pick Axies. After fuse: Z Bear, X Cat, C Hawk.* Play-again returns here.

### Room 1 — Cat / Beast

Wide bramble doorway. Unfused Beast slash **or** fuse Cat (`X`).

### Room 2 — Hawk / Bird (fly + dart)

**Wide 3-tile chasm.** Unfused Bird hover+dart **or** fuse Hawk (`C`). Eye labeled BIRD; Hawk still counts. Hit lowers a **bridge** so leftovers can walk.

### Room 3 — Bear / Plant (park + swap)

Wall + gate. Two legal paths:

1. Park an unfused Plant (`F`), walk another through, pull the lever.  
2. Fuse **two** as Bear (`Z`), stand on the plate, press the leftover’s `1`/`2`/`3` — Bear **auto-parks** — walk through, pull the lever.

If all three are fused there is no leftover; then the 2s+ hold-timer race is the fallback.

### Room 4 — Hawk then Cat (not a second Room 2)

**Narrow 2-tile pit** (not Room 2’s three). Hawk (`C`) flies it. On the landing, a **thorn gate** (brambles at the corridor) blocks the east door — switch to **Cat (`X`)** and slash. Optional HAWK crystal sits in a north-east alcove, off the critical path.

This room teaches **form switch after a crossing**. Room 2 does not.

### Room 5 — all three forms

1. Hawk-dart the eye (`C`).  
2. Bear on the anchor (`Z`).  
3. Cat-slash the core (`X`).  

Same pile can `C` → `Z` → `X`. Or park/swap leftovers. Or split and use unfused jobs if you brought those classes.

### Victory

Energy, time, +250 AXP (Simulated), Ascension line, copyable score. Optional name → all-time board (energy first, time tie-break, no wallet). Play again → collection.

---

## 13. Axie Core

Official prompt: *what would make a player seek out a particular Axie for a specific purpose in your game?*

Starting points, not a checklist. Token integration is not required. Basic play stays wallet-free.

**R1 answer (playable now)**

- **Class → job.** Plant/Bear holds plates. Beast/Cat slashes. Bird/Hawk flies.  
- **Part name → verb.** Cactus Thorn Hold. Dual Blade Cleave. Pigeon Post Pierce. Eggshell Split. Swallow Tailwind. Carrot Root Pull. Herbivore park regen. One verb per form (priority). Same rooms; Space feels different.  
- **Evo → this body.** `-2` is kept as a flag. Clover-2: first kit −1e/room (#10865685 ≠ T_1). Wing Horn-2: longer dart (AOE Bird is not blank). Pips on the card.  
- **How many:** ×3 is strictly better than ×2.  
- **Mono is allowed:** 3 Plants clear; mixed keeps energy.  
- **Tokens not required. No wallet.**

That is “seek a cactus” plus “seek the cactus I evolved.” It is not yet “only this Mystic.”

**Vision (same dungeon, later snapshot)**

- **Collectible → fireteam signature.** Mystic / Origin / Meo from `specialGenes` + `title`. Schema is in. Gameplay is §16. Not a bigger Cleave. Not a gate.  
- **Evo on the verb part** (cactus-2, dual-blade-2) upgrades that verb’s intensity. R1’s evos happen to sit on non-verb slots, so they are body marks.  
- **Breeding target:** evolve the verb part on a collectible. One Axie, three layers.

**Do not**

- Mystic-only rooms, evo-locked shortcuts, collectible skip-expose.  
- Let Cat skip Hawk’s pit or Dual Blade skip the exposed core.

| Claim | R1 | Vision |
| --- | --- | --- |
| Seek a class | Pick-3 columns | same |
| Seek a part name | verbs on Space | same |
| Seek this Axie | clover-2 vs T_1; wing-horn-2 | Mystic/Origin/Meo signatures; evo-on-verb |
| Fireteam | three owned bodies; fuse spends them | collectible changes how the pile exists |
| Core loop | +250 AXP (Simulated) | rebuilt JSON from a public address |
| Ownership | static JSON from a real address | same, no wallet for basic play |
| Combinations | any 2/3 → Bear / Cat / Hawk | verb + evo + collectible on one body |

---

## 14. Tech (LOCK)

Vite + Phaser 3 + TypeScript. Arcade physics. `owned-axies.json` imported at build time. No Market, mixer, or wallet in R1.

| Resource | This project |
| --- | --- |
| Origins Assets Kit | Optional stills |
| Animated 3D / Three.js mixer (beta) / Unity mixers | Vision only |

Each Axie: `{ slot, id, axieClass, parts, partClasses, evolved, collection, followPark, guests[], absorbedBy, form }`.

---

## 15. Build status

**Shipped in the prototype**

- Collection pick-3 from static JSON  
- Five rooms, park, fuse ×2/×3  
- Bear / Cat / Hawk on `Z`/`X`/`C`  
- `1`/`2`/`3` always pick Axies; swap-off auto-parks the form  
- Lineage stats, 2s floor on Bear hold, Hawk always vines  
- Named part verbs (Thorn Hold / Cleave / Pierce / Split / Tailwind / Root Pull) + Herbivore park regen  
- Evolved parts kept (`-2`): Clover-2 first kit −1e, Wing Horn-2 longer dart, evo pips on cards  
- Room 4 thorn gate (Hawk then Cat)  
- Boss beats + victory AXP  
- Any trio can finish  

**Still R1 polish**

1. Playtest Room 4 + a mixed run (not done by the designer yet).  
2. Exhaustion screen at energy 0.  
3. First-play blurb already on collection; keep it short.  
4. Juice (slash / slam / dart / fuse pops).  
5. Origins stills if time.  

**Do not start:** live Market, mixers, wallet, totem stacking.

---

## 16. Vision

Rebuild the JSON from a public address at build time. Named bonuses for Mech (Beast+Bug as Cat) and Dusk (Plant+Reptile as Bear). Mixer later. No default starters if IDs are missing — pick screen stays empty.

**Collectible signatures** (schema is in; gameplay is not). When the snapshot includes `specialGenes` / `title`, a Mystic / Origin / Meo is *this* Axie, not a better cactus:

- **Mystic** — fuse clock does not expire while that body is in the pile.  
- **Origin** — first fuse in each room costs 0.  
- **Meo** — parked Meo may fire its class kit once per room without swapping to it.

**Evo on the verb part** (later, when the snapshot has cactus-2 / dual-blade-2): same verb, louder — Thorn Hold lasts 3s, Pierce skips two blockers. Non-verb evos stay body marks (R1 clover-2 / wing-horn-2).

Basic play stays wallet-free. Any L1 trio still finishes. Collectibles and evo are score and fireteam texture, never a gate. Do not add Mystic-only rooms.

---

## 17. Submission checklist

- [ ] Title: Axie Druidform — Totem of Lunacia  
- [ ] Pitch §2 and vision §1  
- [ ] Playable link  
- [ ] First-play §18  
- [ ] Axie Core §13 + AXP screen  
- [ ] No wallet required  
- [ ] Thumbnail, repo, fallback video, AI tools  

---

## 18. First-play instructions (paste into the form)

Pick any 3 from the collection. No wallet. **Any trio can finish the shrine.** Mixed Plant + Beast + Bird is easiest. Three of one class still clears. Gold line on a card is the part **verb**; cyan **Evo** pips mean that body, not a generic cactus.  
`WASD` move. `1` `2` `3` pick an Axie (`Tab` cycles). `F` parks the others. `E` fuses a nearby ally.  
**Forms (not 1/2/3):** `Z` Bear (plates), `X` Cat (slash), `C` Hawk (fly + dart). Switching off the form with `1`/`2`/`3` parks it. `E` again splits.  
Room 3: fuse two as Bear, stand on the plate, select the leftover Axie, walk through.  
Room 4: Hawk the pit, Cat the thorns.  
`Space` uses that job. Energy remaining is the score. HUD retry if energy hits 0.

---

## 19. Out of scope

Default starters · wallet connect · live Market / API keys · totem stacking · `1`/`2`/`3` as form keys · single-hero morph · requiring Mech/Dusk to finish R1 · per-Axie `F` · partial split · wallet / verified leaderboard · treating Discord Core as a checklist · Mystic-only rooms · evo-gated shortcuts · collectible as skip-expose.

---

## 20. Change log

| Date | Change |
| --- | --- |
| 2026-09-14 | Touch: on-screen stick + Kit/Fuse/Park/forms. Portraits pick slots. Landscape prompt on phones. |
| 2026-09-14 | All-time honor-system board: name + energy + time. No wallet. |
| 2026-09-11 | Evolved parts kept as flags (no longer strip `-2`). Clover-2: first kit −1e/room. Wing Horn-2: dart range ×1.25. Evo pips on collection cards. Collectible schema (`specialGenes`, `title`) parsed; Mystic/Origin/Meo signatures are vision only. |
| 2026-09-11 | Named part verbs: Cactus Thorn Hold, Dual Blade Cleave, Pigeon Post Pierce, Eggshell Split Dart, Swallow Tailwind, Carrot Root Pull. Herbivore parked regen (cap 3/room). Collection cards show the verb. One verb per form (priority). Forms still do the rooms. |
| 2026-09-10 | Synced to prototype: `Z`/`X`/`C` forms, `1`/`2`/`3` always Axies, auto-park on swap-off, any trio can finish, Room 4 is Hawk-then-Cat thorn gate (not a second dart chasm), Hawk always vines, Bear hold floor 2s, form switch never blocked at 0 energy. |
| 2026-09-09 | Druidform is Bear / Cat / Hawk. Lineage stats. 3-same-class route. |
| 2026-09-09 | Static `owned-axies.json` pick-3 from 0xdf8b…27c4. |
| 2026-09-09 | Totem stacking cut. |
| 2026-09-07 | Original Phaser R1 lock. |
