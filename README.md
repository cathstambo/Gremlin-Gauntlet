# Gremlin Gauntlet

A landscape mobile browser game. This is the **gremlin test run**: the approved purple gremlin as a fully animated, playable character in a short placeholder course.

**Play:** https://cathstambo.github.io/Gremlin-Gauntlet/ (turn your phone sideways)

## Controls

| Action | Touch | Keyboard |
|---|---|---|
| Jump / double jump | Tap, swipe up, or JUMP | Space, ↑, W |
| Slide | Swipe down or SLIDE | ↓, S |
| Purple magic | Swipe right or MAGIC | →, D, F |
| Gremlin Meltdown (Chaos Meter full) | MELTDOWN button | M, E |
| Pause (hitboxes, slow motion) | II button | P, Esc |

## How the gremlin is animated

The gremlin is a **cut-out rig**: the approved right-side artwork is cut into 15 parts (head, eye, ear, body, scarf tails, pouch, arms, thighs, boots). Each part hangs on a joint and the code rotates the joints every frame, so the character always uses the exact approved pixels. Magic, glows, lightning, dust and sparks are drawn in code. Collision uses separate hitboxes that ignore ears, scarf and effects.

## Project layout

- `index.html` – page shell (landscape only, works on GitHub Pages with no build step)
- `lib/phaser.min.js` – Phaser 3.80.1
- `assets/gremlin/` – the 15 rig parts and `rig.json` (pivot points)
- `src/gremlin/` – the reusable character: `Gremlin.js` (rig, moves, hitbox), `poses.js` (every pose), `Effects.js`
- `src/scenes/` – `Boot` (loading, placeholder art), `Run` (the test course), `UI` (HUD and controls)
- `src/course.js` – the fixed test course layout

Obstacles, enemies and background are deliberately plain placeholders. Jump height, slide length and other numbers in `TUNING` (in `Gremlin.js`) are placeholders until playtesting.
