// Sylvanas, LASER TITS: animated from Cath's approved pose sheet and laser sheet (same method as Rina: switch between the
// approved full-body drawings and move them as a whole — lean, squash and stretch, hops — with effects drawn by the scene).
// face = 1: facing left; -1: facing right. Each drawing says which way it was drawn (faces) and how tall a standing Sylvanas is
// in its own pixels (u), so every drawing appears at the same size on screen.
// A move = { d: seconds, pose(t), ev: [[time, eventName, ...args]] }, the same pattern as the other bosses.
export const ease = k => (k < 0 ? 0 : k > 1 ? 1 : k * k * (3 - 2 * k));
const D = Math.PI / 180;

export const DRAW = {
  front: { key: 'd_s_front', ox: 0.5, u: 421, faces: 1 },
  reach: { key: 'd_s_reach', ox: 0.55, u: 420, faces: 1, hand: [20, 75] },
  battle: { key: 'd_s_battle', ox: 0.5, u: 400, faces: 1 },
  back: { key: 'd_s_back', ox: 0.5, u: 421, faces: 1 },
  side: { key: 'd_s_side', ox: 0.5, u: 296, faces: -1 },
  side2: { key: 'd_s_side2', ox: 0.5, u: 289, faces: -1 },
  walk: { key: 'd_s_walk', ox: 0.5, u: 295, faces: -1 },
  walk2: { key: 'd_s_walk2', ox: 0.5, u: 285, faces: -1 },
  lunge: { key: 'd_s_lunge', ox: 0.5, u: 300, faces: -1 },
  throw: { key: 'd_s_throw', ox: 0.6, u: 300, faces: 1, hand: [12, 62] },
  hurt: { key: 'd_s_hurt', ox: 0.5, u: 300, faces: -1 },
  charge: { key: 'd_l_charge', ox: 0.5, u: 346, faces: -1, chest: [205, 105] },
  charge2: { key: 'd_l_charge2', ox: 0.5, u: 362, faces: -1, chest: [205, 118] },
  recover: { key: 'd_l_recover', ox: 0.5, u: 345, faces: -1 },
};
const BASE = { img: 'front', lean: 0, dx: 0, dy: 0, sx: 1, sy: 1, rot: 0 };
export const P_ = o => Object.assign({}, BASE, o);
function lerpPose(a, b, k) {
  const o = {};
  for (const key in b) { const va = a[key], vb = b[key]; o[key] = (typeof vb === 'number' && typeof va === 'number') ? va + (vb - va) * k : (k < 0.5 ? va : vb); }
  return o;
}
function keys(t, list) {
  for (let i = 0; i < list.length - 1; i++) {
    const [t0, p0] = list[i], [t1, p1] = list[i + 1];
    if (t <= t1) return lerpPose(typeof p0 === 'function' ? p0(t) : p0, typeof p1 === 'function' ? p1(t) : p1, ease((t - t0) / (t1 - t0)));
  }
  const l = list[list.length - 1][1]; return typeof l === 'function' ? l(t) : l;
}

// ---------- poses ----------
const idle = t => P_({ img: 'battle', lean: 1.2 * Math.sin(t * 2), sy: 1 + 0.012 * Math.sin(t * 2.4), sx: 1 - 0.006 * Math.sin(t * 2.4) });
const crouch = () => P_({ img: 'lunge', lean: -3, sx: 1.04, sy: 0.92 });
const air = () => P_({ img: 'side', lean: -4, sx: 0.97, sy: 1.04 });
const charge = t => P_({ img: 'charge', lean: 2 * Math.sin(t * 30), sx: 1 + 0.01 * Math.sin(t * 40) });

