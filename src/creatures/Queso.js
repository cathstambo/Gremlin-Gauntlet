// World 4 creatures: the cheese village (Cath's Queso Jefe run sheets + readme, 16 Oct 2026).
// Same interface as the other creatures: update(dt, ctx) moves it; hitbox() is what hurts the gremlin; shot() is called when
// magic hits it; centre; points. Extras used by the Run scene: noShoot (magic passes by), shootbox().
// Each is drawn from the approved drawings on the sheet (several frames per creature, swapped as it moves).
import { Creature } from './Creatures.js?v=20261016162515';
import { Sprite } from './Wild.js?v=20261016162515';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = k => (k < 0 ? 0 : k > 1 ? 1 : k * k * (3 - 2 * k));
const D = Math.PI / 180;
const pick = a => a[Math.floor(Math.random() * a.length)];

/** Rotating Gingy lines (GDD, locked). */
export const GINGY_LINES = ['THE BOSS SAYS YOU’RE DEAD!', 'YOU’RE GONNA GET CHEDDAR’D!', 'I REGRET NOTHING!', 'OH SHIT, WRONG BUTTON!', 'RINA, I CAN EXPLAIN!'];

/** A short speech bubble that follows a point (used by Gingy in the running stages). */
export function bubble(scene, text, dur = 1.6) {
  const c = scene.add.container(0, 0).setDepth(20);
  const txt = scene.add.text(0, -31, text, { fontFamily: 'Atkinson Hyperlegible, system-ui, sans-serif', fontStyle: 'bold', fontSize: 30, color: '#3a1a08', align: 'center', wordWrap: { width: 460 } }).setOrigin(0.5, 1);
  const w = txt.width + 40, h = txt.height + 24, g = scene.add.graphics();
  g.fillStyle(0xfff3c8, 1).lineStyle(5, 0x3a1a08, 1).fillRoundedRect(-w / 2, -h - 18, w, h, 16).strokeRoundedRect(-w / 2, -h - 18, w, h, 16)
    .fillTriangle(-12, -20, 12, -20, 0, 6).lineBetween(-12, -20, 0, 6).lineBetween(12, -20, 0, 6);
  c.add([g, txt]); c.life = dur;
  return c;
}

