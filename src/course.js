// The test run: a fixed, finite course (same every attempt, per the GDD's fair-comparison rule).
// d = distance in pixels from the start line; h = height of a pickup's centre above the ground.
// Obstacles: log (jump), stump (double jump), vines (slide under).
// Creatures: frog (jump/blast), gator (jump the lunge/blast ×3), bat low (jump) / bat high (slide), spider (slide/blast).
// Pickups: crystal (+10% Chaos Meter), potion (+1 heart, the level's single fixed potion), finish.
export const COURSE = [
  { t: 'log', d: 1900 },
  { t: 'crystal', d: 2700, h: 70 }, { t: 'crystal', d: 2950, h: 70 },
  { t: 'vines', d: 3700 },
  { t: 'frog', d: 4800 },
  { t: 'crystal', d: 5400, h: 70 }, { t: 'crystal', d: 5600, h: 170 },
  { t: 'bat', d: 6500, lane: 'high' },
  { t: 'log', d: 7300 },
  { t: 'stump', d: 8300 }, { t: 'crystal', d: 8300, h: 470 },
  { t: 'gator', d: 9800 },
  { t: 'potion', d: 10600, h: 60 },
  { t: 'vines', d: 11300 },
  { t: 'spider', d: 12400 },
  { t: 'log', d: 13300 }, { t: 'crystal', d: 13320, h: 300 },
  { t: 'bat', d: 14200, lane: 'low' },
  { t: 'frog', d: 15000 },
  { t: 'crystal', d: 15600, h: 70 },
  { t: 'vines', d: 16300 }, { t: 'log', d: 17200 },
  { t: 'crystal', d: 17800, h: 70 }, { t: 'crystal', d: 18050, h: 70 },
  // the swamp gets crowded: a good place to try Gremlin Meltdown
  { t: 'frog', d: 19300 }, { t: 'bat', d: 19800, lane: 'high' }, { t: 'frog', d: 20300 }, { t: 'gator', d: 21200 }, { t: 'spider', d: 22300 },
  { t: 'stump', d: 23300 },
  { t: 'vines', d: 24300 },
  { t: 'finish', d: 25500 },
];
