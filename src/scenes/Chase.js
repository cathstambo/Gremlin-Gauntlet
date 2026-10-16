// World 3 chase rules (GDD Grunt section + Cath's decisions, 15 Oct 2026; retuned after Cath's playtest), plugged into the Run scene.
//   Proximity Meter (0 = way behind, off screen; 100 = caught). The distance really moves:
//     - running clean pulls you away: after a couple of seconds without a hit, he drops back steadily;
//     - every so often he SURGES (roar + quicker stomps) and closes the gap fast unless you blast him;
//     - every hit you take (a stumble) lets him close in a lot;
//     - a magic bolt fired BACK at him (BLAST BACK / swipe left) knocks him well back and stuns him for a moment.
//   At 100 he catches you: a giant paw swipe ends the attempt (retry this run, meter reset).
//   The meter carries over to the next run; it only resets when you die.
import { DIFF } from '../difficulty.js?v=20261016162515';
import { Grunt } from '../grunt/Grunt.js?v=20261016162515';
import { Sfx } from '../audio/Music.js?v=20261016162515';

export const CHASE = {
  // Difficulty ramps up (Cath, 15 Oct): gentle at the start of Into the Wild, tighter towards its end, and tighter again
  // on each later run. Settings with an [easy, hard] pair slide between the two as the "heat" rises (see heat()).
  pullAway: [3.6, 2.4],    // meter points per second you gain on him while running clean...
  cleanAfter: 2.0,         // ...once you've gone this many seconds without a hit
  floor: 10,               // he never drops further back than this (he's always coming; off screen you see his shadow)
  creep: [0.5, 1.5],       // he gains this much per second while you're not running clean
  surgeEvery: [[16, 20], [8, 11]],   // seconds between his surges
  firstSurge: [12, 6],     // seconds before his first surge
  surgeTime: 2.2, surgeRate: [9, 12],   // a surge lasts this long and closes the gap this fast (per second)
  clear: 3,                // eased back for each hazard / creature cleared without being hit
  hit: [14, 22],           // brought closer when you take a hit (you stumble)
  blast: 15,           // knocked back by a bolt fired back at him (and it stops a surge)
  stun: 1.2,           // ...and he's stunned (stands still) for this long
  blastCooldown: 2.5,  // seconds before another bolt can knock him back again
  fireStumble: 0.5,    // firing back makes the gremlin stumble (half speed) for this long...
  fireCost: 4,         // ...and Grunt gains this much (a hit knocks him back 15, so a hit is still well worth it)
  defeat: 3,           // eased back when you blast a creature
  fall: 25,            // falling into a bridge gap (River Run) lets him close in a lot
  warnAt: 72,          // red screen edges from here
};
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const mix = (v, h) => Array.isArray(v) ? v[0] + (v[1] - v[0]) * h : v;

