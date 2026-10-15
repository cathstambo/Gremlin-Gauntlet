// World 1, The Mould Swamp: two fixed running stages before Eddie (same layout every attempt, per the GDD's fair-comparison rule).
// d = distance in pixels from the start line.
//   Hazards:   roots (jump), vines (slide under), mould (jump; stepping in slows you, staying in costs a heart),
//              sludge (jump), sludgeWide (double jump).
//   Creatures: frog (jump / blast), gator (jump the lunge / blast ×3), bat 'low' (jump) / 'high' (slide), spider (slide / blast).
//   Platforms: plat 'small' | 'medium' floating at height h (px above the ground); optional, a bonus route.
//   Pickups:   taco (100), margarita (250), crystal (+10% Chaos Meter), potion (+1 heart; the level's single fixed potion).
//              h = height of the pickup's centre above the ground.
const row = (t, d, n, h, gap = 110) => Array.from({ length: n }, (_, i) => ({ t, d: d + i * gap, h }));

// ---- Stage 1: easy to medium. Hazards and creatures are introduced one at a time, with room to breathe. ----
export const STAGE1 = [
  ...row('taco', 1100, 3, 70),
  { t: 'roots', d: 2000 },
  ...row('crystal', 2600, 2, 70, 200),
  { t: 'vines', d: 3500 },
  ...row('taco', 4000, 3, 70),
  { t: 'frog', d: 5000 },
  { t: 'plat', size: 'medium', d: 6100, h: 210 }, ...row('taco', 5990, 3, 290),
  { t: 'mould', d: 7300 },
  ...row('crystal', 7900, 2, 70, 200),
  { t: 'roots', d: 8700 },
  { t: 'potion', d: 9200, h: 70 },
  { t: 'bat', d: 9700, lane: 'high' },
  ...row('taco', 10300, 4, 70),
  { t: 'sludge', d: 11200 },
  { t: 'crystal', d: 11200, h: 300 },
  { t: 'plat', size: 'small', d: 12300, h: 230 }, { t: 'margarita', d: 12300, h: 315 },
  { t: 'vines', d: 13300 },
  { t: 'frog', d: 14300 },
  ...row('crystal', 14900, 2, 70, 200),
  { t: 'roots', d: 15700 },
  { t: 'gator', d: 17000 },
  ...row('taco', 17700, 3, 70),
  { t: 'sludgeWide', d: 18700 },
  { t: 'finish', d: 20000 },
];

// ---- Stage 2: busier and a touch harder. Hazards come in pairs, creatures overlap, more double jumps. ----
export const STAGE2 = [
  { t: 'roots', d: 1700 },
  { t: 'frog', d: 2500 },
  ...row('taco', 2900, 3, 70),
  { t: 'vines', d: 3500 },
  { t: 'mould', d: 4200 },
  { t: 'bat', d: 5100, lane: 'low' },
  ...row('crystal', 5500, 2, 70, 200),
  { t: 'sludge', d: 6100 },
  { t: 'spider', d: 7000 },
  { t: 'plat', size: 'medium', d: 7900, h: 220 }, ...row('taco', 7790, 3, 300), { t: 'margarita', d: 8130, h: 300 },
  { t: 'roots', d: 8800 }, { t: 'crystal', d: 8800, h: 300 },
  { t: 'gator', d: 9900 },
  { t: 'potion', d: 10700, h: 70 },
  { t: 'vines', d: 11300 },
  { t: 'frog', d: 11900 }, { t: 'bat', d: 12400, lane: 'high' },
  { t: 'mould', d: 13200 },
  ...row('taco', 13700, 3, 70),
  { t: 'sludgeWide', d: 14500 }, { t: 'crystal', d: 14500, h: 470 },
  { t: 'spider', d: 15600 },
  { t: 'roots', d: 16300 },
  { t: 'plat', size: 'small', d: 17200, h: 240 }, { t: 'margarita', d: 17200, h: 325 },
  { t: 'gator', d: 18300 },
  ...row('crystal', 19000, 3, 70, 180),
  // the closing stretch: still the busiest part of the swamp (a good place for Gremlin Meltdown), but with about a
  // second between each threat so you can deal with them one at a time (spread out 14 Oct 2026 after playtesting)
  { t: 'frog', d: 20200 },
  { t: 'bat', d: 21200, lane: 'high' },
  ...row('taco', 21650, 3, 70),
  { t: 'frog', d: 22400 },
  { t: 'spider', d: 23500 },
  { t: 'mould', d: 24600 },
  ...row('crystal', 25150, 2, 70, 200),
  { t: 'roots', d: 25900 },
  { t: 'vines', d: 27000 },
  { t: 'sludgeWide', d: 28300 },
  { t: 'gator', d: 30300 },
  ...row('taco', 31000, 4, 70),
  { t: 'finish', d: 32200 },
];

