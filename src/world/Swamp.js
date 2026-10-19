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

// World 3 run 3, Uzi Rampage (loaded when that run starts).
export const CANYON_FILES = Object.fromEntries(['bg_far', 'bg_mid', 'bg_near', 'ground', 'rock1', 'rock2', 'rock3', 'rock4', 'rock_land',
  'rock_rest', 'rock_rest_s', 'branch1', 'branch2', 'branch3', 'shelf1', 'shelf2', 'shelf3',
  'dec_almost', 'dec_youcan', 'dec_rungremlin', 'dec_camp', 'goat_body', 'goat_head'].map(f => ['u_' + f, 'assets/uzi/' + f + '.webp']));

// World 3 run 4, Final Sprint (loaded when that run starts): backgrounds, plus Grunt's giant paw and the hairball (ending).
export const SPRINT_FILES = Object.fromEntries(['bg_far', 'bg_mid', 'bg_near', 'ground', 'paw_down', 'paw_hit', 'paw_planted',
  'hairball', 'hairball_roll', 'hairball_burst', 'fishbone', 'dust', 'hair1', 'hair2'].map(f => ['f_' + f, 'assets/sprint/' + f + '.webp']));

// World 4, Queso Jefe (Rina, The Cheddar Cartel): backgrounds, run hazards/enemies, Gingy, and Rina's arena art (loaded when World 4 starts)
export const QUESO_FILES = Object.fromEntries(['bg_mid', 'bg_near', 'ground',
  'moz1', 'moz2', 'mozstr', 'crk', 'crk_fly', 'crk_break', 'cliff_l', 'cliff_r', 'isl1', 'isl2', 'isl3', 'river',
  'rat1', 'rat2', 'rat3', 'rat_leap', 'rat_hit', 'rat_dead', 'arat1', 'arat2', 'arat_crack', 'arat_b1', 'arat_b2', 'arat_dead',
  'gant1', 'gant2', 'gant_open', 'gant_break', 'wfall', 'splat1', 'splat2', 'crash', 'wheel', 'wheel_smash',
  'g_front', 'g_side', 'g_wave', 'g_kick', 'g_run', 'g_cheer', 'g_spoon', 'g_cheese', 'g_panic', 'g_fall', 'g_dizzy', 'g_chunk',
  'gt_hold', 'gt_lift', 'gt_throw', 'chunk1', 'chunk2', 'csplash', 'cdust', 'ring'].map(f => ['q_' + f, 'assets/queso/' + f + '.webp']));
QUESO_FILES.q_bg_far = 'assets/queso/bg_far.jpg';
export const RINA_FILES = Object.fromEntries(['r_front', 'r_side', 'r_back', 'r_over', 'r_dance', 'p_smug', 'p_laugh', 'p_flirt', 'p_angry', 'p_shock',
  'chancla', 'chancla_top', 'gin', 'gin_tilt', 'gin_shatter', 'gin_splash', 'gin_pud1', 'gin_pud2', 'c_load', 'c_fire', 'c_empty', 'c_broken',
  'pool1', 'pool2', 'pack', 'r_legs', 'arena_near', 'arena_mid'].map(f => ['q_' + f, 'assets/queso/' + f + '.webp']));

// World 5, Dungeon of Questionable Pleasures (Sylvanas, LASER TITS): run art, and the boss arena art (loaded when World 5 starts)
export const DUNGEON_FILES = Object.fromEntries(['bg_mid', 'bg_near', 'ground',
  'maid1', 'maid2', 'maid3', 'maid_throw', 'maid_throw2', 'maid_dead', 'hound1', 'hound2', 'hound_leap', 'hound_crouch', 'hound_dead',
  'garg1', 'garg2', 'garg_swoop', 'garg_dead', 'knight1', 'knight_wind', 'knight_swing', 'knight_paddle',
  'mimic_shut', 'mimic_open', 'mimic_tongue', 'mimic_lash', 'mimic_dead', 'paddle',
  'flogger', 'cross_up', 'cross_tip', 'cross_down', 'plate', 'spikes', 'flame0', 'flame1', 'flame2', 'flame3', 'flame4', 'flame5', 'bench',
  'reception', 'knitter', 'reader', 'polisher', 'sign_tacos', 'sign_refunds', 'sign_fivestar', 'sign_dungeon', 'sign_ways', 'candles', 'gargoyle_torch',
  'beam', 'beam2', 'spark', 'ring'].map(f => ['d_' + f, 'assets/dungeon/' + f + '.webp']));