export class Chase {
  constructor(run, startProx) {
    this.run = run; this.prox = startProx; this.shown = -40; this.phase = 'eyes'; this.blastT = 0; this.t = 0;
    this.grunt = new Grunt(run, run.GROUND_Y, run.W.view ? run.W.view.gruntH : 800);
    this.grunt.onStep = () => { if (this.phase === 'chase') run.cameras.main.shake(70, 0.0012 + 0.0025 * this.prox / 100); };
    this.eyes = run.add.graphics().setDepth(2.6);
    this.caption = run.add.text(0, 0, '', { fontFamily: 'Lilita One, Trebuchet MS, sans-serif', fontSize: 46, color: '#ffe9a8', stroke: '#140a04', strokeThickness: 10 }).setOrigin(0.5).setDepth(20).setAlpha(0);
    // a retry or a later run starts with him already on your tail; the very first run opens with the eyes in the trees
    if (run.stage > 1 || run.retry) { this.phase = 'chase'; this.shown = this.prox; this.grunt.frontX = this.frontFor(this.prox); }
    run.events.emit('prox', this.phase === 'chase' ? this.prox : null);
    Sfx.load(run.game);   // fetch the cat noises early (only plays if sound is on)
  }
  // where his front claws are on screen: off the left edge when far back (only his shadow and stomps), at the gremlin at 100
  /** 0 = easiest (start of run 1) … 1 = hardest (end of run 4). Each run adds a quarter; going through a run adds up to 0.45. */
  heat() {
    const run = this.run, end = this.endD || (this.endD = (run.items.find(i => i.t === 'finish') || { d: 25000 }).d);
    return clamp((run.stage - 1) * 0.25 + 0.45 * clamp(run.dist / end, 0, 1), 0, 1);
  }
  get(k) { return mix(CHASE[k], this.heat()); }
  /** Final Sprint made 15% easier (Cath, 15 Oct): Grunt gains 15% less and you pull away 15% faster there. */
  get softK() { return (this.run.stage === 4 ? 0.85 : 1) * DIFF.k.grunt; }   // Final Sprint eased 15%; difficulty dial
  frontFor(p) {
    const G = this.run.GREMLIN_X - 30;
    if (this.run.W.view) {   // test version: always fully on screen; the gap opens and closes visibly (eased so small changes show)
      const far = 531 * this.grunt.k + 20, u = clamp((p - CHASE.floor) / (100 - CHASE.floor), 0, 1);
      return far + (G - far) * Math.pow(u, 0.6);
    }
    return -60 + (G + 60) * clamp(p, -60, 100) / 100;
  }
  say(text, dur = 1.2) {
    const h = this.grunt.headPoint();
    this.caption.setText(text).setPosition(clamp(h[0] + 60, 330, this.run.GREMLIN_X + 380), Math.max(300, h[1] + 80)).setAlpha(1).setScale(1);
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
    if (this.phase === 'burst' || this.phase === 'chase' || this.phase === 'ending') {
      if (this.phase === 'chase' && run.mode === 'running') this.pace(dt);
      if (this.phase === 'ending') { this.prox += (this.endProx - this.prox) * Math.min(1, dt * 1.5); }
      this.shown += (this.prox - this.shown) * Math.min(1, dt * 2.5);
      if (this.phase !== 'ending') run.events.emit('prox', this.prox);
      if (this.prox >= 100 && run.mode === 'running' && this.phase === 'chase') this.caught();
      // near-capture warning (GDD): red edges plus his yowl as he closes in
      if (this.phase === 'chase' && this.prox >= CHASE.warnAt && !this.warned) { this.warned = true; Sfx.play(run, ['yowl', 'yowl2'], 4); }
      if (this.prox < CHASE.warnAt - 8) this.warned = false;
    }
    const walking = this.phase === 'ending' ? Math.abs(this.prox - this.endProx) > 1.5 && !this.grunt.fall : (run.mode !== 'dying' && run.mode !== 'gameover' || this.phase === 'catch') && this.stunT <= 0;
    this.updateFish(dt); this.updateStomps(dt);
    this.grunt.speed = this.surgeT > 0 ? 1.7 : 1;
    this.grunt.update(dt, this.phase === 'eyes' ? -500 : this.frontFor(this.shown), walking);
    this.drawShadow();
    run.events.emit('danger', this.phase === 'chase' && this.prox >= CHASE.warnAt ? (this.prox - CHASE.warnAt) / (100 - CHASE.warnAt) : 0);
  }
  /** The distance: you pull away while running clean, he surges every so often, a blast stuns him. */
  pace(dt) {
    const run = this.run;
    this.cleanT = (this.cleanT || 0) + dt; this.stunT = Math.max(0, (this.stunT || 0) - dt);
    const h = this.heat(), E = this.softK, pull = mix(CHASE.pullAway, h) / E;
    if (this.stunT > 0) { this.prox = Math.max(Math.min(this.prox, CHASE.floor), this.prox - pull * dt); return; }
    if (this.surgeT > 0) {
      this.surgeT -= dt; this.prox = clamp(this.prox + mix(CHASE.surgeRate, h) * E * dt, 0, 100);
    } else {
      this.nextSurge = (this.nextSurge ?? mix(CHASE.firstSurge, h) / E) - dt;
      if (this.nextSurge <= 0) {   // telegraphed: a roar and a big stomp, then he charges
        const [a, b] = CHASE.surgeEvery.map(r => r[0] + (r[1] - r[0]) * h);
        this.surgeT = CHASE.surgeTime; this.nextSurge = (a + Math.random() * (b - a)) / E;
        this.say('*RAAAWR!*', 1.0); Sfx.play(run, ['yowl', 'yowl2'], 1); run.cameras.main.shake(300, 0.008);
        run.events.emit('surge');
      } else if (this.cleanT > CHASE.cleanAfter) this.prox = Math.max(Math.min(this.prox, CHASE.floor), this.prox - pull * dt);
      else this.prox = clamp(this.prox + mix(CHASE.creep, h) * E * dt, 0, 100);
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
  closer(n = this.get('hit'), stumble = true) { if (stumble) this.cleanT = 0; if (this.phase === 'chase') { this.prox = clamp(this.prox + n * this.softK, 0, 100); if (this.prox > 60) this.say('*YOWL!*', 0.9); } }
  ease(n) { if (this.phase === 'chase') this.prox = Math.max(Math.min(this.prox, CHASE.floor), this.prox - n); }   // never further back than the floor
  /** River Run (GDD): a salmon leaps out of the river right in front of him and he can't resist it. He stops to swat at it
   *  for a couple of seconds (standing still, so you pull away), then gets back to the chase. */
  distract(dur) {
    if (this.phase !== 'chase') return;
    this.stunT = dur; this.surgeT = 0; this.nextSurge = Math.max(this.nextSurge ?? 0, dur + 4);
    this.fishT = 0; this.fishDur = dur;
    const run = this.run;
    this.fish = this.fish || run.add.image(0, 0, 'r_salmon').setDepth(8.5).setScale(0.32).setFlipX(true);
    this.fish.setVisible(true);
    this.say('*!!*', 0.6); run.time.delayedCall(700, () => { if (this.phase === 'chase') { this.say('*mrrrp?*', 1.2); Sfx.play(run, 'mrrrp'); } });
    run.events.emit('distracted');
  }
  updateFish(dt) {
    if (!this.fish || !this.fish.visible) return;
    this.fishT += dt; const u = this.fishT / this.fishDur, h = this.grunt.headPoint();
    // leaps up in front of his face, flips about while he paws at it, then drops back into the river
    const x = h[0] + 90 + 60 * Math.sin(this.fishT * 7), y = u < 0.15 ? this.run.GROUND_Y - (this.run.GROUND_Y - h[1] - 60) * (u / 0.15)
      : u > 0.85 ? h[1] + 60 + (this.run.GROUND_Y + 200 - h[1]) * ((u - 0.85) / 0.15) : h[1] + 60 + 40 * Math.sin(this.fishT * 9);
    this.fish.setPosition(x, y).setRotation(this.fishT * 9);
    if (Math.floor(this.fishT * 3) !== Math.floor((this.fishT - dt) * 3) && u < 0.85) this.grunt.flinch = 0.5;
    if (u >= 1) this.fish.setVisible(false);
  }
  /** Final Sprint (GDD "giant paw impacts behind the player"; Cath: behind you, pure pressure, never in the way).
   *  His giant paw slams down on the trail between him and the gremlin; the closer he is, the more often and the nearer. */
  updateStomps(dt) {
    const run = this.run; if (run.stage !== 4) return;
    const scroll = run.mode === 'running' ? run.g.worldSpeed * dt : 0;
    this.paws = this.paws || [];
    if (this.phase === 'chase' && run.mode === 'running') {
      this.stompT = (this.stompT ?? 3) - dt;
      if (this.stompT <= 0) {
        const p = this.prox / 100; this.stompT = 4.2 - 2.4 * p + Math.random() * 1.2;
        const G = run.GREMLIN_X, x = Math.min(G - 200, this.grunt.frontX + (G - this.grunt.frontX) * (0.35 + 0.35 * p));
        const im = run.add.image(x, run.GROUND_Y - 900, 'f_paw_down').setOrigin(0.5, 1).setScale(0.78).setDepth(9);
        this.paws.push({ im, t: 0, st: 'down' });
      }
    }
    for (const w of this.paws) {
      w.t += dt; w.im.x -= scroll;
      if (w.st === 'down') {
        const u = Math.min(1, w.t / 0.22); w.im.y = run.GROUND_Y - 900 + (900 + 30) * u * u;
        if (u >= 1) {
          w.st = 'hit'; w.t = 0; w.im.setTexture('f_paw_hit').setY(run.GROUND_Y + 40);
          run.cameras.main.shake(220, 0.006 + 0.008 * this.prox / 100); run.g.fx.dust?.(12, 1.4, [w.im.x, run.GROUND_Y]);
          Sfx.play(run, 'growl', 2);
        }
      } else if (w.st === 'hit') { if (w.t > 0.35) { w.st = 'up'; w.t = 0; w.im.setTexture('f_paw_planted'); } }
      else if (w.st === 'up') { const u = Math.min(1, w.t / 0.35); w.im.y = run.GROUND_Y + 40 - 900 * u * u; w.im.alpha = 1 - u; if (u >= 1) { w.im.destroy(); w.dead = true; } }
    }
    this.paws = this.paws.filter(w => !w.dead);
  }
  /** Uzi Rampage: a burst from the dual Uzis (GDD: he hisses for the Uzis). */
  uzi() {
    if (this.phase !== 'chase') return;
    this.grunt.act('uzi', 0.9); this.say('*HISSSS!*', 0.7); Sfx.play(this.run, ['hiss_growl', 'snarl'], 1);
  }
  /** Uzi Rampage (GDD): an Uzi jams, he paw-smacks it, and stands still for a moment while you get away. */
  jam(dur) {
    if (this.phase !== 'chase') return;
    const run = this.run;
    this.stunT = dur; this.surgeT = 0; this.nextSurge = Math.max(this.nextSurge ?? 0, dur + 4);
    this.grunt.act('uzi', dur * 0.6); this.say('*click… click*', 0.9);
    run.time.delayedCall(950, () => { if (this.phase !== 'chase') return; this.say('*SMACK!*', 0.8); this.grunt.flinch = 0.8; run.cameras.main.shake(120, 0.004); Sfx.play(run, 'growl'); });
    run.time.delayedCall(1800, () => { if (this.phase === 'chase') { this.grunt.flinch = 0.6; this.say('*SMACK!!*', 0.7); } });
  }
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
