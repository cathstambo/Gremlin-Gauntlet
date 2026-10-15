// Scrolling world backdrops, built from the approved artwork.
// Layers (back to front), each a seamless loop scrolling at its own speed:
//   far (sky) → mid → near → decorations → ground (the running path).
// Decorations sit behind the path and are dimmed so they never read as obstacles.
// One class (Backdrop) draws any world; SWAMP (World 1) and MEADOW (World 2) are its settings.

const SWAMP_PROPS = ['prop_mush_orange', 'prop_stump', 'prop_bridge', 'prop_skull', 'prop_mush_purple', 'prop_barrel', 'prop_log', 'prop_sign'];
const MEADOW_PROPS = ['m_prop_log', 'm_prop_arch', 'm_prop_rocks', 'm_prop_falls'];

export const SWAMP_FILES = {
  bg_far: 'assets/swamp/bg_far.jpg', bg_mid: 'assets/swamp/bg_mid.webp', bg_near: 'assets/swamp/bg_near.webp', swamp_ground: 'assets/swamp/ground.webp',
  ...Object.fromEntries(SWAMP_PROPS.map(p => [p, `assets/swamp/${p}.webp`])),
  ...Object.fromEntries(['haz_roots', 'haz_vines_hang', 'haz_mould', 'haz_sludge', 'plat_small', 'plat_medium', 'plat_large', 'plat_wood',
    'pick_taco', 'pick_margarita', 'pick_crystal', 'pick_potion'].map(p => [p, `assets/swamp/${p}.webp`])),
};
// World 2 art is only downloaded when World 2 starts (see Run/Overlord preload)
export const MEADOW_FILES = {
  m_far: 'assets/meadow/bg_far.jpg', m_mid: 'assets/meadow/bg_mid.webp', m_near: 'assets/meadow/bg_near.webp', m_ground: 'assets/meadow/ground.webp',
  m_prop_log: 'assets/meadow/prop_log.webp', m_prop_arch: 'assets/meadow/prop_arch.webp', m_prop_rocks: 'assets/meadow/prop_rocks.webp', m_prop_falls: 'assets/meadow/prop_falls.webp',
  m_plat_long: 'assets/meadow/plat_long.webp', m_plat_fence: 'assets/meadow/plat_fence.webp', m_plat_arch: 'assets/meadow/plat_arch.webp',
  m_turret: 'assets/meadow/haz_turret.webp', m_beam: 'assets/meadow/haz_beam.webp',
};

// World 3 art (loaded when World 3 starts)
export const WILD_FILES = Object.fromEntries(['bg_far.jpg', 'bg_mid.webp', 'bg_near.webp', 'ground.webp', 'haz_root.webp', 'haz_trunk.webp', 'haz_boulder.webp',
  'en_wolf.webp', 'en_eagle.webp', 'en_fox.webp', 'dec_cabin.webp', 'dec_sign.webp', 'dec_coffee.webp'].map(f => ['w_' + f.split('.')[0], 'assets/wild/' + f]));

// World 3 run 2, River Run (loaded when that run starts). Bridges, rocks, salmon, moose and bear: see course.js / creatures/River.js.
export const RIVER_FILES = Object.fromEntries(['bg_far', 'bg_mid', 'bg_near', 'ground', 'br_whole', 'br_river', 'br_canyon',
  'rock_s', 'rock_m', 'rock_l', 'salmon', 'splash', 'moose', 'bear_fish', 'bear_swipe'].map(f => ['r_' + f, 'assets/river/' + f + '.webp']));

export const SWAMP = {
  far: 'bg_far', mid: 'bg_mid', near: 'bg_near', ground: 'swamp_ground',
  groundSurface: 100,   // row in the ground strip the gremlin walks on: the middle of the lit path, so hazards sit IN the way
  midBottom: 603, nearBottom: 681, midS: 1.05, nearS: 0.95, gS: 1.0,
  midTint: 0x74827c, nearTint: 0x6c766e,   // background darkened a touch so creatures and hazards stand out
  props: SWAMP_PROPS, propScale: k => k === 'prop_sign' ? 0.8 : 0.56, propTint: k => k === 'prop_sign' ? 0xb0bab0 : 0x6f7a72, propGap: [1150, 650],
};
export const MEADOW = {
  far: 'm_far', mid: 'm_mid', near: 'm_near', ground: 'm_ground',
  groundSurface: 104,
  midBottom: 693, nearBottom: 698, midS: 1.0, nearS: 0.9, gS: 1.0, midDrop: 70, nearDrop: 95,
  midTint: 0xc9d2dc, nearTint: 0xb4bec4,   // the meadow is bright: soften the scenery so enemies and beams pop
  props: MEADOW_PROPS, propScale: () => 0.62, propTint: () => 0xa9b4b0, propGap: [1500, 700],
};

export const WILD = {
  far: 'w_bg_far', mid: 'w_bg_mid', near: 'w_bg_near', ground: 'w_ground',
  groundSurface: 274,   // the dirt path's walking line in the path strip
  // near trees: the art's last solid row is 647 (transparent below it); tucked ~30 px under the path's solid edge, big enough that
  // the flat-cut tree tops (row 62) stay above the screen
  midBottom: 707, nearBottom: 647, midS: 1.25, nearS: 1.55, gS: 1.2, midDrop: -30, nearDrop: -15,
  midTint: 0xffffff, nearTint: 0xffffff, props: [], propScale: () => 1, propTint: () => 0xffffff, propGap: [1000, 100],
  groundBottom: 448,
};
// River Run: Cath's four approved images, checkerboard / sky removed and made seamless (rows below are in the art's own pixels)
export const RIVER = {
  far: 'r_bg_far', mid: 'r_bg_mid', near: 'r_bg_near', ground: 'r_ground',
  groundSurface: 505,   // the middle of the dirt path
  midBottom: 725, nearBottom: 725, midS: 1.05, nearS: 1.25, gS: 1.2, midDrop: -40, nearDrop: 60,
  midTint: 0xffffff, nearTint: 0xffffff, props: [], propScale: () => 1, propTint: () => 0xffffff, propGap: [1000, 100],
  groundBottom: 726,
};

