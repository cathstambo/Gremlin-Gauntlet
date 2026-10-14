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
