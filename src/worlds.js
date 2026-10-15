// The worlds, in the locked GDD order. Each world = two running stages, then its boss.
import { STAGE1, STAGE2, W2_STAGE1, W2_STAGE2, W3_RUN1 } from './course.js';
import { Swamp, Meadow, Wild, MEADOW_FILES, WILD_FILES } from './world/Swamp.js';
import { GRUNT_PARTS } from './grunt/Grunt.js';
import { MEADOW_CREATURE_PARTS } from './creatures/Creatures.js';

export const WORLDS = {
  1: {
    place: 'The Festering Swamp', stageName: 'THE MOULD SWAMP', boss: 'Boss', bossTitle: 'THE MOULD KING', bossName: 'EDDIE',
    backdrop: Swamp, stages: [STAGE1, STAGE2],
    plats: { small: { key: 'plat_small', size: 'plat_small', s: 1.2 }, medium: { key: 'plat_medium', size: 'plat_medium', s: 0.9 } },
    sizes: s => s.cache.json.get('swampSizes'),
  },
  2: {
    place: 'Meadows of Malicious Happiness', stageName: 'THE MALICIOUS MEADOWS', boss: 'Boss2', bossTitle: 'THE EVIL OVERLORD', bossName: 'CATALYTIK',
    backdrop: Meadow, stages: [W2_STAGE1, W2_STAGE2],
    plats: { long: { key: 'm_plat_long', size: 'plat_long', s: 0.95 }, fence: { key: 'm_plat_fence', size: 'plat_fence', s: 1.15 }, arch: { key: 'm_plat_arch', size: 'plat_arch', s: 1.0 } },
    sizes: s => s.cache.json.get('meadowInfo').sizes,
  },
  3: {
    place: 'Lush Alaskan wilderness', stageName: 'INTO THE WILD', boss: null, bossTitle: 'WRATH OF THE HAIRBALL', bossName: 'GRUNT',
    backdrop: Wild, stages: [W3_RUN1], runNames: ['INTO THE WILD', 'RIVER RUN', 'UZI RAMPAGE', 'FINAL SPRINT'],
    chase: { start: [30, 40, 45, 55] },   // Grunt's starting Proximity Meter for each run (used at the start, and after a death)
    maxHearts: 5, plats: {}, sizes: () => ({}),
  },
};
export const LAST_WORLD = 3;
export const worldNo = registry => registry.get('world') || 1;

/** Queue World 2's art on a scene's loader (only what isn't loaded yet). Call from preload(). */
export function loadMeadow(scene) {
  for (const [k, f] of Object.entries(MEADOW_FILES)) if (!scene.textures.exists(k)) scene.load.image(k, f);
  if (!scene.cache.json.exists('meadowInfo')) scene.load.json('meadowInfo', 'assets/meadow/meadow.json');
  for (const [kind, parts] of Object.entries(MEADOW_CREATURE_PARTS)) for (const n of parts) if (!scene.textures.exists(`c_${kind}_${n}`)) scene.load.image(`c_${kind}_${n}`, `assets/creatures/${kind}_${n}.png`);
}

/** Queue World 3's art (only what isn't loaded yet). */
export function loadWild(scene) {
  for (const [k, f] of Object.entries(WILD_FILES)) if (!scene.textures.exists(k)) scene.load.image(k, f);
  if (!scene.cache.json.exists('wildInfo')) scene.load.json('wildInfo', 'assets/wild/wild.json');
  for (const n of GRUNT_PARTS) if (!scene.textures.exists('gr_' + n)) scene.load.image('gr_' + n, `assets/grunt/${n}.webp`);
  if (!scene.cache.json.exists('gruntRig')) scene.load.json('gruntRig', 'assets/grunt/rig.json');
}
