# Gremlin Gauntlet

A landscape mobile browser game. Current build: the **gremlin test run** (short placeholder course) and the **level 1 boss fight: Eddie, The Mould King**.

**Play:** https://cathstambo.github.io/Gremlin-Gauntlet/ (turn your phone sideways)  
**Straight to the boss:** https://cathstambo.github.io/Gremlin-Gauntlet/#boss

## Controls

| Action | Touch | Keyboard |
|---|---|---|
| Jump / double jump | Tap, swipe up, or JUMP | Space, ↑, W |
| Slide | Swipe down or SLIDE | ↓, S |
| Purple magic | MAGIC (or swipe right in the run) | F, J, Enter (→ in the run) |
| Gremlin Meltdown (Chaos Meter full) | MELTDOWN button | M, E |
| Move left / right (boss arena only) | Hold ◀ ▶, or swipe left/right to dash | ← →, A D |
| Pause (hitboxes, slow motion, switch level) | II button | P, Esc |

## How the gremlin is animated

The gremlin is a **cut-out rig**: the approved right-side artwork is cut into 15 parts (head, eye, ear, body, scarf tails, pouch, arms, thighs, boots). Each part hangs on a joint and the code rotates the joints every frame, so the character always uses the exact approved pixels. Magic, glows, lightning, dust and sparks are drawn in code. Collision uses separate hitboxes that ignore ears, scarf and effects.

## Project layout

- `index.html` – page shell (landscape only, works on GitHub Pages with no build step)
- `lib/phaser.min.js` – Phaser 3.80.1
- `assets/gremlin/` – the 15 rig parts and `rig.json` (pivot points)
- `src/gremlin/` – the reusable character: `Gremlin.js` (rig, moves, hitbox), `poses.js` (every pose), `Effects.js`
- `src/scenes/` – `Boot` (loading, placeholder art), `Run` (the test course), `UI` (HUD and controls)
- `src/course.js` – the fixed test course layout
- `assets/eddie/`, `src/eddie/` – Eddie's rig parts, poses and moves
- `src/scenes/Boss.js` – Eddie's arena, attacks, phases and AI; numbers to tune are in `BOSS_TUNING`

Obstacles, enemies and background are deliberately plain placeholders. Jump height, slide length and other numbers in `TUNING` (in `Gremlin.js`) are placeholders until playtesting.
