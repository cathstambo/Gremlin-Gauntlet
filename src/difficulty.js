// Difficulty (Cath, 16 Oct 2026): HARD = the game as designed and tested. NORMAL = every world about 20% easier,
// EASY = another 20% easier again. The levels themselves are identical; only these dials change. First-pass values,
// to be fine-tuned once every world is finished.
//   speed: how fast everything happens (enemies, thrown things, warnings, the boss's attacks): lower = more time to react
//   boss:  damage your magic does to a boss (higher = fewer hits needed)
//   grunt: how hard Grunt presses in World 3 (lower = gains less, surges more gently, you pull away faster)
//   inv:   how long you flash (can't be hurt) after a hit
//   fair:  running sections: enemies and hazards must overlap the gremlin this much more before they hurt (near-misses forgiven)
// Tuned 20 Oct 2026 after testing: the running sections were barely easier on Normal / Easy, so speed and fair were strengthened.
const STORE = 'gremlinGauntlet.difficulty';
export const LEVELS = {
  easy:   { label: 'EASY',   speed: 0.72, boss: 1.56, grunt: 0.64, inv: 1.4, fair: 0.3 },
  normal: { label: 'NORMAL', speed: 0.85, boss: 1.25, grunt: 0.8,  inv: 1.2, fair: 0.15 },
  hard:   { label: 'HARD',   speed: 1,    boss: 1,    grunt: 1,    inv: 1,   fair: 0 },
};
let current = 'normal';
try { const v = localStorage.getItem(STORE); if (LEVELS[v]) current = v; } catch (e) { /* private mode */ }
export const DIFF = {
  get level() { return current; },
  set level(v) { if (!LEVELS[v]) return; current = v; try { localStorage.setItem(STORE, v); } catch (e) { /* ignore */ } },
  get k() { return LEVELS[current]; },
};

// Best scores: one per world per difficulty, on this device. Only completed games count, and (GDD) not after an assisted retry.
const BEST = (w, d) => `gremlinGauntlet.best.${d}.${w}`;
export function getBest(world, level = current) { try { return +(localStorage.getItem(BEST(world, level)) || 0); } catch (e) { return 0; } }
/** Returns true if this is a new best. */
export function saveBest(world, score, assisted) {
  if (assisted) return false;
  const old = getBest(world); if (score <= old) return false;
  try { localStorage.setItem(BEST(world, current), String(score)); } catch (e) { return false; }
  return true;
}