// =====================================================================================================
// World 2, Meadows of Malicious Happiness (Catalytik, The Evil Overlord). Same layout every attempt.
//   Creatures: bunny (hops at you: jump / blast), kitten (wiggles, then pounces at head height: slide / blast),
//              flower (rooted; rears back then snaps: jump / blast ×3), swarm (butterflies at head height 'high'
//              or knee height 'low': no damage, but they blind you for a moment: avoid or blast).
//   Hazards:   beam (crystal turret fires a rainbow beam across the path after a glowing warning:
//              lane 'low' = jump it, lane 'high' = slide under it).
//   Platforms: plat 'long' | 'fence' | 'arch'.
// ---- Stage 1: easy to medium; each danger introduced on its own first. ----
export const W2_STAGE1 = [
  ...row('taco', 1100, 3, 70),
  { t: 'bunny', d: 2100 },
  ...row('crystal', 2700, 2, 70, 200),
  { t: 'flower', d: 3700 },
  ...row('taco', 4300, 3, 70),
  { t: 'beam', d: 5600, lane: 'low' },
  { t: 'plat', size: 'long', d: 6700, h: 220 }, ...row('taco', 6560, 3, 300),
  { t: 'kitten', d: 7900 },
  ...row('crystal', 8500, 2, 70, 200),
  { t: 'potion', d: 9300, h: 70 },
  { t: 'swarm', d: 10100, lane: 'high' },
  ...row('taco', 10700, 4, 70),
  { t: 'beam', d: 11900, lane: 'high' },
  { t: 'plat', size: 'fence', d: 13000, h: 230 }, { t: 'margarita', d: 13000, h: 320 },
  { t: 'bunny', d: 14000 },
  ...row('crystal', 14600, 2, 70, 200),
  { t: 'flower', d: 15600 },
  { t: 'kitten', d: 16900 },
  ...row('taco', 17600, 3, 70),
  { t: 'beam', d: 18700, lane: 'low' },
  { t: 'finish', d: 20000 },
];
// ---- Stage 2: busier and a touch harder; dangers start to pair up. ----
export const W2_STAGE2 = [
  { t: 'bunny', d: 1700 },
  ...row('taco', 2200, 3, 70),
  { t: 'beam', d: 3200, lane: 'high' },
  { t: 'flower', d: 4300 },
  { t: 'swarm', d: 5300, lane: 'low' },
  ...row('crystal', 5800, 2, 70, 200),
  { t: 'kitten', d: 6700 },
  { t: 'plat', size: 'arch', d: 7800, h: 230 }, ...row('taco', 7680, 3, 310), { t: 'margarita', d: 8000, h: 310 },
  { t: 'bunny', d: 8900 }, { t: 'bunny', d: 9500 },
  { t: 'potion', d: 10400, h: 70 },
  { t: 'beam', d: 11300, lane: 'low' },
  { t: 'flower', d: 12400 },
  ...row('crystal', 13000, 2, 70, 200),
  { t: 'swarm', d: 13900, lane: 'high' },
  { t: 'kitten', d: 14900 },
  { t: 'plat', size: 'long', d: 16000, h: 230 }, { t: 'margarita', d: 16000, h: 320 },
  { t: 'beam', d: 17200, lane: 'high' },
  ...row('taco', 17900, 3, 70),
  { t: 'flower', d: 19000 },
  ...row('crystal', 19700, 3, 70, 180),
  // the closing stretch: busiest, with about a second between threats (a good place for Gremlin Meltdown)
  { t: 'bunny', d: 21000 },
  { t: 'kitten', d: 22000 },
  { t: 'swarm', d: 23000, lane: 'high' },
  { t: 'beam', d: 24100, lane: 'low' },
  { t: 'flower', d: 25300 },
  { t: 'bunny', d: 26400 },
  { t: 'beam', d: 27500, lane: 'high' },
  { t: 'kitten', d: 28700 },
  ...row('taco', 29500, 4, 70),
  { t: 'finish', d: 30800 },
];

