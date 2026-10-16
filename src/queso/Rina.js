// Rina, THE QUESO JEFE: animated from Cath's approved character sheet (Cath, 16 Oct 2026: "build the puppet and let's see").
// The sheet has five full-body drawings (front, walking away left, back, looking over her shoulder, the high-kick dance)
// and five close-up expressions. She is animated by switching between the drawings and moving them as a whole
// (leaning from the feet, squash and stretch, hops, spins); her props (chancla, gin) are separate pieces in her hand.
// Her expressions appear as a close-up beside her speech bubble (see the Cartel scene).
// face = 1: facing left (as most drawings are); -1: facing right (mirrored).
// A move = { d: seconds, pose(t), ev: [[time, eventName, ...args]] }, the same pattern as the other bosses.
export const ease = k => (k < 0 ? 0 : k > 1 ? 1 : k * k * (3 - 2 * k));
const D = Math.PI / 180;

// each drawing: texture, where her feet are (fraction of the width), the hand that holds props (art px), and which way it faces
export const DRAW = {
  front: { key: 'q_r_front', ox: 0.35, hand: [300, 155], faces: 1 },
  dance: { key: 'q_r_dance', ox: 0.5, hand: [8, 288], faces: 1 },
  side: { key: 'q_r_side', ox: 0.44, hand: [42, 330], faces: 1 },
  back: { key: 'q_r_back', ox: 0.6, hand: [300, 262], faces: 1 },
  over: { key: 'q_r_over', ox: 0.54, hand: [196, 150], faces: -1 },
};
const ART_H = 676;
const BASE = { img: 'front', lean: 0, dx: 0, dy: 0, sx: 1, sy: 1, rot: 0, prop: null, propRot: 0, mirror: false };
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
const idle = t => P_({ lean: 1.2 * Math.sin(t * 2), sy: 1 + 0.012 * Math.sin(t * 2.4), sx: 1 - 0.006 * Math.sin(t * 2.4) });
const sway = t => P_({ lean: 3 * Math.sin(t * 3.2), dy: -4 * Math.abs(Math.sin(t * 3.2)), sy: 1 + 0.015 * Math.sin(t * 6.4) });   // swaying, sassy
const crouch = () => P_({ img: 'front', lean: -4, sx: 1.05, sy: 0.9 });
const air = () => P_({ img: 'dance', lean: -6, sx: 0.97, sy: 1.04 });
const windChancla = () => P_({ img: 'front', lean: 10, sx: 0.98, sy: 1.03, prop: 'chancla', propRot: -40 });
const release = () => P_({ img: 'dance', lean: -10, dx: -20, sx: 1.02, sy: 0.98 });
const walk = (t, img = 'side') => P_({ img, lean: 4 * Math.sin(t * 9), dy: -10 * Math.abs(Math.sin(t * 9)), sy: 1 + 0.02 * Math.cos(t * 18) });