// ---------------- Rat: scurries straight at you, low and fast (JUMP it), or with lane 'leap' it crouches, then leaps at head
// height (SLIDE under it). One blast. Small enemy, 50. ----------------
export class Rat extends Creature {
  constructor(scene, x, groundY, lane = 'run') {
    super(scene, x, 'rat');
    this.groundY = groundY; this.lane = lane; this.p = new Sprite(scene, 'q_rat1', 1.1);
    this.points = 50; this.shadowW = 220; this.st = 'run'; this.stT = 0; this.y = 0; this.speed = 520; this.away = false;
  }
  update(dt, ctx) {
    this.common(dt); this.x -= ctx.scroll;
    let rot = 0, sq = 1, key = 'q_rat1';
    if (this.dead) {
      key = this.deadT < 0.12 ? 'q_rat_hit' : 'q_rat_dead'; this.y += (this.vy = (this.vy ?? 500) - 2600 * dt) * dt; rot = Math.min(40, this.deadT * 200);
      if (this.deadT > 1.3) this.gone = true;
    } else {
      this.stT += dt;
      const gap = this.x - ctx.gx;
      if (this.away) {   // the cheese thief: runs off the other way
        this.x += 700 * dt; key = (this.t * 9) % 2 < 1 ? 'q_rat1' : 'q_rat2'; this.y = 10 * Math.abs(Math.sin(this.t * 14));
      } else if (this.st === 'run') {   // scampering: two frames, a little bounce
        this.x -= this.speed * dt; key = (this.t * 9) % 2 < 1 ? 'q_rat1' : 'q_rat2'; this.y = 12 * Math.abs(Math.sin(this.t * 14)); rot = -3 + 6 * Math.abs(Math.sin(this.t * 14));
        if (this.lane === 'leap' && gap < 760 && gap > 0) { this.st = 'crouch'; this.stT = 0; }
      } else if (this.st === 'crouch') {   // the warning: bunches up, shivering
        key = 'q_rat3'; this.y = 0; sq = 0.86 + 0.03 * Math.sin(this.stT * 60); this.x -= 60 * dt;
        if (this.stT > 0.42) { this.st = 'leap'; this.stT = 0; }
      } else if (this.st === 'leap') {   // springs up to head height and flies straight across: SLIDE
        key = 'q_rat_leap'; const u = this.stT; this.y = 215 * ease(u / 0.18); this.x -= 820 * dt; rot = 4;
        if (u > 0.8) { this.st = 'fall'; this.stT = 0; this.vy = 0; }
      } else if (this.st === 'fall') {
        key = 'q_rat_leap'; this.vy -= 2800 * dt; this.y = Math.max(0, this.y + this.vy * dt); this.x -= 400 * dt; rot = 14;
        if (this.y <= 0) { this.st = 'run2'; this.stT = 0; }
      } else if (this.st === 'run2') { this.x -= 300 * dt; key = (this.t * 9) % 2 < 1 ? 'q_rat1' : 'q_rat2'; }
      else if (this.st === 'recoil') { key = 'q_rat_hit'; rot = 12 * Math.sin(this.stT * 30); if (this.stT > 0.3) { this.st = 'run'; this.stT = 0; } }
    }
    if (this.p.img.texture.key !== key) this.p.img.setTexture(key);
    this.p.img.setFlipX(!this.away);
    this.p.root.setPosition(this.x, this.groundY + 8 - this.y).setRotation((this.away ? -rot : rot) * D);
    this.p.img.setScale(this.p.k / Math.sqrt(sq), this.p.k * sq);
    if (this.x < -400 || this.x > ctx.viewW + 600) this.gone = true;
  }
  get warning() { return this.st === 'crouch'; }
  onHurt() { this.st = 'recoil'; this.stT = 0; }
  hitbox() {
    if (this.dead || this.away) return null;
    if (this.st === 'leap' || this.st === 'fall') return new Phaser.Geom.Rectangle(this.x - 110, this.groundY - this.y - 140, 215, 105);
    return new Phaser.Geom.Rectangle(this.x - 115, this.groundY - this.y - 110, 220, 102);
  }
  get centre() { return [this.x, this.groundY - this.y - 55]; }
  destroy() { this.p.destroy(); this.cheese?.destroy(); }
}