// =====================================================================================================
// World 3, WRATH OF THE HAIRBALL: four chase runs with Grunt behind you. Run 1: Into the Wild.
//   Hazards: root (jump), boulder (jump). (Fallen trunks to slide under were dropped at Cath's request, 15 Oct.)
//   Wildlife: wolf (lopes, crouches, leaps: jump / blast ×2), eagle (swoops to head height: slide / blast), fox (darts: jump / blast).
//   arrow: Grunt fires from the bow; a marker shows where it lands, then it sticks in the path (jump it).
//   deco: scenery beside the path (cabin, sign, CoffeAngel). Never in the way.
export const W3_RUN1 = [
  // --- warm-up: one thing at a time, lots of room (the eyes in the trees, then Grunt bursts out at ~1500) ---
  { t: 'deco', key: 'w_dec_sign', d: 900, s: 1.0 },
  ...row('taco', 2600, 3, 70),
  { t: 'root', d: 3800 },
  ...row('crystal', 4600, 2, 70, 200),
  ...row('taco', 7000, 3, 70),
  { t: 'fox', d: 8200 },
  { t: 'deco', key: 'w_dec_cabin', d: 9200, s: 1.15 },
  { t: 'boulder', d: 10200 },
  { t: 'potion', d: 11000, h: 70 },
  // --- middle: wildlife and his first arrows, still one at a time ---
  { t: 'wolf', d: 12300 },
  ...row('taco', 13000, 4, 70),
  { t: 'arrow', d: 14100 },
  { t: 'eagle', d: 16400 },
  { t: 'deco', key: 'w_dec_coffee', d: 17100, s: 1.0 },
  { t: 'root', d: 17600 },
  { t: 'margarita', d: 17600, h: 330 },
  // --- finale: things come closer together ---
  { t: 'fox', d: 18600 },
  { t: 'arrow', d: 20300 },
  { t: 'wolf', d: 21100 },
  ...row('crystal', 21800, 2, 70, 200),
  { t: 'boulder', d: 22400 },
  { t: 'eagle', d: 23100 },
  { t: 'arrow', d: 24600 },
  { t: 'fox', d: 25300 },
  ...row('taco', 25900, 3, 70),
  { t: 'finish', d: 27000 },
];

