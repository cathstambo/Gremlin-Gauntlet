// The test run: a fixed, finite course (same every attempt, per the GDD's fair-comparison rule).
// d = distance in pixels from the start line; h = height of the item's centre above the ground.
// Obstacle types:  log (jump), stump (double jump), vines (slide under), frog (blast, jump or avoid),
// crystal (+10% Chaos Meter), potion (+1 heart, the level's single fixed potion), finish.
export const COURSE = [
  { t: 'log', d: 1900 },
  { t: 'crystal', d: 2700, h: 70 }, { t: 'crystal', d: 2950, h: 70 },
  { t: 'vines', d: 3700 },
  { t: 'frog', d: 4700 },
  { t: 'crystal', d: 5400, h: 70 }, { t: 'crystal', d: 5600, h: 170 },
  { t: 'log', d: 6300 },
  { t: 'stump', d: 7300 }, { t: 'crystal', d: 7300, h: 470 },
  { t: 'frog', d: 8300 },
  { t: 'potion', d: 8900, h: 60 },
  { t: 'vines', d: 9700 },
  { t: 'log', d: 10600 }, { t: 'crystal', d: 10620, h: 300 },
  { t: 'frog', d: 11500 }, { t: 'frog', d: 12150 },
  { t: 'crystal', d: 12700, h: 70 },
  { t: 'vines', d: 13300 }, { t: 'log', d: 14200 },
  { t: 'crystal', d: 14800, h: 70 }, { t: 'crystal', d: 15050, h: 70 },
  // a frog swarm: the place to try Gremlin Meltdown (or jump and blast your way through)
  { t: 'frog', d: 16300 }, { t: 'frog', d: 16700 }, { t: 'frog', d: 17100 }, { t: 'frog', d: 17500 }, { t: 'frog', d: 17900 },
  { t: 'stump', d: 19000 },
  { t: 'vines', d: 20000 },
  { t: 'finish', d: 21200 },
];