// ---------------- Armoured rat (approved addition): a big rat in cheese armour that charges. The first hit cracks the armour
// off (you can see it break), the second finishes him. Jump him. Strong enemy, 150. ----------------
export class ArmourRat extends Creature {
  constructor(scene, x, groundY) {
    super(scene, x, 'arat');
    this.groundY = groundY; this.p = new Sprite(scene, 'q_arat1', 0.9);
    this.hp = 2; this.points = 150; this.shadowW = 290; this.st = 'trot'; this.stT = 0; this.y = 0; this.crackT = 0; this.dustT = 0;
  }
  update(dt, ctx) {
    this.common(dt); this.x -= ctx.scroll;
    let rot = 0, sq = 1;
    const bare = this.hp < 2, A = bare ? ['q_arat_b1', 'q_arat_b2'] : ['q_arat1', 'q_arat2'];
    let key = A[(this.t * 6) % 2 < 1 ? 0 : 1];
    this.crackT = Math.max(0, this.crackT - dt);
    if (this.dead) {
      key = 'q_arat_dead'; rot = 0; this.p.root.alpha = clamp(2.2 - this.deadT * 1.5, 0, 1);
      if (this.deadT > 1.5) this.gone = true;
    } else {
      this.stT += dt;
      const gap = this.x - ctx.gx;
      if (this.st === 'trot') {
        this.x -= 150 * dt; this.y = 8 * Math.abs(Math.sin(this.t * 9));
        if (gap < 1250 && gap > 0) { this.st = 'snort'; this.stT = 0; }
      } else if (this.st === 'snort') {   // the warning: rears back and stamps, dust flying
        key = A[0]; rot = -8 + 3 * Math.sin(this.stT * 40); sq = 1.04; this.y = 0;
        this.dustT -= dt; if (this.dustT <= 0) { this.dustT = 0.15; this.scene.g.fx.dust?.(3, 0.8, [this.x - 50, this.groundY]); }
        if (this.stT > 0.6) { this.st = 'charge'; this.stT = 0; this.scene.cameras.main.shake(100, 0.003); }
      } else if (this.st === 'charge') {
        this.x -= 560 * dt; key = A[(this.t * 10) % 2 < 1 ? 0 : 1]; this.y = 14 * Math.abs(Math.sin(this.t * 16)); rot = 3;
      } else if (this.st === 'recoil') { rot = -12 + 6 * Math.sin(this.stT * 30); this.x += 140 * dt; if (this.stT > 0.4) { this.st = 'charge'; this.stT = 0; } }
      if (this.crackT > 0) key = 'q_arat_crack';
    }
    if (this.p.img.texture.key !== key) this.p.img.setTexture(key);
    this.p.root.setPosition(this.x, this.groundY + 10 - this.y).setRotation(rot * D);
    this.p.img.setScale(this.p.k / Math.sqrt(sq), this.p.k * sq);
    if (this.x < -500) this.gone = true;
  }
  get warning() { return this.st === 'snort'; }
  onHurt() {   // the armour cracks and falls away
    this.st = 'recoil'; this.stT = 0; this.crackT = 0.4;
    const sc = this.scene;
    for (let i = 0; i < 5; i++) {
      const im = sc.add.image(this.x + (i - 2) * 30, this.groundY - 120, i % 2 ? 'q_chunk1' : 'q_chunk2').setScale(0.35).setDepth(9);
      const vx = -200 + i * 110, vy = -500 - i * 60;
      sc.tweens.add({ targets: im, x: im.x + vx * 0.8, y: this.groundY - 10, angle: 300, duration: 650, ease: 'Quad.easeIn', onComplete: () => sc.tweens.add({ targets: im, alpha: 0, duration: 400, onComplete: () => im.destroy() }) });
    }
  }
  hitbox() { if (this.dead) return null; return new Phaser.Geom.Rectangle(this.x - 140, this.groundY - this.y - 160, 275, 150); }
  get centre() { return [this.x, this.groundY - this.y - 85]; }
  destroy() { this.p.destroy(); }
}

// ---------------- Flying cracker: sails in high, then drops into the lane at head height. SLIDE under it or blast it. 50. ----------------
export class Cracker extends Creature {
  constructor(scene, x, groundY) {
    super(scene, x, 'cracker');
    this.groundY = groundY; this.p = new Sprite(scene, 'q_crk_fly', 1.0, 7);
    this.points = 50; this.y = groundY - 560; this.laneY = groundY - 215;
  }
  update(dt, ctx) {
    this.common(dt); this.x -= ctx.scroll;
    let rot = 0;
    if (this.dead) {
      if (this.p.img.texture.key !== 'q_crk_break') this.p.img.setTexture('q_crk_break');
      this.y += 300 * dt; this.p.root.alpha = clamp(1 - this.deadT * 2, 0, 1); if (this.deadT > 0.6) this.gone = true;
    } else {
      this.x -= 380 * dt;
      const gap = this.x - ctx.gx, k = clamp(1 - (gap - 250) / 900, 0, 1);
      const target = (this.groundY - 560) + (this.laneY - (this.groundY - 560)) * ease(k);
      this.y += (target - this.y) * Math.min(1, dt * 7);
      rot = 6 * Math.sin(this.t * 7);
    }
    this.p.root.setPosition(this.x, this.y + 60).setRotation(rot * D);
    if (this.x < -400) this.gone = true;
  }
  hitbox() { if (this.dead) return null; return new Phaser.Geom.Rectangle(this.x - 80, this.y - 50, 160, 100); }
  get centre() { return [this.x, this.y]; }
  destroy() { this.p.destroy(); }
}

