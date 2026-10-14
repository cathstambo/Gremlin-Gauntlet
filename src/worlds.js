// The worlds, in the locked GDD order. Each world = two running stages, then its boss.
import { STAGE1, STAGE2, W2_STAGE1, W2_STAGE2 } from './course.js';
import { Swamp, Meadow, MEADOW_FILES } from './world/Swamp.js';
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
};
export const LAST_WORLD = 2;
export const worldNo = registry => registry.get('world') || 1;

/** Queue World 2's art on a scene's loader (only what isn't loaded yet). Call from preload(). */
export function loadMeadow(scene) {
  for (const [k, f] of Object.entries(MEADOW_FILES)) if (!scene.textures.exists(k)) scene.load.image(k, f);
  if (!scene.cache.json.exists('meadowInfo')) scene.load.json('meadowInfo', 'assets/meadow/meadow.json');
  for (const [kind, parts] of Object.entries(MEADOW_CREATURE_PARTS)) for (const n of parts) if (!scene.textures.exists(`c_${kind}_${n}`)) scene.load.image(`c_${kind}_${n}`, `assets/creatures/${kind}_${n}.png`);
}
