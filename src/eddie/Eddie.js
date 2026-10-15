// Eddie on screen: the cut-out rig as a chain of Phaser containers, plus position, moves, sinking and hit flashes.
// The Boss scene decides WHAT he does (attacks, hops, dives); this class makes it look right.
import { makeEddieRig, ORDER, P_, lerpPose, ease, clamp } from './moves.js?v=20261015115532';

export class Eddie {
  constructor(scene, x, groundY, height) {
    this.scene = scene;
    this.R = makeEddieRig(scene.cache.json.get('eddieRig'));
    this.RIG = this.R.RIG;
    this.k = height / 985;
    this.x = x; this.groundY = groundY;
    this.floor = 0;          // px above ground he stands on
    this.air = 0;            // px above his floor while hopping
    this.sink = 0;           // px pushed below the ground (dives, defeat)
    this.t = 0; this.move = null; this.mt = 0; this.evI = 0; this.from = null; this.blendIn = 0.18; this.last = null;
    this.flashT = 0; this.vulnT = 0; this.timeScale = 1;
    this.face = 1;   // 1 = facing left (as drawn), -1 = facing right
    this.onEvent = () => {};
    this.build();
    this.update(0);
  }

  build() {
    const sc = this.scene, R = this.RIG, J = this.R.J, T = this.R.T, k = this.k;
    this.root = sc.add.container(this.x, this.groundY).setScale(k).setDepth(8);
    this.dxC = sc.add.container(0, 0); this.scaleC = sc.add.container(0, 0); this.torsoC = sc.add.container(0, 0);
    this.root.add(this.dxC); this.dxC.add(this.scaleC); this.scaleC.add(this.torsoC);
    this.jointCs = {}; this.images = [];
    const chain = names => {
      let parent = this.torsoC;
      for (const n of names) { const c = sc.add.container(J[n][1][0], J[n][1][1]); parent.add(c); parent = c; (this.jointCs[n] ||= []).push(c); }
      return parent;
    };
    const img = (name, parent, pivotOf = name) => {
      const p = R[name], pv = pivotOf === 'torso' ? T : this.R.imgPivot(pivotOf);
      const im = sc.add.image(p.x - pv[0], p.y - pv[1], 'e_' + name).setOrigin(0, 0);
      parent.add(im); this.images.push(im); return im;
    };
    img('upF', chain(['upF'])); img('foF', chain(['upF', 'foF']));
    img('thF', chain(['thF'])); img('shF', chain(['thF', 'shF']));
    img('thN', chain(['thN'])); img('shN', chain(['thN', 'shN']));
    // torso: top as one piece, the rag skirt below the belt as thin strips that sway like cloth
    const tp = R.torso, split = 590 - tp.y;   // below the belt, the rag skirt sways
    const top = sc.add.image(tp.x - T[0], tp.y - T[1], 'e_torso').setOrigin(0, 0).setCrop(0, 0, tp.w, split);
    this.torsoC.add(top); this.images.push(top);
    this.strips = [];
    for (let y = split; y < tp.h; y += 8) {
      const s = sc.add.image(tp.x - T[0], tp.y - T[1], 'e_torso').setOrigin(0, 0).setCrop(0, y, tp.w, 9);
      s.d = (y - split) / (tp.h - split); s.baseX = tp.x - T[0];
      this.torsoC.add(s); this.strips.push(s); this.images.push(s);
    }
    const headC = chain(['head']);
    this.faces = { null: img('head', headC) };
    for (const f of ['shout', 'chomp', 'hurt']) { const im = img('face_' + f, headC, 'head'); im.setVisible(false); this.faces[f] = im; }
    img('upN', chain(['upN']));
    const foC = chain(['upN', 'foN']); img('foN', foC);
    // things held in the near hand
    const hp = this.R.imgPivot('foN'), hx = R._hand[0] - hp[0], hy = R._hand[1] - hp[1];
    this.heldRock = sc.add.image(hx, hy + 4, 'e_rock_s1').setScale(0.7 * 0.9).setVisible(false);
    this.heldBlob = sc.add.image(hx, hy + 10, 'mouldBomb').setScale(1 / k * 0.55).setVisible(false);
    this.heldNet = sc.add.image(hx, hy + 40, 'mouldNet').setScale(1 / k * 0.45).setVisible(false);
    foC.add([this.heldRock, this.heldBlob, this.heldNet]);
    // mask: everything below the ground line is hidden (for sinking into the mud)
    this.maskG = sc.make.graphics({ x: 0, y: 0, add: false });
    this.maskG.fillStyle(0xffffff).fillRect(-400, -2000, 4000, this.groundY + 2000 + 6);
    this.root.setMask(this.maskG.createGeometryMask());
  }