// ---------------- Rolling cheese wheel: rumbles down the street at you. JUMP it. Magic just bounces off (noShoot). ----------------
export class Wheel extends Creature {
  constructor(scene, x, groundY, lane, opts = {}) {
    super(scene, x, 'wheel');
    this.groundY = groundY; this.p = new Sprite(scene, 'q_wheel', opts.s || 1.25, 6.5); this.p.img.setOrigin(0.5, 0.5).setFlipX(false);
    this.noShoot = true; this.points = 0; this.shadowW = 170; this.speed = opts.speed ?? 280; this.r = 152 * (opts.s || 1.25) / 2; this.dustT = 0; this.held = !!opts.held;
    this.y = 0;
  }
  update(dt, ctx) {
    this.common(dt);
    if (this.held) return;   // (the dropper places it)
    this.x -= ctx.scroll + this.speed * dt;
    this.ang = (this.ang || 0) - (ctx.scroll + this.speed * dt) / this.r;
    this.p.root.setPosition(this.x, this.groundY - this.r + 6).setRotation(this.ang);
    this.dustT -= dt; if (this.dustT <= 0) { this.dustT = 0.12; this.scene.g.fx.dust?.(2, 0.6, [this.x + this.r * 0.6, this.groundY]); }
    if (this.x < -400) this.gone = true;
  }
  hitbox() { const r = this.r * 0.8; return new Phaser.Geom.Rectangle(this.x - r, this.groundY - this.r * 1.75, r * 2, this.r * 1.7); }
  get centre() { return [this.x, this.groundY - this.r]; }
  destroy() { this.p.destroy(); }
}

// ---------------- Cheese chunk thrown by Gingy: lobbed ahead, then it bounces along the street at you. JUMP it or blast it. ----------------
export class Chunk extends Creature {
  constructor(scene, x, groundY, from) {
    super(scene, x, 'chunk');
    this.groundY = groundY; this.p = new Sprite(scene, pick(['q_chunk1', 'q_chunk2']), 0.8, 7); this.p.img.setOrigin(0.5, 0.5);
    this.points = 0; this.shadowW = 90; this.x = from[0]; this.y = groundY - from[1]; this.vx = -520; this.vy = -900; this.bounces = 0;
  }
  update(dt, ctx) {
    this.common(dt); this.x -= ctx.scroll;
    if (this.dead) { this.p.root.alpha = clamp(1 - this.deadT * 4, 0, 1); if (this.deadT > 0.3) this.gone = true; return; }
    this.vy += 2600 * dt; this.x += this.vx * dt; this.y += this.vy * dt;
    const floor = this.groundY - 40;
    if (this.y > floor && this.vy > 0) { this.y = floor; this.vy = this.bounces < 6 ? -520 : 0; this.vx = -340; this.bounces++; this.scene.g.fx.dust?.(3, 0.5, [this.x, this.groundY]); }
    this.p.root.setPosition(this.x, this.y).setRotation(this.t * -8);
    if (this.x < -300) this.gone = true;
  }
  hitbox() { if (this.dead) return null; return new Phaser.Geom.Rectangle(this.x - 50, this.y - 42, 100, 82); }
  get air() { return this.groundY - 40 - this.y; }
  get centre() { return [this.x, this.y]; }
  destroy() { this.p.destroy(); }
}

/** Gingy's own little sprite: swaps between the approved poses, bobs and squashes. Faces left as drawn (most poses). */
class GingySprite {
  constructor(scene, key, scale = 0.85, depth = 6.2) {
    this.root = scene.add.container(0, 0).setDepth(depth);
    this.img = scene.add.image(0, 0, key).setOrigin(0.5, 1).setScale(scale); this.root.add(this.img); this.k = scale; this.images = [this.img];
  }
  set(key, flip = false) { if (this.img.texture.key !== key) this.img.setTexture(key); this.img.setFlipX(flip); }
  flash() {}
  destroy() { this.root.destroy(); }
}