export const MOVES = {
  entrance: { d: 5.4, pose: t => keys(t, [[0, idle(t)], [0.4, P_({ img: 'dance', lean: -4, dy: -10 })], [2.6, P_({ img: 'dance', lean: -2 + 2 * Math.sin(t * 4), dy: -10 })], [2.9, sway(t)], [5.4, idle(t)]]),
    ev: [[0.4, 'say', 'YOU’VE ENTERED THE WRONG FUCKING NEIGHBOURHOOD.', 2.2, 'angry'], [2.9, 'say', 'Nobody messes with the Queso Jefe.', 2.2, 'smug']] },
  // ---- phase 1: La Chancla of Doom ----
  chancla: { d: 1.25, pose: t => keys(t, [[0, idle(t)], [0.45, windChancla()], [0.62, release()], [1.0, release()], [1.25, idle(t)]]),
    ev: [[0.05, 'taunt', 'chancla'], [0.05, 'chanclaWarn'], [0.6, 'throwChancla']] },
  catch: { d: 0.5, pose: t => keys(t, [[0, release()], [0.12, P_({ img: 'front', lean: 6, sy: 0.96, prop: 'chancla', propRot: 20 })], [0.5, idle(t)]]) },
  // the chancla didn't come back: she stomps over to fetch it, back turned (vulnerable)
  fetch: { d: 99, pose: t => walk(t, 'side') },
  pickup: { d: 1.2, pose: t => keys(t, [[0, P_({ img: 'back', lean: 0 })], [0.35, P_({ img: 'back', lean: -16, sy: 0.9, dy: 10 })], [0.8, P_({ img: 'back', lean: -16, sy: 0.9, dy: 10 })], [1.2, P_({ img: 'front', prop: 'chancla', propRot: 10 })]]),
    ev: [[0.7, 'chanclaBack']] },
  // ---- phase 2: Gin & Tonic Warfare ----
  gin: { d: 1.3, pose: t => keys(t, [[0, idle(t)], [0.45, P_({ img: 'front', lean: 12, sy: 1.03, prop: 'gin', propRot: -30 })], [0.62, release()], [1.0, release()], [1.3, idle(t)]]),
    ev: [[0.05, 'taunt', 'gin'], [0.6, 'throwGin']] },
  // turns her back to pour herself a drink: vulnerable
  pour: { d: 3.4, pose: t => {
      const k = ease(t / 0.3) * (1 - ease((t - 3.1) / 0.3));
      return lerpPose(idle(t), P_({ img: t < 3.1 ? 'back' : 'front', lean: -3 + 2 * Math.sin(t * 2), prop: t < 3.1 ? 'gin' : null, propRot: -70 + 15 * Math.sin(t * 3), sy: 1.01 }), k);
    }, ev: [[0.25, 'vulnerable', 3.0], [0.3, 'say', 'Hold on. Gin o’clock.', 1.6, 'flirt']] },
  // ---- phase 3: The Big Cheese Meltdown ----
  stampede: { d: 2.0, pose: t => keys(t, [[0, idle(t)], [0.4, P_({ img: 'dance', lean: -8, dy: -16 })], [1.6, P_({ img: 'dance', lean: -8 + 3 * Math.sin(t * 20), dy: -16 })], [2.0, idle(t)]]),
    ev: [[0.1, 'say', '¡RATAS! GET THE GREMLIN!', 1.8, 'angry'], [0.3, 'rumble'], [0.5, 'stampede']] },
  // the launcher jams; she turns on Gingy and screams at him (longer vulnerable window)
  scold: { d: 4.4, pose: t => {
      const k = ease(t / 0.3) * (1 - ease((t - 4.1) / 0.3)), w = Math.sin(t * 16);
      return lerpPose(idle(t), P_({ img: 'over', lean: 4 + 3 * w, dy: -6 * Math.abs(w), sx: 1 + 0.02 * w }), k);
    }, ev: [[0.2, 'vulnerable', 4.0], [0.3, 'say', 'GINGY! YOU USELESS LITTLE SHIT!', 2.0, 'angry'], [2.4, 'say', 'I SAID ATTACK THE GREMLIN, NOT ME!', 1.8, 'angry']] },
  // ---- movement ----
  takeoff: { d: 0.28, pose: t => keys(t, [[0, idle(t)], [0.28, crouch()]]) },
  hop: { d: 99, pose: t => keys(t, [[0, crouch()], [0.14, air()], [99, air()]]) },
  land: { d: 0.4, pose: t => keys(t, [[0, crouch()], [0.1, crouch()], [0.4, idle(t)]]) },
  // ---- reactions ----
  hit: { d: 0.45, pose: t => keys(t, [[0, idle(t)], [0.08, P_({ lean: 10, dx: 20, sx: 0.97 })], [0.45, idle(t)]]) },
  hitHeavy: { d: 1.0, pose: t => keys(t, [[0, idle(t)], [0.1, P_({ lean: 18, dx: 50, sy: 0.96 })], [0.5, P_({ lean: 8, dx: 60 })], [1.0, P_({ dx: 0 })]]) },
  // ---- defeat (GDD, locked: "Gin, Gingy & Gravity"); the scene drives most of it ----
  stagger: { d: 99, pose: t => keys(t, [[0, idle(t)], [0.3, P_({ lean: 16, dx: 30, sy: 0.97 })], [1.2, P_({ lean: 10 + 4 * Math.sin(t * 6), dx: 50 })], [99, P_({ lean: 8 + 4 * Math.sin(t * 6), dx: 50 })]]) },
  lastGin: { d: 99, pose: t => P_({ img: 'front', lean: -4 + 2 * Math.sin(t * 3), prop: 'gin', propRot: -10, dy: -4 * Math.abs(Math.sin(t * 3)) }) },
  launched: { d: 99, pose: t => P_({ img: 'dance', rot: t * 900, sx: 0.95, sy: 1.05 }) },
  walkR: { d: 99, pose: t => walk(t, 'over') },
};
export { idle };

