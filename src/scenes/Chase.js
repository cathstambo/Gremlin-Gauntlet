// World 3 chase rules (GDD Grunt section + Cath's decisions, 15 Oct 2026; retuned after Cath's playtest), plugged into the Run scene.
//   Proximity Meter (0 = way behind, off screen; 100 = caught). The distance really moves:
//     - running clean pulls you away: after a couple of seconds without a hit, he drops back steadily;
//     - every so often he SURGES (roar + quicker stomps) and closes the gap fast unless you blast him;
//     - every hit you take (a stumble) lets him close in a lot;
//     - a magic bolt fired BACK at him (BLAST BACK / swipe left) knocks him well back and stuns him for a moment.
//   At 100 he catches you: a giant paw swipe ends the attempt (retry this run, meter reset).
//   The meter carries over to the next run; it only resets when you die.
import { Grunt } from '../grunt/Grunt.js?v=20261015121157';
import { Sfx } from '../audio/Music.js?v=20261015121157';

export const CHASE = {
  pullAway: 2.2,       // meter points per second you gain on him while running clean...
  cleanAfter: 2.5,     // ...once you've gone this many seconds without a hit
  floor: 12,           // he never drops further back than this (he's always coming)
  creep: 1.2,          // he gains this much per second while you're not running clean
  surgeEvery: [9, 13], // seconds between his surges
  surgeTime: 2.2, surgeRate: 11,   // a surge lasts this long and closes the gap this fast (per second)
  clear: 3,            // eased back for each hazard / creature cleared without being hit
  hit: 20,             // brought closer when you take a hit (you stumble)
  blast: 15,           // knocked back by a bolt fired back at him (and it stops a surge)
  stun: 1.2,           // ...and he's stunned (stands still) for this long
  blastCooldown: 2.5,  // seconds before another bolt can knock him back again
  fireStumble: 0.5,    // firing back makes the gremlin stumble (half speed) for this long...
  fireCost: 4,         // ...and Grunt gains this much (a hit knocks him back 15, so a hit is still well worth it)
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
    Sfx.load(run.game);   // fetch the cat noises early (only plays if sound is on)
  }
  // where his front claws are on screen: off the left edge when far back (only his shadow and stomps), at the gremlin at 100
  frontFor(p) { return -60 + (this.run.GREMLIN_X - 30 + 60) * clamp(p, -60, 100) / 100; }
  say(text, dur = 1.2) {
    const h = this.grunt.headPoint();
    this.caption.setText(text).setPosition(clamp(h[0] + 60, 330, 900), Math.max(300, h[1] + 80)).setAlpha(1).setScale(1);
    this.run.tweens.killTweensOf(this.caption);
    this.run.tweens.add({ targets: this.caption, scale: { from: 1.3, to: 1 }, duration: 160 });
    this.run.tweens.add({ targets: this.caption, alpha: 0, delay: dur * 1000, duration: 300 });
  }

  update(dt) {
    const run = this.run; this.t += dt;
    this.blastT = Math.max(0, this.blastT - dt); run.events.emit('blastReady', this.blastT <= 0);
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
      if (this.phase === 'chase' && run.mode === 'running') this.pace(dt);
      this.shown += (this.prox - this.shown) * Math.min(1, dt * 2.5);
      run.events.emit('prox', this.prox);
      if (this.prox >= 100 && run.mode === 'running') this.caught();
      // near-capture warning (GDD): red edges plus his yowl as he closes in
      if (this.phase === 'chase' && this.prox >= CHASE.warnAt && !this.warned) { this.warned = true; Sfx.play(run, ['yowl', 'yowl2'], 4); }
      if (this.prox < CHASE.warnAt - 8) this.warned = false;
    }
    const walking = (run.mode !== 'dying' && run.mode !== 'gameover' || this.phase === 'catch') && this.stunT <= 0;
    this.grunt.speed = this.surgeT > 0 ? 1.7 : 1;
    this.grunt.update(dt, this.phase === 'eyes' ? -500 : this.frontFor(this.shown), walking);
    this.drawShadow();
    run.events.emit('danger', this.phase === 'chase' && this.prox >= CHASE.warnAt ? (this.prox - CHASE.warnAt) / (100 - CHASE.warnAt) : 0);
  }
  /** The distance: you pull away while running clean, he surges every so often, a blast stuns him. */
  pace(dt) {
    const run = this.run;
    this.cleanT = (this.cleanT || 0) + dt; this.stunT = Math.max(0, (this.stunT || 0) - dt);
    if (this.stunT > 0) { this.prox = clamp(this.prox - CHASE.pullAway * dt, 0, 100); return; }
    if (this.surgeT > 0) {
      this.surgeT -= dt; this.prox = clamp(this.prox + CHASE.surgeRate * dt, 0, 100);
    } else {
      this.nextSurge = (this.nextSurge ?? 6) - dt;
      if (this.nextSurge <= 0) {   // telegraphed: a roar and a big stomp, then he charges
        this.surgeT = CHASE.surgeTime; this.nextSurge = CHASE.surgeEvery[0] + Math.random() * (CHASE.surgeEvery[1] - CHASE.surgeEvery[0]);
        this.say('*RAAAWR!*', 1.0); Sfx.play(run, ['yowl', 'yowl2'], 1); run.cameras.main.shake(300, 0.008);
        run.events.emit('surge');
      } else if (this.cleanT > CHASE.cleanAfter) this.prox = Math.max(Math.min(this.prox, CHASE.floor), this.prox - CHASE.pullAway * dt);
      else this.prox = clamp(this.prox + CHASE.creep * dt, 0, 100);
    }
  }
  /** When he's off screen, his huge shadow and the thump of his steps show he's still coming. */
  drawShadow() {
    const G = this.shadowG || (this.shadowG = this.run.add.graphics().setDepth(4.7));
    G.clear(); if (this.phase !== 'chase' && this.phase !== 'catch') return;
    const fx = this.grunt.frontX, w = 520;
    G.fillStyle(0x050805, 0.35).fillEllipse(fx - 220, this.run.GROUND_Y + 6, w, 46);
    if (fx < 120) {   // off the left edge: a pulsing arrow and his distance
      const a = 0.4 + 0.3 * Math.sin(this.t * 8);
      G.fillStyle(0xff5a3a, a).fillTriangle(16, this.run.GROUND_Y - 250, 56, this.run.GROUND_Y - 280, 56, this.run.GROUND_Y - 220);
    }
  }
  burst() {
    const run = this.run; this.phase = 'burst'; this.eyes.clear();
    this.grunt.frontX = -300; this.shown = -30;
    run.cameras.main.shake(600, 0.012);
    this.grunt.act('bow', 1.1);
    this.say('*RAAAWR!*', 1.4); Sfx.play(run, 'yowl_long');
    run.time.delayedCall(900, () => { this.phase = 'chase'; });
  }
  /** Something (a hit, a stumble) let him close in. */
  closer(n = CHASE.hit, stumble = true) { if (stumble) this.cleanT = 0; if (this.phase === 'chase') { this.prox = clamp(this.prox + n, 0, 100); if (this.prox > 60) this.say('*YOWL!*', 0.9); } }
  ease(n) { if (this.phase === 'chase') this.prox = clamp(this.prox - n, 0, 100); }
  /** You got past one of his arrows: an irritated meow (GDD: irritated tail flick on misses). */
  missed() { this.say('*mrow!*', 0.7); Sfx.play(this.run, ['meow', 'meow2'], 2); }
  /** A magic bolt fired back reached him. */
  blasted() {
    if (this.blastT > 0 || this.phase !== 'chase') return false;
    this.blastT = CHASE.blastCooldown; this.ease(CHASE.blast);
    const stopped = this.surgeT > 0; this.surgeT = 0; this.stunT = CHASE.stun;   // knocked back, stunned, and any surge is broken
    if (stopped) this.nextSurge = Math.max(this.nextSurge, 6);
    this.grunt.hit(); this.say(Math.random() < 0.5 ? '*HISSS!*' : '*YOWL!*', 0.9); Sfx.play(this.run, ['screech', 'snarl']);
    return true;
  }
  /** Where a bolt fired back counts as hitting him. */
  get hitX() { return Math.max(this.grunt.frontX - 40, 30); }   // off screen, a bolt still reaches him at the edge
  caught() {
    const run = this.run; this.phase = 'catch';
    run.mode = 'dying';
    // a huge paw swipe
    const paw = run.add.image(this.grunt.frontX - 200, run.GROUND_Y - 520, 'gr_paw_stomp').setDepth(12).setScale(1.6).setAngle(-30).setFlipX(false);
    run.tweens.add({ targets: paw, x: run.GREMLIN_X + 40, y: run.GROUND_Y - 150, angle: 20, duration: 260, ease: 'Quad.easeIn' });
    run.time.delayedCall(270, () => { run.cameras.main.shake(400, 0.02); run.g.die(); run.tweens.add({ targets: paw, alpha: 0, delay: 600, duration: 300 }); });
    this.say('*SWAT!*', 1.2); Sfx.play(run, 'hiss_growl');
    run.events.emit('danger', 1);
  }
  /** Fire an arrow from the bow: a marker shows where it lands in the path, then it sticks there (jump it). */
  fireArrow(it) {
    const run = this.run;
    if (this.phase !== 'chase') { it.skip = true; return; }
    this.grunt.act('bow', 0.9); this.say('*grrrr...*', 0.8); Sfx.play(run, 'growl');
    it.flightT = 0; it.flight = 1.15;
  }
  destroy() { this.grunt.destroy(); }
}