// ---------------- Gingy, encounter 1 (GDD): appears up the street, lobs cheese at you, then legs it. He's not a target. ----------------
export class GingyThrow extends Creature {
  constructor(scene, x, groundY) {
    super(scene, x, 'gingy');
    this.groundY = groundY; this.p = new GingySprite(scene, 'q_g_cheese'); this.noShoot = true; this.points = 0;
    this.st = 'wait'; this.stT = 0; this.n = 0; this.holdX = 1050;
  }
  update(dt, ctx) {
    this.common(dt); this.stT += dt;
    let key = 'q_g_cheese', flip = false, bob = 0;
    const gap = this.x - ctx.gx;
    if (this.st === 'wait') { this.x -= ctx.scroll; if (gap < this.holdX) { this.st = 'taunt'; this.stT = 0; this.say(GINGY_LINES[0]); } }
    else if (this.st === 'taunt') { key = 'q_g_wave'; bob = 6 * Math.abs(Math.sin(this.stT * 8)); if (this.stT > 0.9) { this.st = 'lift'; this.stT = 0; } }
    else if (this.st === 'lift') { key = 'q_gt_lift'; if (this.stT > 0.5) { this.st = 'throw'; this.stT = 0; this.n++; this.scene.creatures.push(new Chunk(this.scene, this.x, this.groundY, [this.x - 40, 230])); } }
    else if (this.st === 'throw') { key = 'q_gt_throw'; if (this.stT > 0.55) { this.st = this.n < 3 ? 'lift' : 'flee'; this.stT = 0; if (this.n >= 3) this.say('I REGRET NOTHING!'); } }
    else if (this.st === 'flee') {   // off up the street and away
      key = 'q_g_run'; flip = true; this.x += 900 * dt; bob = 14 * Math.abs(Math.sin(this.stT * 16));
      if (this.x > ctx.viewW + 300) this.gone = true;
    }
    this.p.set(key, flip);
    this.p.root.setPosition(this.x, this.groundY + 8 - bob);
    this.updateBubble(dt);
  }
  say(text) { this.b?.destroy(); this.b = bubble(this.scene, text, 1.7); }
  updateBubble(dt) { if (!this.b) return; this.b.life -= dt; this.b.setPosition(this.x, this.groundY - 270).setAlpha(Math.min(1, this.b.life * 4)); if (this.b.life <= 0) { this.b.destroy(); this.b = null; } }
  hitbox() { return null; }
  get centre() { return [this.x, this.groundY - 120]; }
  destroy() { this.p.destroy(); this.b?.destroy(); }
}