// =====================================================================================================
// World 3, run 2: RIVER RUN (Cath's approved River Run art + readmes, 15 Oct 2026).
//   bridge: a crossing over the river / canyon (kind whole | river | canyon); d = where its drawing starts (3467 px long).
//     whole = intact (leaping salmon cross it: slide), river = broken (one jump), canyon = wide gap (double jump).
//     Fall in a gap: lose a heart, back up before the gap, Grunt gains a lot.
//   rockS / rockM / rockL: slippery river rocks (jump). moose: stops, paws the ground, charges (jump / blast x2).
//   bear: fishing grizzly beside the path swipes LOW (jump) or HIGH (slide); red line shows where. One blast.
//   salmon: leaps over an intact bridge at head height (slide). fishbreak: Grunt stops to swat a fish (breather).
//   Same ramp as run 1: one thing at a time early, closer together towards the end.
const B = 2167 * 1.6;   // a bridge's length on screen
export const W3_RUN2 = [
  { t: 'deco', key: 'w_dec_sign', d: 900, s: 1.0 },
  ...row('taco', 2400, 3, 70),
  { t: 'rockS', d: 3500 },
  ...row('crystal', 4200, 2, 70, 200),
  // first bridge: intact, one salmon
  { t: 'bridge', kind: 'whole', d: 5000 },
  ...row('taco', 5800, 3, 70),
  { t: 'salmon', d: 5000 + 1900 },
  { t: 'rockM', d: 5000 + B + 900 },
  { t: 'bear', lane: 'low', d: 5000 + B + 2300 },
  { t: 'potion', d: 5000 + B + 3300, h: 70 },
  // broken river bridge: one jump
  { t: 'bridge', kind: 'river', d: 13200 },
  { t: 'arrow', d: 13200 + B + 700 },
  { t: 'moose', d: 13200 + B + 2700 },
  { t: 'deco', key: 'w_dec_coffee', d: 13200 + B + 3300, s: 1.0 },
  { t: 'rockL', d: 13200 + B + 3900 },
  { t: 'margarita', d: 13200 + B + 3900, h: 330 },
  { t: 'fishbreak', d: 13200 + B + 4700 },
  // the canyon: double jump
  ...row('crystal', 22000, 2, 70, 200),
  { t: 'bridge', kind: 'canyon', d: 22600 },
  // the closing stretch
  { t: 'bear', lane: 'high', d: 22600 + B + 900 },
  { t: 'rockM', d: 22600 + B + 1800 },
  { t: 'arrow', d: 22600 + B + 2600 },
  { t: 'bridge', kind: 'whole', d: 29800 },
  { t: 'salmon', d: 29800 + 1200 },
  { t: 'salmon', d: 29800 + 2500 },
  { t: 'moose', d: 29800 + B + 900 },
  { t: 'rockS', d: 29800 + B + 1800 },
  { t: 'bear', lane: 'low', d: 29800 + B + 2700 },
  ...row('taco', 29800 + B + 3400, 3, 70),
  { t: 'finish', d: 29800 + B + 4400 },
];

// =====================================================================================================
// World 3, run 3: UZI RAMPAGE (Cath's approved Uzi Rampage art + readmes, 15 Oct 2026). Grunt has switched to his dual Uzis
// (no more arrows). drop: a burst knocks debris off the cliffs onto a red marker (k = rock | rockS | branch | branch2); it stays
// on the trail: jump it. quiet = part of the same burst as the drop before it. shelf: a jutting rock shelf (n = 1..3): slide.
// cbear: charging grizzly (rears up and roars, then charges: double jump / one blast). moose: as in River Run. hawk: Into the
// Wild's eagle (slide / blast). jam: his Uzi jams and he paw-smacks it (breather). Scenery (Cath's order): goat early,
// camp + YOU CAN DO IT! in the middle, RUN GREMLIN RUN! in the last stretch, ALMOST THERE! just before the finish.
export const W3_RUN3 = [
  ...row('taco', 2200, 3, 70),
  { t: 'goat', d: 2600, s: 0.8 },
  { t: 'drop', k: 'rock', d: 4200 },
  ...row('crystal', 5200, 2, 70, 200),
  { t: 'shelf', n: 1, d: 6200 },
  { t: 'drop', k: 'branch', d: 8200 },
  { t: 'hawk', d: 9600 },
  ...row('taco', 10400, 3, 70),
  { t: 'cbear', d: 12000 },
  { t: 'potion', d: 13200, h: 70 },
  // the middle: bursts drop two things in a row, and the animals come
  { t: 'deco', key: 'u_dec_camp', d: 14200, s: 1.05 },
  { t: 'drop', k: 'rockS', d: 15400 },
  { t: 'drop', k: 'branch2', d: 16300, quiet: true },
  { t: 'shelf', n: 3, d: 17600 },
  { t: 'deco', key: 'u_dec_youcan', d: 19000, s: 1.05 },
  { t: 'moose', d: 20200 },
  { t: 'margarita', d: 21000, h: 330 },
  { t: 'jam', d: 22000 },
  // the closing stretch: things come thick and fast
  ...row('crystal', 23000, 2, 70, 200),
  { t: 'drop', k: 'rock', d: 24200 },
  { t: 'drop', k: 'branch', d: 25000, quiet: true },
  { t: 'drop', k: 'rockS', d: 25800, quiet: true },
  { t: 'deco', key: 'u_dec_rungremlin', d: 26900, s: 1.0 },
  { t: 'cbear', d: 28000 },
  { t: 'shelf', n: 2, d: 29200 },
  { t: 'hawk', d: 30200 },
  { t: 'drop', k: 'rock', d: 31400 },
  { t: 'drop', k: 'branch2', d: 32200, quiet: true },
  { t: 'deco', key: 'u_dec_almost', d: 33300, s: 1.0 },
  ...row('taco', 33700, 3, 70),
  { t: 'finish', d: 35000 },
];