  // ---------- moves ----------
  play(name) {
    if (this.move === 'defeat' && name !== 'defeat') return;
    this.from = this.last; this.move = name; this.mt = 0; this.evI = 0; this.blendIn = 0.18;
  }
  stop() { this.from = this.last; this.move = null; this.mt = 0; }
  get busy() { return !!this.move; }
  get vulnerable() { return this.vulnT > 0; }
  pose() {
    let P;
    if (!this.move) P = this.R.idle(this.t);
    else P = this.R.MOVES[this.move].pose(this.mt);
    if (this.from && this.mt < this.blendIn) P = lerpPose(this.from, P, ease(this.mt / this.blendIn));
    return P;
  }

  update(dt) {
    this.t += dt;
    this.flashT = Math.max(0, this.flashT - dt); this.vulnT = Math.max(0, this.vulnT - dt);
    if (this.move) {
      const m = this.R.MOVES[this.move]; const md = dt * this.timeScale;
      this.mt += md;
      const ev = m.ev || [];
      while (this.evI < ev.length && this.mt >= ev[this.evI][0]) { const [, name, ...args] = ev[this.evI++]; this.onEvent(name, ...args); }
      if (this.mt >= m.d) { const done = this.move; if (done !== 'defeat') { this.from = this.pose(); this.move = null; this.mt = 0; } this.onEvent('moveDone', done); }
    }
    const P = this.pose(); this.last = P;
    const X = this.R.build(P); this.X = X;
    this.L = this.R.lowest(X);
    this.rootY = this.groundY - this.floor - this.air + this.sink - this.L * this.k;
    this.render(P);
  }

  render(P) {
    const ang = n => this.R.angle(P, n) * Math.PI / 180;
    this.root.setPosition(this.x, this.rootY);
    this.root.scaleX = this.k * this.face;
    this.dxC.x = P.dx; this.scaleC.setScale(P.sx, P.sy); this.torsoC.rotation = P.lean * Math.PI / 180;
    for (const n of ORDER) for (const c of this.jointCs[n]) c.rotation = ang(n);
    const amp = 10 * (P.sway ?? 1), t = this.t;
    for (const s of this.strips) { const d = s.d; s.x = s.baseX + amp * Math.pow(d, 1.3) * Math.sin(t * 5.2 - d * 5) + amp * 0.4 * d * Math.sin(t * 9.1 - d * 9); }
    const face = P.face || null;
    for (const f in this.faces) this.faces[f].setVisible(String(face) === f);
    this.heldRock.setVisible(P.rock === 'hand'); this.heldBlob.setVisible(!!P.blob); this.heldNet.setVisible(!!P.netHeld);
    if (this.heldBlob.visible) this.heldBlob.rotation = this.t * 3;
    // white flash when hit; sickly green pulse while vulnerable
    const flash = this.flashT > 0, vul = this.vulnT > 0;
    const mode = flash ? 'flash' : vul ? 'vul' : 'none';
    if (mode !== this._tint || vul) {
      this._tint = mode;
      for (const im of this.images) {
        if (mode === 'flash') im.setTintFill(0xffffff);
        else if (mode === 'vul') { const p = 0.5 + 0.5 * Math.sin(this.t * 14); im.setTint(Phaser.Display.Color.GetColor(Math.round(255 - 60 * p), 255, Math.round(255 - 150 * p))); }
        else im.clearTint();
      }
    }
  }

  // ---------- geometry in screen space ----------
  toScreen(n, x, y) { const q = this.R.at(this.X, n, x, y); return [this.x + q[0] * this.k * this.face, this.rootY + q[1] * this.k]; }
  handPoint() { return this.toScreen('foN', this.RIG._hand[0], this.RIG._hand[1]); }
  mouthPoint() { return this.toScreen('head', this.RIG._mouth[0], this.RIG._mouth[1]); }
  headTop() { return this.toScreen('head', 190, 40); }
  get feetY() { return this.groundY - this.floor - this.air + this.sink; }
  /** Body box used for both "gremlin touches Eddie" and "magic hits Eddie". Null when he's underground. */
  hurtbox() {
    if (this.sink > 200) return null;
    const pts = [this.toScreen('head', 120, 80), this.toScreen('head', 290, 250), this.toScreen('torso', 190, 340), this.toScreen('torso', 500, 640)];
    const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.min(this.feetY, this.groundY);
    return new Phaser.Geom.Rectangle(x0, y0, x1 - x0, Math.max(10, y1 - y0));
  }
  get width() { return 300 * this.k * 2; }
}