export const MOVES = {
  entrance: { d: 7.2, pose: t => keys(t, [[0, idle(t)], [0.3, P_({ img: 'reach', lean: -3 })], [2.4, P_({ img: 'reach', lean: -3 + Math.sin(t * 3) })], [2.6, P_({ img: 'front', sy: 1.02 })],
    [4.6, P_({ img: 'front', sy: 1.02 })], [4.8, charge(t)], [6.8, charge(t)], [7.2, idle(t)]]),
    ev: [[0.3, 'say', 'WELCOME TO MY DUNGEON, YOU MISERABLE LITTLE SHIT!', 2.2, 'angry'], [2.6, 'say', 'PREPARE TO EXPERIENCE THE FULL FORCE OF MY TITS!', 2.1, 'smug'],
      [4.8, 'say', 'NOW LET’S GET THIS PARTY STARTED!', 2.0, 'smug'], [4.8, 'chestGlow', 2.0]] },
  // ---- lasers: charge (chest glows, aiming line), fire, hold ----
  laser: { d: 1.75, pose: t => t < 0.9 ? charge(t) : P_({ img: 'charge2', lean: -4, dx: -6 + 4 * Math.sin(t * 50) }),
    ev: [[0.02, 'laserWarn'], [0.05, 'taunt', 'laser'], [0.9, 'laserFire']] },
  // armour overheated: she stands still, steaming (vulnerable)
  overheat: { d: 3.3, pose: t => P_({ img: 'recover', lean: 3 + 1.5 * Math.sin(t * 3), sy: 0.98 }),
    ev: [[0.1, 'vulnerable', 3.1], [0.1, 'steam', 3.1], [0.2, 'say', 'Hot. Hot. HOT.', 1.4, 'hurt']] },
  ultimate: { d: 3.0, pose: t => t < 1.7 ? P_({ img: 'charge', lean: 3 * Math.sin(t * 40), sx: 1 + 0.03 * Math.sin(t * 30), sy: 1.02 }) : P_({ img: 'charge2', lean: -6, dx: 6 * Math.sin(t * 60) }),
    ev: [[0.05, 'ultimateWarn'], [0.1, 'say', 'YOU WANTED THE FULL EXPERIENCE? HERE IT FUCKING COMES!', 1.7, 'angry'], [1.7, 'ultimateFire']] },
  meltdown: { d: 4.4, pose: t => P_({ img: 'hurt', lean: 2 * Math.sin(t * 2) }),
    ev: [[0.1, 'vulnerable', 4.2], [0.1, 'steam', 4.2], [0.3, 'say', 'NOBODY LEAVES MY DUNGEON UNSATISFIED!', 2.0, 'hurt']] },
  // ---- the novelty arsenal ----
  throw: { d: 1.05, pose: t => keys(t, [[0, idle(t)], [0.35, P_({ img: 'side', lean: 8, sx: 0.98 })], [0.5, P_({ img: 'throw', lean: -6 })], [0.85, P_({ img: 'throw', lean: -4 })], [1.05, idle(t)]]),
    ev: [[0.05, 'taunt', 'novelty'], [0.5, 'throwNovelty']] },
  // reloading: back turned, rummaging in her chest of goodies (vulnerable, stays put)
  reload: { d: 3.3, pose: t => P_({ img: 'back', lean: -2 + 1.5 * Math.sin(t * 6), sy: 1 - 0.01 * Math.abs(Math.sin(t * 6)) }),
    ev: [[0.1, 'vulnerable', 3.1], [0.2, 'say', 'Hang on. Reloading.', 1.4, 'smug']] },
  // ---- movement ----
  takeoff: { d: 0.28, pose: t => keys(t, [[0, idle(t)], [0.28, crouch()]]) },
  hop: { d: 99, pose: t => keys(t, [[0, crouch()], [0.14, air()], [99, air()]]) },
  land: { d: 0.4, pose: t => keys(t, [[0, crouch()], [0.1, crouch()], [0.4, idle(t)]]) },
  walk: { d: 99, pose: t => P_({ img: (t * 3) % 2 < 1 ? 'walk' : 'walk2', dy: -6 * Math.abs(Math.sin(t * 9)) }) },
  // ---- reactions ----
  hit: { d: 0.45, pose: t => keys(t, [[0, idle(t)], [0.08, P_({ img: 'battle', lean: 10, dx: 20, sx: 0.97 })], [0.45, idle(t)]]) },
  hitHeavy: { d: 1.0, pose: t => keys(t, [[0, idle(t)], [0.1, P_({ img: 'hurt', lean: 10, dx: 40 })], [0.6, P_({ img: 'hurt', lean: 6, dx: 50 })], [1.0, P_({ img: 'battle', dx: 0 })]]) },
  // ---- defeat (the scene drives the story) ----
  stagger: { d: 99, pose: t => P_({ img: 'hurt', lean: 6 + 5 * Math.sin(t * 5), dx: 4 * Math.sin(t * 40) * Math.max(0, 1 - t / 3) }) },
  sitBed: { d: 99, pose: t => P_({ img: 'hurt', lean: -4 + 2 * Math.sin(t * 2), sy: 0.97 }) },
  furious: { d: 99, pose: t => P_({ img: 'reach', lean: -4 + 3 * Math.sin(t * 9), dy: -4 * Math.abs(Math.sin(t * 9)) }) },
  zap: { d: 99, pose: t => P_({ img: 'charge2', lean: -2 }) },
  carried: { d: 99, pose: t => P_({ img: 'side', rot: 90 + 6 * Math.sin(t * 12) }) },
};
export { idle };

