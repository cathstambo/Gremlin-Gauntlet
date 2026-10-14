// World 1 backdrop: The Mould Swamp, built from the approved artwork.
// Layers (back to front), each a seamless loop scrolling at its own speed:
//   far (sky, moon, ruins) → mid (trees, waterfalls) → near (bridges, stumps, mushrooms) → decorations → ground (the running path).
// Decorations sit behind the path and are slightly darkened so they never read as obstacles.
const PROPS = ['prop_mush_orange', 'prop_stump', 'prop_bridge', 'prop_skull', 'prop_mush_purple', 'prop_barrel', 'prop_log', 'prop_sign'];

export const SWAMP_FILES = {
  bg_far: 'assets/swamp/bg_far.jpg', bg_mid: 'assets/swamp/bg_mid.webp', bg_near: 'assets/swamp/bg_near.webp', swamp_ground: 'assets/swamp/ground.webp',
  ...Object.fromEntries(PROPS.map(p => [p, `assets/swamp/${p}.webp`])),
  ...Object.fromEntries(['haz_roots', 'haz_vines_hang', 'haz_mould', 'haz_sludge', 'plat_small', 'plat_medium', 'plat_large', 'plat_wood',
    'pick_taco', 'pick_margarita', 'pick_crystal', 'pick_potion'].map(p => [p, `assets/swamp/${p}.webp`])),
};

// art measurements (pixels in the prepared files)
const GROUND_SURFACE = 100;     // row in ground.webp the gremlin walks on: the middle of the lit path, so hazards sit IN the way, not behind it
const MID_BOTTOM = 603, NEAR_BOTTOM = 681;

export class Swamp {
  /** groundY = screen y of the walking surface. props = scatter decorations along the run. */
  constructor(scene, groundY, { props = true } = {}) {
    const W = scene.scale.width, H = scene.scale.height;
    this.scene = scene; this.groundY = groundY;
    const t = k => scene.textures.get(k).getSourceImage();
    const farS = H / t('bg_far').height;
    this.far = scene.add.tileSprite(0, 0, W, H, 'bg_far').setOrigin(0, 0).setTileScale(farS).setDepth(0);
    const midS = 1.05, nearS = 0.95, gS = 1.0;
    this.mid = scene.add.tileSprite(0, groundY + 40 - MID_BOTTOM * midS, W, t('bg_mid').height * midS, 'bg_mid').setOrigin(0, 0).setTileScale(midS).setDepth(1).setTint(0x74827c);   // background darkened a touch so creatures and hazards stand out
    this.near = scene.add.tileSprite(0, groundY + 70 - NEAR_BOTTOM * nearS, W, t('bg_near').height * nearS, 'bg_near').setOrigin(0, 0).setTileScale(nearS).setDepth(2).setTint(0x6c766e);
    this.ground = scene.add.tileSprite(0, groundY - GROUND_SURFACE * gS, W, t('swamp_ground').height * gS, 'swamp_ground').setOrigin(0, 0).setTileScale(gS).setDepth(4);
    // decorations: a fixed, repeating sequence so every run looks the same (fair-comparison rule)
    this.props = [];
    if (props) {
      let x = 700;
      for (let i = 0; i < 24; i++) {
        const key = PROPS[i % PROPS.length];
        // decorations stand at the back edge of the path and are dimmed, so only real hazards look bright and "in the way"
        const im = scene.add.image(0, groundY + 4, key).setOrigin(0.5, 1).setScale(key === 'prop_sign' ? 0.8 : 0.56).setDepth(3).setTint(key === 'prop_sign' ? 0xb0bab0 : 0x6f7a72);
        this.props.push({ im, base: x }); x += 1150 + ((i * 397) % 650);
      }
      this.propSpan = x;
    }
  }
  /** dist = how far the world has scrolled, in screen px. */
  scroll(dist) {
    const farS = this.far.tileScaleX;
    this.far.tilePositionX = dist * 0.08 / farS;
    this.mid.tilePositionX = dist * 0.25 / this.mid.tileScaleX;
    this.near.tilePositionX = dist * 0.55 / this.near.tileScaleX;
    this.ground.tilePositionX = dist / this.ground.tileScaleX;
    const pd = dist * 0.85;   // decorations sit just behind the path
    for (const p of this.props) { let x = p.base - (pd % this.propSpan); if (x < -500) x += this.propSpan; p.im.x = x; }
  }
}
