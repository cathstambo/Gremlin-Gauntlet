// Grunt, WRATH OF THE HAIRBALL: the approved card art as a cut-out rig, chasing the gremlin from the left.
// Godzilla-sized: a heavy stomping walk (legs lift and slam, body bobs, tail sways, the screen thumps on each step).
// The bow and Uzi poses are whole drawings from his card, swapped in while he fires.
const D = Math.PI / 180;
const FRONT = 560;
// expression heads (Cath's card), placed over his head: x,y = where the eyes go in the rig; ox,oy = the eyes in the head image
const FACES = { hairball: { x: 432, y: 92, ox: 0.66, oy: 0.36, s: 0.62 }, shock: { x: 432, y: 92, ox: 0.71, oy: 0.33, s: 0.62 }, grumpy: { x: 432, y: 92, ox: 0.7, oy: 0.36, s: 0.62 } };   // rig x of his front-most claws (the point that "catches" the gremlin)

export class Grunt {
  constructor(scene, groundY, height) {
    this.scene = scene; this.groundY = groundY;
    const R = this.R = scene.cache.json.get('gruntRig');
    this.k = height / (R._feet - 27);
    this.root = scene.add.container(0, 0).setScale(this.k).setDepth(8);
    this.standC = scene.add.container(0, 0); this.root.add(this.standC);
    this.parts = {}; this.images = [];
    for (const n of ['tail', 'legB', 'body', 'legF']) {
      const p = R[n], c = scene.add.container(p.px, p.py);
      const im = scene.add.image(p.x - p.px, p.y - p.py, 'gr_' + n).setOrigin(0, 0);
      c.add(im); this.standC.add(c); this.parts[n] = c; this.images.push(im);
    }
    // whole-body action poses, aligned on his feet with the front claws in the same place
    this.poses = {};
    for (const n of ['bow', 'uzi']) {
      const p = R['pose_' + n];
      const im = scene.add.image(FRONT + 20 - p.w, R._feet - p.h, 'gr_pose_' + n).setOrigin(0, 0).setVisible(false);
      this.root.add(im); this.poses[n] = im; this.images.push(im);
    }
    this.t = 0; this.q = 0; this.pose = null; this.poseT = 0; this.flinch = 0; this.flashT = 0; this.lastStep = 0;
    this.frontX = -400; this.speed = 1; this.onStep = () => {};
    this.fall = 0; this.face = null; this.faceImg = null;   // the ending: toppling over backwards, and his expression heads
  }
  /** Show an action pose (bow / uzi) for `dur` seconds. */
  act(pose, dur) { this.pose = pose; this.poseT = dur; }
  hit() { this.flinch = 1; this.flashT = 0.18; }
  /** Swap his head for one of the expression heads from his card (null = his normal head). */
  setFace(name) {
    if (this.faceImg) { this.faceImg.destroy(); this.faceImg = null; }
    this.face = name; if (!name) return;
    const F = FACES[name];
    this.faceImg = this.scene.add.image(F.x, F.y, 'gr_face_' + name).setOrigin(F.ox, F.oy).setScale(F.s);
    this.standC.add(this.faceImg);
  }
  get visibleFront() { return this.frontX; }
  /** Where his head is on screen (for cat-noise captions). */
  headPoint() { const q = this.root.getWorldTransformMatrix().transformPoint(470, 60); return [q.x, q.y]; }   // follows his fall in the ending

  update(dt, frontX, walking = true) {
    this.t += dt;
    this.flinch = Math.max(0, this.flinch - dt * 2.5); this.flashT = Math.max(0, this.flashT - dt);
    this.poseT = Math.max(0, this.poseT - dt); if (this.poseT === 0) this.pose = null;
    this.frontX += (frontX - this.frontX) * Math.min(1, dt * 3);
    const P = this.parts;
    // stomp walk: one heavy step every ~0.45 s
    if (walking) this.q += dt * 7 * this.speed;
    const s = Math.sin(this.q), liftF = Math.max(0, s), liftB = Math.max(0, -s);
    // legs are cut at the knee with a soft edge (Cath, 15 Oct): each foot lifts from the knee and tips its toes up, without sliding
    P.legF.y = this.R.legF.py - 16 * liftF; P.legF.x = this.R.legF.px; P.legF.rotation = -5 * liftF * D;
    P.legB.y = this.R.legB.py - 10 * liftB; P.legB.x = this.R.legB.px; P.legB.rotation = 0;   // far leg: a straight lift
    P.body.y = this.R.body.py - 10 * Math.abs(Math.cos(this.q)); P.body.rotation = (2 * Math.sin(this.q) - 4 * this.flinch) * D;
    P.tail.rotation = (10 * Math.sin(this.t * 2.2) + 4 * s) * D;
    const step = Math.sign(s);
    if (walking && step !== this.lastStep && step !== 0) { this.lastStep = step; this.onStep(); }
    // action pose swap
    this.standC.setVisible(!this.pose);
    for (const n in this.poses) this.poses[n].setVisible(this.pose === n);
    // placement: front claws at frontX, feet on the ground; a flinch knocks him back a little
    this.root.x = this.frontX - FRONT * this.k - 70 * this.flinch;
    this.root.y = this.groundY - this.R._feet * this.k;
    if (this.fall > 0) {   // toppling over backwards, pivoting on his back foot
      const a = -this.fall * Math.PI / 2 * 0.92, px = 470, py = this.R._feet, wx = this.root.x + px * this.k, wy = this.root.y + py * this.k;
      this.root.setRotation(a);
      this.root.x = wx - this.k * (px * Math.cos(a) - py * Math.sin(a)); this.root.y = wy - this.k * (px * Math.sin(a) + py * Math.cos(a));
      this.root.y -= Math.sin(-a) * (px - 110) * this.k;   // lands on his back with his feet in the air (not sunk into the ground)
    } else this.root.setRotation(0);
    // red flash when hit
    const fl = this.flashT > 0;
    if (fl !== this._fl) { this._fl = fl; for (const im of this.images) fl ? im.setTintFill(0xff4a4a) : im.clearTint(); }
  }
  destroy() { this.root.destroy(); }
}
export const GRUNT_PARTS = ['body', 'legF', 'legB', 'tail', 'pose_bow', 'pose_uzi', 'face_roar', 'face_angry', 'face_shock', 'face_grumpy', 'face_hairball', 'paw_stomp', 'arrow'];
