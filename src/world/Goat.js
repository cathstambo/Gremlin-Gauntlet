// The judgemental mountain goat (Uzi Rampage scenery, Cath 15 Oct): his head slowly turns to follow the gremlin as she passes.
// Body and head are cut from Cath's approved decoration sheet; the head turns on its neck (a squash through to a mirror image).
const NECK = [438, 153], HEAD = { x: 416, y: -4 }, BODY_H = 516;
export class Goat {
  constructor(scene, x, groundY, s) {
    this.scene = scene; this.s = s; this.face = 1; this.groundY = groundY;
    this.body = scene.add.image(x, groundY, 'u_goat_body').setOrigin(0, 1).setScale(s).setDepth(3.9);
    const hw = scene.textures.get('u_goat_head').getSourceImage();
    this.head = scene.add.image(0, 0, 'u_goat_head').setOrigin((NECK[0] - HEAD.x) / hw.width, (NECK[1] - HEAD.y) / hw.height).setScale(s).setDepth(3.91);
    this.x = x;
  }
  set x(v) { this._x = v; if (this.body) { this.body.x = v; this.place(); } }
  get x() { return this._x; }
  place() { this.head.setPosition(this.body.x + NECK[0] * this.s, this.body.y - (BODY_H - NECK[1]) * this.s); }
  /** gx = the gremlin's screen x. Looks at her: facing left while she's coming, turning to stare after her once she's past. */
  update(dt, gx) {
    const want = gx < this.body.x + NECK[0] * this.s ? -1 : 1;
    this.face += (want - this.face) * Math.min(1, dt * 1.6);   // slow and disapproving
    const f = Math.abs(this.face) < 0.12 ? Math.sign(this.face || 1) * 0.12 : this.face;
    this.head.setScale(this.s * f, this.s).setRotation((want < 0 ? 0.08 : -0.05));
    this.place();
  }
  destroy() { this.body.destroy(); this.head.destroy(); }
}