export class Backdrop {
  /** groundY = screen y of the walking surface. props = scatter decorations along the run. */
  constructor(scene, groundY, cfg, { props = true, view = null } = {}) {
    // view = the zoomed-out camera (World 3 test). The far/mid/near layers are then scaled back up so they fill the screen
    // exactly as they do normally (their art has no edges to spare); only the path zooms out with the gameplay.
    const SW = scene.scale.width, SH = scene.scale.height, Z = view ? view.zoom : 1, oy = view ? view.y : 0;
    const bgY = y => y / Z + oy;
    this.scene = scene; this.groundY = groundY; this.cfg = cfg;
    const t = k => scene.textures.get(k).getSourceImage();
    const farS = SH / t(cfg.far).height;
    this.far = scene.add.tileSprite(0, oy, SW / Z, SH / Z, cfg.far).setOrigin(0, 0).setTileScale(farS / Z).setDepth(0);
    const midS = cfg.midS, nearS = cfg.nearS, gS = cfg.gS;
    this.mid = scene.add.tileSprite(0, bgY(groundY + (cfg.midDrop ?? 40) - cfg.midBottom * midS), SW / Z, t(cfg.mid).height * midS / Z, cfg.mid).setOrigin(0, 0).setTileScale(midS / Z).setDepth(1).setTint(cfg.midTint);
    this.near = scene.add.tileSprite(0, bgY(groundY + (cfg.nearDrop ?? 70) - cfg.nearBottom * nearS), SW / Z, t(cfg.near).height * nearS / Z, cfg.near).setOrigin(0, 0).setTileScale(nearS / Z).setDepth(2).setTint(cfg.nearTint);
    this.ground = scene.add.tileSprite(0, groundY - cfg.groundSurface * gS, SW / Z, t(cfg.ground).height * gS, cfg.ground).setOrigin(0, 0).setTileScale(gS).setDepth(4);
    // a second piece of path, used when a bridge crossing replaces the path in the middle of the screen (see setHole)
    this.ground2 = scene.add.tileSprite(0, this.ground.y, 10, this.ground.height, cfg.ground).setOrigin(0, 0).setTileScale(gS).setDepth(4).setVisible(false);
    this.viewW = SW / Z; this.hole = null;
    // zoomed out, the view reaches below the bottom of the path art: dark earth underneath
    if (view) this.under = scene.add.rectangle(0, groundY - cfg.groundSurface * gS + (cfg.groundBottom ?? 448) * gS - 2, SW / Z, 400, 0x1a1208).setOrigin(0, 0).setDepth(3.95);
    // decorations: a fixed, repeating sequence so every run looks the same (fair-comparison rule)
    this.props = [];
    if (props) {
      let x = 700; const [gap, vary] = cfg.propGap;
      for (let i = 0; i < 24; i++) {
        const key = cfg.props[i % cfg.props.length];
        const im = scene.add.image(0, groundY + 4, key).setOrigin(0.5, 1).setScale(cfg.propScale(key)).setDepth(3).setTint(cfg.propTint(key));
        this.props.push({ im, base: x }); x += gap + ((i * 397) % vary);
      }
      this.propSpan = x;
    }
  }
  /** Hide the path between screen x a and b (a bridge crossing is there); setHole(null) = path everywhere. */
  setHole(a, b) { this.hole = a == null ? null : [a, b]; }
  /** dist = how far the world has scrolled, in screen px. */
  scroll(dist) {
    this.far.tilePositionX = dist * 0.08 / this.far.tileScaleX;
    this.mid.tilePositionX = dist * 0.25 / this.mid.tileScaleX;
    this.near.tilePositionX = dist * 0.55 / this.near.tileScaleX;
    const gs = this.ground.tileScaleX, W = this.viewW;
    if (this.hole) {   // the path stops at a <-> b (a bridge's own banks take over there)
      const a = Math.max(0, Math.min(W, this.hole[0])), b = Math.max(0, Math.min(W, this.hole[1]));
      this.ground.setVisible(a > 0).setSize(Math.max(1, a), this.ground.height);
      this.ground2.setVisible(b < W).setPosition(b, this.ground.y).setSize(Math.max(1, W - b), this.ground.height);
      this.ground2.tilePositionX = (dist + b) / gs;
    } else {
      this.ground.setVisible(true).setSize(W, this.ground.height); this.ground2.setVisible(false);
    }
    this.ground.tilePositionX = dist / gs;
    const pd = dist * 0.85;   // decorations sit just behind the path
    for (const p of this.props) { let x = p.base - (pd % this.propSpan); if (x < -500) x += this.propSpan; p.im.x = x; }
  }
}

/** World 1: The Festering Swamp. */
export class Swamp extends Backdrop {
  constructor(scene, groundY, opts) { super(scene, groundY, SWAMP, opts); }
}
/** World 3: lush Alaskan wilderness (Into the Wild). */
export class Wild extends Backdrop {
  constructor(scene, groundY, opts) { super(scene, groundY, WILD, { props: false, ...opts }); }
}
/** World 3 run 2: River Run. */
export class River extends Backdrop {
  constructor(scene, groundY, opts) { super(scene, groundY, RIVER, { props: false, ...opts }); }
}
/** World 2: Meadows of Malicious Happiness. */
export class Meadow extends Backdrop {
  constructor(scene, groundY, opts) { super(scene, groundY, MEADOW, opts); }
}