// =====================================================================================================
// World 3, run 4: FINAL SPRINT (Cath's approved Final Sprint backgrounds; GDD: rocky mountain pass, giant paw impacts behind
// the player, faster but fair combinations, higher starting pressure, finish at a riverside clearing, then Hairball Apocalypse).
// Grunt keeps his Uzis. A mixture of the earlier threats, closer together; pairs always ask for different moves in turn
// (never two at once). His giant paw slams down BEHIND the gremlin (pure pressure, see Chase.updateStomps).
// Scenery (Cath): CoffeAngel shouting RUN GREMLIN RUN! and the judgemental goat.
export const W3_RUN4 = [
  ...row('taco', 2000, 3, 70),
  { t: 'drop', k: 'rock', d: 3200 },
  { t: 'rockM', d: 4600 },
  { t: 'goat', d: 5200, s: 0.8 },
  { t: 'wolf', d: 6200 },
  ...row('crystal', 7000, 2, 70, 200),
  { t: 'shelf', n: 1, d: 7800 },
  { t: 'drop', k: 'branch', d: 9600 },
  { t: 'drop', k: 'rockS', d: 10400, quiet: true },
  { t: 'cbear', d: 11800 },
  { t: 'potion', d: 12800, h: 70 },
  { t: 'hawk', d: 13800 },
  { t: 'rockL', d: 14800 },
  { t: 'margarita', d: 14800, h: 330 },
  // the canyon: double jump
  { t: 'bridge', kind: 'canyon', d: 15800 },
  { t: 'drop', k: 'rock', d: 15800 + B + 900 },
  { t: 'drop', k: 'branch2', d: 15800 + B + 1700, quiet: true },
  { t: 'moose', d: 15800 + B + 3000 },
  { t: 'deco', key: 'u_dec_rungremlin', d: 15800 + B + 3900, s: 1.0 },
  { t: 'shelf', n: 3, d: 15800 + B + 4600 },
  ...row('crystal', 15800 + B + 5800, 2, 70, 200),
  { t: 'fox', d: 15800 + B + 6400 },
  { t: 'drop', k: 'rockS', d: 15800 + B + 7400 },
  { t: 'drop', k: 'rock', d: 15800 + B + 8200, quiet: true },
  { t: 'drop', k: 'branch', d: 15800 + B + 9000, quiet: true },
  { t: 'cbear', d: 15800 + B + 10400 },
  { t: 'shelf', n: 2, d: 15800 + B + 11500 },
  { t: 'hawk', d: 15800 + B + 12500 },
  { t: 'rockM', d: 15800 + B + 13400 },
  ...row('taco', 15800 + B + 14000, 4, 70),
  { t: 'finish', d: 15800 + B + 16000 },   // the riverside clearing: then the hairball
];