// ---------------- Gingy, encounter 2 (GDD): the overhead cheese-wheel dropper. His gantry rides along a rope above the street,
// ahead of you. A red marker shows where each wheel will land; it smashes down, then ROLLS at you (jump it). On the last
// drop the whole rig breaks and nearly flattens him. ----------------
const GANT = { s: 1.1, lead: 860, drop: 0.42, warn: 0.85, gap: 1.5 };
export class GingyDropper extends Creature {
  constructor(scene, x, groundY, lane, opts = {}) {
    super(scene, x, 'gingy');
    this.groundY = groundY; this.noShoot = true; this.points = 0; this.drops = opts.n || 3;
    this.p = { root: scene.add.container(x, 0).setDepth(9.6), flash() {}, destroy() { this.root.destroy(); } };
    this.rope = scene.add.graphics().setDepth(9.5);
    this.img = scene.add.image(0, 0, 'q_gant1').setOrigin(0.5, 0).setScale(GANT.s); this.p.root.add(this.img);
    this.top = groundY - 770;   // gantry hangs from the rope, high over the street
    this.st = 'wait'; this.stT = 0; this.n = 0;
  }
  get bottomY() { return this.top + 300 * GANT.s; }
  update(dt, ctx) {
    this.common(dt); this.stT += dt;
    const gap = this.x - ctx.gx, sc = this.scene;
    if (this.st === 'wait') { this.x -= ctx.scroll; if (gap < GANT.lead) { this.st = 'ride'; this.stT = 0; this.say(GINGY_LINES[1]); } }
    else if (this.st === 'ride') { this.img.setTexture('q_gant1'); if (this.stT > 0.7) { this.st = 'warn'; this.stT = 0; } }
    else if (this.st === 'warn') { this.img.setTexture(this.stT > GANT.warn * 0.5 ? 'q_gant2' : 'q_gant1'); if (this.stT > GANT.warn) this.release(); }
    else if (this.st === 'fall') {
      const u = Math.min(1, this.stT / GANT.drop), y0 = this.top + 150 * GANT.s, y1 = this.groundY - 95;
      this.wf.setPosition(this.x - 16 * GANT.s, y0 + (y1 - y0) * u * u).setRotation(u * 0.8);
      if (u >= 1) this.land();
    } else if (this.st === 'reload') { if (this.stT > GANT.gap) { this.st = this.n >= this.drops ? 'gone' : 'warn'; this.stT = 0; if (this.n === this.drops - 1) this.say('OH SHIT, WRONG BUTTON!'); } }
    else if (this.st === 'break') {   // the last drop: the whole rig comes down
      const u = Math.min(1, this.stT / 0.6);
      this.p.root.y = (this.groundY - 380 - this.top) * u * u; this.p.root.rotation = 0.35 * u;
      if (u >= 1) this.crash();
    } else if (this.st === 'after') { this.x -= ctx.scroll; }
    this.p.root.x = this.x; if (this.st !== 'break' && this.st !== 'after') this.p.root.y = this.top + 6 * Math.sin(this.t * 3);
    if (this.st !== 'break' && this.st !== 'after') this.p.root.rotation = 0.02 * Math.sin(this.t * 2.2);
    // the rope it rides on, and the red landing marker
    const R = this.rope; R.clear();
    if (this.st !== 'break' && this.st !== 'after') R.lineStyle(6, 0x5a3a1c, 1).lineBetween(-50, this.top + 14, ctx.viewW + 50, this.top + 4);
    if (this.st === 'warn' || this.st === 'fall') {
      const p = 0.5 + 0.5 * Math.sin(this.t * 18);
      R.lineStyle(6, 0xff3a2a, 0.6 + 0.4 * p).strokeEllipse(this.x, this.groundY + 4, 210, 34).fillStyle(0xff3a2a, 0.2 + 0.25 * p).fillEllipse(this.x, this.groundY + 4, 210, 34);
    }
    if (this.after) { this.after.x = this.x; this.gingy.root.x = this.x + 230; }
    this.updateBubble(dt);
    if (this.st === 'after' && this.x < -500) this.gone = true;
  }
  release() {
    this.n++;
    if (this.n >= this.drops) { this.st = 'break'; this.stT = 0; this.img.setTexture('q_gant_break'); this.say('RINA, I CAN EXPLAIN!'); return; }
    this.img.setTexture('q_gant_open'); this.st = 'fall'; this.stT = 0;   // the wheel drops out of the frame
    this.wf = this.scene.add.image(this.x, this.top + 150 * GANT.s, 'q_wfall').setScale(0.95).setDepth(9.4);
  }
  land() {   // SPLAT, then the wheel rolls at the gremlin
    const sc = this.scene; this.wf.destroy(); this.wf = null;
    const s = sc.add.image(this.x, this.groundY + 20, 'q_splat1').setOrigin(0.5, 1).setScale(1.0).setDepth(9.2);
    sc.tweens.add({ targets: s, alpha: 0, delay: 150, duration: 450, onComplete: () => s.destroy() });
    sc.cameras.main.shake(160, 0.007);
    const hb = sc.g.hitbox(); if (hb && Math.abs(hb.centerX - this.x) < 120 && sc.mode === 'running') sc.takeHit();
    sc.creatures.push(new Wheel(sc, this.x, this.groundY, null, { speed: 240 }));
    this.st = 'reload'; this.stT = 0;
  }
  crash() {   // it lands in a heap in the street, Gingy sitting dazed beside it: the heap is in the way, JUMP it
    const sc = this.scene; this.st = 'after'; this.stT = 0;
    this.img.setVisible(false); this.p.root.rotation = 0; this.p.root.y = 0;
    this.after = sc.add.image(this.x, this.groundY + 14, 'q_crash').setOrigin(0.5, 1).setScale(0.8).setDepth(5.5);
    this.gingy = new GingySprite(sc, 'q_g_dizzy', 0.55, 5.4); this.gingy.root.setPosition(this.x + 230, this.groundY + 6);
    sc.cameras.main.shake(400, 0.014); sc.g.fx.dust?.(16, 1.8, [this.x, this.groundY]);
    this.heap = true;
  }
  say(text) { this.b?.destroy(); this.b = bubble(this.scene, text, 1.8); }
  updateBubble(dt) { if (!this.b) return; this.b.life -= dt; this.b.setPosition(this.after ? this.x + 230 : this.x - 300, this.after ? this.groundY - 230 : this.top + 230); this.b.setAlpha(Math.min(1, this.b.life * 4)); if (this.b.life <= 0) { this.b.destroy(); this.b = null; } }
  hitbox() { if (!this.heap) return null; return new Phaser.Geom.Rectangle(this.x - 115, this.groundY - 120, 230, 115); }
  get centre() { return [this.x, this.groundY - 100]; }
  destroy() { this.p.destroy(); this.rope.destroy(); this.after?.destroy(); this.gingy?.destroy(); this.wf?.destroy(); this.b?.destroy(); }
}

