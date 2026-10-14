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
