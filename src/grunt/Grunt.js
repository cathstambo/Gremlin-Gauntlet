// Grunt, WRATH OF THE HAIRBALL: the approved card art as a cut-out rig, chasing the gremlin from the left.
// Godzilla-sized: a heavy stomping walk (legs lift and slam, body bobs, tail sways, the screen thumps on each step).
// The bow and Uzi poses are whole drawings from his card, swapped in while he fires.
const D = Math.PI / 180;
const FRONT = 560;   // rig x of his front-most claws (the point that "catches" the gremlin)

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
  }
  /** Show an action pose (bow / uzi) for `dur` seconds. */
  act(pose, dur) { this.pose = pose; this.poseT = dur; }
  hit() { this.flinch = 1; this.flashT = 0.18; }
  get visibleFront() { return this.frontX; }
  /** Where his head is on screen (for cat-noise captions). */
  headPoint() { return [this.root.x + 470 * this.k, this.root.y + 60 * this.k]; }

  update(dt, frontX, walking = true) {
    this.t += dt;
    this.flinch = Math.max(0, this.flinch - dt * 2.5); this.flashT = Math.max(0, this.flashT - dt);
    this.poseT = Math.max(0, this.poseT - dt); if (this.poseT === 0) this.pose = null;
    this.frontX += (frontX - this.frontX) * Math.min(1, dt * 3);
    const P = this.parts;
    // stomp walk: one heavy step every ~0.45 s
    if (walking) this.q += dt * 7 * this.speed;
    const s = Math.sin(this.q), liftF = Math.max(0, s), liftB = Math.max(0, -s);
    P.legF.y = this.R.legF.py - 26 * liftF; P.legF.x = this.R.legF.px + 18 * liftF; P.legF.rotation = -8 * liftF * D;
    P.legB.y = this.R.legB.py - 26 * liftB; P.legB.x = this.R.legB.px + 18 * liftB; P.legB.rotation = -8 * liftB * D;
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
    // red flash when hit
    const fl = this.flashT > 0;
    if (fl !== this._fl) { this._fl = fl; for (const im of this.images) fl ? im.setTintFill(0xff4a4a) : im.clearTint(); }
  }
  destroy() { this.root.destroy(); }
}
export const GRUNT_PARTS = ['body', 'legF', 'legB', 'tail', 'pose_bow', 'pose_uzi', 'face_roar', 'face_angry', 'face_shock', 'face_grumpy', 'face_hairball', 'paw_stomp', 'arrow'];