export class Sylvanas {
  constructor(scene, x, groundY, height) {
    this.scene = scene; this.H = height;
    this.x = x; this.groundY = groundY;
    this.floor = 0; this.air = 0; this.sink = 0;
    this.t = 0; this.move = null; this.mt = 0; this.evI = 0; this.from = null; this.blendIn = 0.12; this.last = null;
    this.flashT = 0; this.vulnT = 0; this.timeScale = 1;
    this.face = 1;
    this.onEvent = () => {};
    this.root = scene.add.container(x, groundY).setDepth(8);
    this.body = scene.add.image(0, 0, DRAW.front.key).setOrigin(0.5, 1);
    this.root.add(this.body);
    this.images = [this.body];
    this.update(0);
  }
  play(name) {
    if (['stagger', 'sitBed', 'furious', 'zap', 'carried'].includes(this.move) && !['stagger', 'sitBed', 'furious', 'zap', 'carried', 'walk'].includes(name)) return;
    this.from = this.last; this.move = name; this.mt = 0; this.evI = 0; this.blendIn = 0.12;
  }
  stop() { this.from = this.last; this.move = null; this.mt = 0; }
  get busy() { return !!this.move; }
  get vulnerable() { return this.vulnT > 0; }
  pose() {
    let P = this.move ? MOVES[this.move].pose(this.mt) : idle(this.t);
    if (this.from && this.mt < this.blendIn) P = lerpPose(this.from, P, ease(this.mt / this.blendIn));
    return P;
  }
  update(dt) {
    this.t += dt;
    this.flashT = Math.max(0, this.flashT - dt); this.vulnT = Math.max(0, this.vulnT - dt);
    if (this.move) {
      const m = MOVES[this.move]; this.mt += dt * this.timeScale;
      const ev = m.ev || [];
      while (this.evI < ev.length && this.mt >= ev[this.evI][0]) { const [, name, ...args] = ev[this.evI++]; this.onEvent(name, ...args); }
      if (this.mt >= m.d) { const done = this.move; this.from = this.pose(); this.move = null; this.mt = 0; this.onEvent('moveDone', done); }
    }
    const P = this.pose(); this.last = P;
    this.render(P);
  }
  get feetY() { return this.groundY - this.floor - this.air + this.sink; }
  /** Screen pixels per art pixel for the current drawing. */
  get kk() { const Dw = DRAW[this.last?.img || 'front']; return this.H / Dw.u; }
  render(P) {
    const Dw = DRAW[P.img] || DRAW.front, k = this.H / Dw.u;
    if (this.body.texture.key !== Dw.key) this.body.setTexture(Dw.key);
    this.body.setOrigin(Dw.ox, 1);
    const flip = Dw.faces !== this.face;
    this.root.setPosition(this.x + P.dx * k * (this.face > 0 ? -1 : 1), this.feetY + P.dy * k);
    this.root.setScale(k * P.sx * (flip ? -1 : 1), k * P.sy);
    this.root.rotation = (P.lean * (this.face > 0 ? 1 : -1) + P.rot) * D;
    // white flash when hit; warm pulse while vulnerable
    const flash = this.flashT > 0, vul = this.vulnT > 0, mode = flash ? 'flash' : vul ? 'vul' : 'none';
    if (mode !== this._tint || vul) {
      this._tint = mode;
      if (mode === 'flash') this.body.setTintFill(0xffffff);
      else if (mode === 'vul') { const p = 0.5 + 0.5 * Math.sin(this.t * 14); this.body.setTint(Phaser.Display.Color.GetColor(255, Math.round(255 - 50 * p), Math.round(255 - 10 * p))); }
      else this.body.clearTint();
    }
  }
  /** A point on the current drawing (its own pixels from the top-left) in screen space. */
  local(ax, ay) { const Dw = DRAW[this.last?.img || 'front'], w = this.body.width, h = this.body.height; const p = this.root.getWorldTransformMatrix().transformPoint(ax - Dw.ox * w, ay - h); return [p.x, p.y]; }
  chestPoint() { const Dw = DRAW[this.last?.img || 'front']; if (Dw.chest) return this.local(Dw.chest[0], Dw.chest[1]); return [this.x - 30 * this.face, this.feetY - this.H * 0.72]; }
  handPoint() { const Dw = DRAW[this.last?.img || 'front']; if (Dw.hand) return this.local(Dw.hand[0], Dw.hand[1]); return [this.x - 80 * this.face, this.feetY - this.H * 0.75]; }
  headTop() { return [this.x, this.feetY - this.H * 0.98]; }
  hurtbox() {
    if (this.sink > 200) return null;
    const top = this.feetY - this.H * 0.95;
    return new Phaser.Geom.Rectangle(this.x - this.H * 0.17, top, this.H * 0.34, this.H * 0.93);
  }
}