export class Rina {
  constructor(scene, x, groundY, height) {
    this.scene = scene;
    this.k = height / ART_H;
    this.x = x; this.groundY = groundY;
    this.floor = 0; this.air = 0; this.sink = 0;
    this.t = 0; this.move = null; this.mt = 0; this.evI = 0; this.from = null; this.blendIn = 0.15; this.last = null;
    this.flashT = 0; this.vulnT = 0; this.timeScale = 1;
    this.face = 1;
    this.onEvent = () => {};
    this.root = scene.add.container(x, groundY).setDepth(8);
    this.body = scene.add.image(0, 0, DRAW.front.key).setOrigin(DRAW.front.ox, 1);
    this.prop = scene.add.image(0, 0, 'q_chancla').setVisible(false);
    this.root.add([this.body, this.prop]);
    this.images = [this.body, this.prop];
    this.update(0);
  }
  play(name) {
    if (['stagger', 'lastGin', 'launched'].includes(this.move) && !['lastGin', 'launched', 'stagger'].includes(name)) return;
    this.from = this.last; this.move = name; this.mt = 0; this.evI = 0; this.blendIn = 0.15;
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
  render(P) {
    const Dw = DRAW[P.img] || DRAW.front;
    if (this.body.texture.key !== Dw.key) this.body.setTexture(Dw.key);
    this.body.setOrigin(Dw.ox, 1);
    // mirror the drawing when she should face the other way from how it was drawn
    const flip = (Dw.faces !== this.face) !== !!P.mirror;
    this.root.setPosition(this.x + P.dx * this.k * (this.face > 0 ? -1 : 1), this.feetY + P.dy * this.k);
    this.root.setScale(this.k * P.sx * (flip ? -1 : 1), this.k * P.sy);
    // lean: tip over from the feet, towards where she faces (positive = leans back)
    this.root.rotation = (P.lean * (this.face > 0 ? 1 : -1) + P.rot) * D;
    // the prop sits in the drawing's prop hand
    this.prop.setVisible(!!P.prop);
    if (P.prop) {
      const key = P.prop === 'gin' ? 'q_gin' : 'q_chancla';
      if (this.prop.texture.key !== key) this.prop.setTexture(key);
      const w = this.body.width, h = this.body.height;
      this.prop.setPosition(Dw.hand[0] - Dw.ox * w, Dw.hand[1] - h).setScale(P.prop === 'gin' ? 0.9 : 0.85).setRotation(P.propRot * D);
    }
    // white flash when hit; warm pulse while vulnerable
    const flash = this.flashT > 0, vul = this.vulnT > 0, mode = flash ? 'flash' : vul ? 'vul' : 'none';
    if (mode !== this._tint || vul) {
      this._tint = mode;
      for (const im of this.images) {
        if (mode === 'flash') im.setTintFill(0xffffff);
        else if (mode === 'vul') { const p = 0.5 + 0.5 * Math.sin(this.t * 14); im.setTint(Phaser.Display.Color.GetColor(255, Math.round(255 - 60 * p), Math.round(255 - 90 * p))); }
        else im.clearTint();
      }
    }
  }
  /** A point on the current drawing (art px from its top-left) in screen space. */
  local(ax, ay) { const Dw = DRAW[this.last?.img || 'front'], w = this.body.width, h = this.body.height; const p = this.root.getWorldTransformMatrix().transformPoint(ax - Dw.ox * w, ay - h); return [p.x, p.y]; }
  handPoint() { const Dw = DRAW[this.last?.img || 'front']; return this.local(Dw.hand[0], Dw.hand[1]); }
  headTop() { return [this.x, this.feetY - 600 * this.k]; }
  /** Body box: touching it hurts (unless she's vulnerable); magic hitting it does damage while she's vulnerable. */
  hurtbox() {
    if (this.sink > 200) return null;
    const k = this.k, top = this.feetY - 610 * k;
    return new Phaser.Geom.Rectangle(this.x - 120 * k, top, 240 * k, 600 * k);
  }
}