DUNGEON_FILES.d_bg_far = 'assets/dungeon/bg_far.jpg';
export const SYLV_FILES = Object.fromEntries(['s_front', 's_reach', 's_battle', 's_back', 's_side', 's_walk', 's_lunge', 's_side2', 's_walk2', 's_throw', 's_hurt',
  'f_smug', 'f_angry', 'f_shock', 'f_hurt', 'l_charge', 'l_recover', 'l_charge2', 'bench_l', 'bench_m', 'bench_s', 'floor',
  'nov_pink_s', 'nov_cyan_s', 'nov_purple_s', 'nov_lime_s', 'nov_pink_l', 'nov_cyan_l', 'nov_purple_l', 'nov_lime_l', 'chest'].map(f => ['d_' + f, 'assets/dungeon/' + f + '.webp']));
SYLV_FILES.d_arena_bg = 'assets/dungeon/arena_bg.jpg';

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
    if (view || cfg.under) this.under = scene.add.rectangle(0, groundY - cfg.groundSurface * gS + (cfg.groundBottom ?? 448) * gS - 2, SW / Z, 400, cfg.under || 0x1a1208).setOrigin(0, 0).setDepth(3.95);
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
// Uzi Rampage: Cath's four approved canyon images (made seamless; the curved path was levelled so the trail runs flat)
export const CANYON = {
  far: 'u_bg_far', mid: 'u_bg_mid', near: 'u_bg_near', ground: 'u_ground',
  groundSurface: 131,   // the middle of the dirt trail (after levelling)
  midBottom: 715, nearBottom: 722, midS: 1.05, nearS: 1.25, gS: 1.2, midDrop: -60, nearDrop: 50,
  midTint: 0xffffff, nearTint: 0xffffff, props: [], propScale: () => 1, propTint: () => 0xffffff, propGap: [1000, 100],
  groundBottom: 251,
};
// Final Sprint: Cath's four approved images (baked black removed, a sky painted in behind the far mountains, the path levelled)
export const SPRINT = {
  far: 'f_bg_far', mid: 'f_bg_mid', near: 'f_bg_near', ground: 'f_ground',
  groundSurface: 412,
  midBottom: 714, nearBottom: 739, midS: 1.05, nearS: 1.2, gS: 1.2, midDrop: -70, nearDrop: 40,
  midTint: 0xffffff, nearTint: 0xffffff, props: [], propScale: () => 1, propTint: () => 0xffffff, propGap: [1000, 100],
  groundBottom: 520,
};
// World 4: the cheese village (Cath's four approved images; checkerboard removed, made seamless)
export const QUESO = {
  far: 'q_bg_far', mid: 'q_bg_mid', near: 'q_bg_near', ground: 'q_ground',
  groundSurface: 475,   // the middle of the cobbled street's top
  midBottom: 684, nearBottom: 670, midS: 0.95, nearS: 1.0, gS: 1.25, midDrop: -130, nearDrop: -14,
  midTint: 0xa8a2b4, nearTint: 0x9a9088,   // the village is busy and cheese-coloured: set it back so rats, wheels and crackers stand out props: [], propScale: () => 1, propTint: () => 0xffffff, propGap: [1000, 100],
  groundBottom: 650,
};
/** World 4: Queso Jefe's cheese village. */
export class Queso extends Backdrop {
  constructor(scene, groundY, opts) { super(scene, groundY, QUESO, { props: false, ...opts }); }
}
// World 5: the dungeon (Cath's four approved images; checkerboard removed, made seamless)
export const DUNGEON = {
  far: 'd_bg_far', mid: 'd_bg_mid', near: 'd_bg_near', ground: 'd_ground',
  groundSurface: 350,   // the middle of the flagstone walkway's top
  midBottom: 700, nearBottom: 505, midS: 1.0, nearS: 1.4, gS: 1.35, midDrop: -120, nearDrop: -30,
  midTint: 0x7c7488, nearTint: 0x8c8088, under: 0x15101a,   // the dungeon is dark and busy: set it well back so skeletons and traps stand out props: [], propScale: () => 1, propTint: () => 0xffffff, propGap: [1000, 100],
  groundBottom: 465,
};
/** World 5: Dungeon of Questionable Pleasures. */
export class Dungeon extends Backdrop {
  constructor(scene, groundY, opts) { super(scene, groundY, DUNGEON, { props: false, ...opts }); }
}
/** World 3 run 4: Final Sprint. */
export class Sprint extends Backdrop {
  constructor(scene, groundY, opts) { super(scene, groundY, SPRINT, { props: false, ...opts }); }
}
/** World 3 run 3: Uzi Rampage. */
export class Canyon extends Backdrop {
  constructor(scene, groundY, opts) { super(scene, groundY, CANYON, { props: false, ...opts }); }
}
/** World 3 run 2: River Run. */
export class River extends Backdrop {
  constructor(scene, groundY, opts) { super(scene, groundY, RIVER, { props: false, ...opts }); }
}
/** World 2: Meadows of Malicious Happiness. */
export class Meadow extends Backdrop {
  constructor(scene, groundY, opts) { super(scene, groundY, MEADOW, opts); }
}
