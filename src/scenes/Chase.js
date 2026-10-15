// World 3 chase rules (GDD Grunt section + Cath's decisions, 15 Oct 2026), plugged into the Run scene.
//   Proximity Meter (0 = far behind, 100 = caught). Good play keeps him roughly where he is:
//     he creeps closer slowly; clearing a hazard or creature cleanly eases him back a little;
//     every hit you take brings him a lot closer; a magic bolt fired BACK at him (button or swipe left) knocks him back.
//   At 100 he catches you: a giant paw swipe ends the attempt (retry this run, meter reset).
//   The meter carries over to the next run; it only resets when you die.
import { Grunt } from '../grunt/Grunt.js';

export const CHASE = {
  creep: 0.9,          // meter points per second while running
  clear: 2.5,          // eased back for each hazard / creature cleared without being hit
  hit: 16,             // brought closer when you take a hit
  blast: 9,            // knocked back by a magic bolt fired back at him
  blastCooldown: 2.2,  // seconds before another bolt can knock him back again
  defeat: 3,           // eased back when you blast a creature
  warnAt: 72,          // red screen edges from here
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class Chase {
  constructor(run, startProx) {
    this.run = run; this.prox = startProx; this.shown = -40; this.phase = 'eyes'; this.blastT = 0; this.t = 0;
    this.grunt = new Grunt(run, run.GROUND_Y, 800);
    this.grunt.onStep = () => { if (this.phase === 'chase') run.cameras.main.shake(70, 0.0012 + 0.0025 * this.prox / 100); };
    this.eyes = run.add.graphics().setDepth(2.6);
    this.caption = run.add.text(0, 0, '', { fontFamily: 'Lilita One, Trebuchet MS, sans-serif', fontSize: 46, color: '#ffe9a8', stroke: '#140a04', strokeThickness: 10 }).setOrigin(0.5).setDepth(20).setAlpha(0);
    // a retry or a later run starts with him already on your tail; the very first run opens with the eyes in the trees
    if (run.stage > 1 || run.retry) { this.phase = 'chase'; this.shown = this.prox; this.grunt.frontX = this.frontFor(this.prox); }
    run.events.emit('prox', this.phase === 'chase' ? this.prox : null);
  }
  frontFor(p) { return 230 + (this.run.GREMLIN_X - 30 - 230) * clamp(p, -60, 100) / 100; }   // claws at x 230 when far, at the gremlin when 100
  say(text, dur = 1.2) {
    const h = this.grunt.headPoint();
    this.caption.setText(text).setPosition(clamp(h[0] + 60, 330, 900), Math.max(300, h[1] + 80)).setAlpha(1).setScale(1);
    this.run.tweens.killTweensOf(this.caption);
    this.run.tweens.add({ targets: this.caption, scale: { from: 1.3, to: 1 }, duration: 160 });
    this.run.tweens.add({ targets: this.caption, alpha: 0, delay: dur * 1000, duration: 300 });
  }

  update(dt) {
    const run = this.run; this.t += dt;
    this.blastT = Math.max(0, this.blastT - dt);
    // run 1 opening: enormous cat eyes glowing in the trees, then Grunt bursts out with his bow
    if (this.phase === 'eyes') {
      const E = this.eyes; E.clear();
      const a = clamp(1 - (run.dist - 900) / 500, 0, 1), blink = (this.t % 2.4) < 0.12 ? 0.1 : 1;
      if (a > 0) for (const ex of [1380, 1530]) {
        E.fillStyle(0xc8ff3a, 0.25 * a).fillEllipse(ex, 400, 120, 70 * blink);
        E.fillStyle(0xd8ff5a, 0.95 * a).fillEllipse(ex, 400, 70, 40 * blink);
        E.fillStyle(0x0a1004, a).fillEllipse(ex, 400, 12, 34 * blink);
      }
      if (run.dist > 1500 && run.mode === 'running') this.burst();
    }
    if (this.phase === 'burst' || this.phase === 'chase') {
      if (this.phase === 'chase' && run.mode === 'running') this.prox = clamp(this.prox + CHASE.creep * dt, 0, 100);
      this.shown += (this.prox - this.shown) * Math.min(1, dt * 2.5);
      run.events.emit('prox', this.prox);
      if (this.prox >= 100 && run.mode === 'running') this.caught();
    }
    const walking = run.mode !== 'dying' && run.mode !== 'gameover' || this.phase === 'catch';
    this.grunt.update(dt, this.phase === 'eyes' ? -500 : this.frontFor(this.shown), walking);
    run.events.emit('danger', this.phase === 'chase' && this.prox >= CHASE.warnAt ? (this.prox - CHASE.warnAt) / (100 - CHASE.warnAt) : 0);
  }
  burst() {
    const run = this.run; this.phase = 'burst'; this.eyes.clear();
    this.grunt.frontX = -300; this.shown = -30;
    run.cameras.main.shake(600, 0.012);
    this.grunt.act('bow', 1.1);
    this.say('*RAAAWR!*', 1.4);
    run.time.delayedCall(900, () => { this.phase = 'chase'; });
  }
  /** Something (a hit, a stumble) let him close in. */
  closer(n = CHASE.hit) { if (this.phase === 'chase') { this.prox = clamp(this.prox + n, 0, 100); if (this.prox > 60) this.say('*YOWL!*', 0.9); } }
  ease(n) { if (this.phase === 'chase') this.prox = clamp(this.prox - n, 0, 100); }
  /** A magic bolt fired back reached him. */
  blasted() {
    if (this.blastT > 0 || this.phase !== 'chase') return false;
    this.blastT = CHASE.blastCooldown; this.ease(CHASE.blast);
    this.grunt.hit(); this.say(Math.random() < 0.5 ? '*HISSS!*' : '*YOWL!*', 0.9);
    return true;
  }
  /** Where a bolt fired back counts as hitting him. */
  get hitX() { return this.grunt.frontX - 40; }
  caught() {
    const run = this.run; this.phase = 'catch';
    run.mode = 'dying';
    // a huge paw swipe
    const paw = run.add.image(this.grunt.frontX - 200, run.GROUND_Y - 520, 'gr_paw_stomp').setDepth(12).setScale(1.6).setAngle(-30).setFlipX(false);
    run.tweens.add({ targets: paw, x: run.GREMLIN_X + 40, y: run.GROUND_Y - 150, angle: 20, duration: 260, ease: 'Quad.easeIn',
      onComplete: () => { run.cameras.main.shake(400, 0.02); run.g.die(); run.tweens.add({ targets: paw, alpha: 0, delay: 600, duration: 300 }); } });
    this.say('*SWAT!*', 1.2);
    run.events.emit('danger', 1);
  }
  /** Fire an arrow from the bow: a marker shows where it lands in the path, then it sticks there (jump it). */
  fireArrow(it) {
    const run = this.run;
    if (this.phase !== 'chase') { it.skip = true; return; }
    this.grunt.act('bow', 0.9); this.say('*grrrr...*', 0.8);
    it.flightT = 0; it.flight = 1.15;
  }
  destroy() { this.grunt.destroy(); }
}