// ---------------- Gingy, encounter 3 (GDD): lets the rats loose at you... then one of them steals his cheese, and he chases
// it off up the street. ----------------
export class GingyRats extends Creature {
  constructor(scene, x, groundY) {
    super(scene, x, 'gingy');
    this.groundY = groundY; this.p = new GingySprite(scene, 'q_g_cheese'); this.noShoot = true; this.points = 0;
    this.st = 'wait'; this.stT = 0; this.n = 0;
  }
  update(dt, ctx) {
    this.common(dt); this.stT += dt;
    let key = 'q_g_cheese', flip = false, bob = 0;
    const gap = this.x - ctx.gx, sc = this.scene;
    if (this.st === 'wait') { this.x -= ctx.scroll; if (gap < 1150) { this.st = 'call'; this.stT = 0; this.say('THE BOSS SAYS YOU’RE DEAD!'); } }
    else if (this.st === 'call') {   // whistles up the rats: they pour past him, one after another
      key = this.stT % 0.5 < 0.25 ? 'q_g_wave' : 'q_g_cheese'; bob = 4 * Math.abs(Math.sin(this.stT * 10));
      if (this.stT > 0.6 + this.n * 1.0 && this.n < 3) { this.n++; sc.creatures.push(new Rat(sc, ctx.viewW + 120, this.groundY, this.n === 2 ? 'leap' : 'run')); }
      if (this.stT > 3.6) { this.st = 'steal'; this.stT = 0; this.thief = new Rat(sc, ctx.viewW + 120, this.groundY); this.thief.speed = 900; sc.creatures.push(this.thief); this.thief.noShoot = true; }
    } else if (this.st === 'steal') {   // the last rat goes straight for his cheese...
      key = 'q_g_cheese';
      const T = this.thief; if (T && !T.away && T.x <= this.x + 40) {
        T.away = true; T.cheese = sc.add.image(0, 0, 'q_g_chunk').setScale(0.35).setDepth(6.6); this.st = 'robbed'; this.stT = 0; this.say('HEY! THAT’S MY CHEESE!');
      }
    } else if (this.st === 'robbed') { key = 'q_g_panic'; if (this.stT > 0.7) { this.st = 'chase'; this.stT = 0; } }
    else if (this.st === 'chase') { key = 'q_g_run'; flip = true; this.x += 760 * dt; bob = 14 * Math.abs(Math.sin(this.stT * 16)); if (this.x > ctx.viewW + 300) this.gone = true; }
    if (this.thief?.cheese) { this.thief.cheese.setPosition(this.thief.x + 60, this.groundY - 90 - this.thief.y); if (this.thief.gone) { this.thief.cheese.destroy(); this.thief.cheese = null; } }
    this.p.set(key, flip);
    this.p.root.setPosition(this.x, this.groundY + 8 - bob);
    this.updateBubble(dt);
  }
  say(text) { this.b?.destroy(); this.b = bubble(this.scene, text, 1.8); }
  updateBubble(dt) { if (!this.b) return; this.b.life -= dt; this.b.setPosition(this.x, this.groundY - 270).setAlpha(Math.min(1, this.b.life * 4)); if (this.b.life <= 0) { this.b.destroy(); this.b = null; } }
  hitbox() { return null; }
  get centre() { return [this.x, this.groundY - 120]; }
  destroy() { this.p.destroy(); this.b?.destroy(); }
}
