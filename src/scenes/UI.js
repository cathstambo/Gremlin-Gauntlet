// HUD and controls for whichever game scene is active ('Run' = test course, 'Boss' = Eddie's arena):
// hearts, Chaos Meter, boss health, pause, touch buttons, swipe gestures, keyboard, overlays.
import { Music } from '../audio/Music.js?v=20261016162515';
import { DIFF, saveBest } from '../difficulty.js?v=20261016162515';
import { WORLDS, worldNo, LAST_WORLD } from '../worlds.js?v=20261016162515';
const FONT = 'Lilita One, Arial Rounded MT Bold, Trebuchet MS, sans-serif';
const BODY = 'Atkinson Hyperlegible, system-ui, sans-serif';
const INK = '#ece6f5', VIOLET = 0x9b4dff, ACID = 0xc6f135, MOULD = 0x9fcc1e;

export class UI extends Phaser.Scene {
  constructor() { super('UI'); }

  get isBoss() { return (this.registry.get('gameScene') || '').startsWith('Boss'); }
  get world() { return worldNo(this.registry); }

  create() {
    const W = this.scale.width, H = this.scale.height;
    this.run = this.scene.get(this.registry.get('gameScene') || 'Run');
    this.input.addPointer(3);   // multi-touch: move with one thumb while jumping with the other
    this.paused = false;

    // hearts
    this.heartIcons = [0, 1, 2, 3, 4, 5].map(i => this.add.image(70 + i * 80, 70, i >= 3 ? 'heartGold' : 'heart').setScale(0.8));   // 4th–6th = gold bonus hearts
    this.add.text(30, 172, DIFF.k.label, { fontFamily: FONT, fontSize: 26, color: '#b9a3d9' }).setOrigin(0, 0).setAlpha(0.8);
    this.scoreTxt = this.add.text(30, 120, '0', { fontFamily: FONT, fontSize: 40, color: '#ffd76a', stroke: '#2b1a05', strokeThickness: 8 }).setOrigin(0, 0);
    // Chaos Meter
    const cx = this.isBoss ? 760 : W / 2, mw = this.isBoss ? 420 : 520;
    this.add.text(cx, 34, 'CHAOS', { fontFamily: FONT, fontSize: 30, color: INK }).setOrigin(0.5).setAlpha(0.85);
    this.add.rectangle(cx, 78, mw, 34, 0x0e1614, 0.75).setStrokeStyle(3, 0xece6f5, 0.35);
    this.meterW = mw - 8; this.meter = this.add.rectangle(cx - this.meterW / 2, 78, 0, 26, VIOLET).setOrigin(0, 0.5);
    this.meterGlow = this.add.rectangle(cx, 78, mw + 10, 44).setStrokeStyle(5, ACID, 1).setAlpha(0);
    this.ready = this.add.text(cx, 122, 'MELTDOWN READY', { fontFamily: FONT, fontSize: 26, color: '#c6f135' }).setOrigin(0.5).setAlpha(0);
    // boss health
    if (this.isBoss) {
      const bx = 1370;
      this.add.text(bx, 34, `${WORLDS[this.world].bossName} · ${WORLDS[this.world].bossTitle}`, { fontFamily: FONT, fontSize: 30, color: '#d8ff8a' }).setOrigin(0.5).setAlpha(0.95);
      this.add.rectangle(bx, 78, 560, 34, 0x0e1614, 0.75).setStrokeStyle(3, 0xd8ff8a, 0.45);
      this.bossBar = this.add.rectangle(bx - 276, 78, 552, 26, MOULD).setOrigin(0, 0.5);
      for (const f of [0.7, 0.35]) this.add.rectangle(bx - 276 + 552 * f, 78, 4, 30, 0x0e1614, 0.9);   // phase marks
      this.phaseNames = this.world === 5 ? ['', 'PHASE 1 · LASER TITS OF DOOM', 'PHASE 2 · THE GREAT DONG OFFENSIVE', 'PHASE 3 · MAXIMUM PENETRATION'] : this.world === 4 ? ['', 'PHASE 1 · LA CHANCLA OF DOOM', 'PHASE 2 · GIN & TONIC WARFARE', 'PHASE 3 · THE BIG CHEESE MELTDOWN'] : this.world === 2 ? ['', 'PHASE 1 · SALMON SLAPPER', 'PHASE 2 · SPOONAGEDDON', 'PHASE 3 · ROYAL TANTRUM'] : ['', 'PHASE 1 · ROCK BUFFET', 'PHASE 2 · MOULD MAYHEM', 'PHASE 3 · THE MOULDENING'];
      this.phaseTxt = this.add.text(bx, 122, this.phaseNames[1], { fontFamily: FONT, fontSize: 24, color: '#d8ff8a' }).setOrigin(0.5).setAlpha(0.85);
      this.vulTxt = this.add.text(bx, 160, this.world === 1 ? 'VULNERABLE! BLAST HIM!' : 'VULNERABLE! BLAST HER!', { fontFamily: FONT, fontSize: 30, color: '#c6f135', stroke: '#14200a', strokeThickness: 8 }).setOrigin(0.5).setAlpha(0);
    }

    // World 3: Grunt's Proximity Meter, red danger edges, and the BLAST BACK button
    if (this.world === 3 && !this.isBoss) {
      const px = 1370;
      this.proxLabel = this.add.text(px, 34, 'GRUNT IS COMING', { fontFamily: FONT, fontSize: 30, color: '#ffb0a0' }).setOrigin(0.5).setAlpha(0);
      this.proxBack = this.add.rectangle(px, 78, 560, 34, 0x0e1614, 0.75).setStrokeStyle(3, 0xffb0a0, 0.45).setAlpha(0);
      this.proxBar = this.add.rectangle(px - 276, 78, 0, 26, 0xff5a3a).setOrigin(0, 0.5).setAlpha(0);
      this.proxPaw = this.add.text(px + 300, 78, '🐾', { fontSize: 34 }).setOrigin(0.5).setAlpha(0);
      this.dangerG = this.add.graphics().setDepth(40);
      this.blastBtn = this.roundButton(380, H - 130, 84, 'BLAST\nBACK', () => this.act('blastBack'), 26, 0xff5a3a);
    }

    // pause + fullscreen
    this.roundButton(W - 70, 70, 52, 'II', () => this.togglePause(), 30);
    this.speakerButton(W - 70, 190);
    if (this.scale.fullscreenAvailable) this.roundButton(W - 190, 70, 52, '⛶', () => this.scale.isFullscreen ? this.scale.stopFullscreen() : this.scale.startFullscreen(), 34);

    // action buttons (big, thumb-sized)
    const R = 92, by = H - 130;
    this.roundButton(W - 150, by, R, 'JUMP', () => this.act('jump'));
    this.roundButton(W - 370, by, R, 'MAGIC', () => this.act('magic'), 30, VIOLET);
    this.meltBtn = this.roundButton(W - 260, by - 220, 84, 'MELT\nDOWN', () => this.act('meltdown'), 26, ACID);
    this.meltBtn.setVisible(false);
    if (this.isBoss) {
      this.makeStick(240, by - 40);   // left thumb: floating joystick (move, pull down = slide, flick up = jump)
    } else {
      this.roundButton(150, by, R, 'SLIDE', () => this.act('slide'));
    }

    // swipe / tap anywhere else
    this.input.on('pointerdown', (p, over) => { if (over.length) return; if (this.stickDown(p)) return; this.gesture = { x: p.x, y: p.y, done: false, id: p.id }; });
    this.input.on('pointermove', p => {
      if (this.stickMove(p)) return;
      const g = this.gesture; if (!g || g.done || g.id !== p.id) return;
      const dx = p.x - g.x, dy = p.y - g.y;
      if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 70) { g.done = true; this.act(this.isBoss ? (dx > 0 ? 'dashR' : 'dashL') : (dx > 0 ? 'magic' : this.world === 3 ? 'blastBack' : 'none')); }
      else if (dy > 60) { g.done = true; this.act('slide'); }
      else if (dy < -60) { g.done = true; this.act('jump'); }
    });
    this.input.on('pointerup', p => { if (this.stickUp(p)) return;  const g = this.gesture; if (g && !g.done && g.id === p.id) this.act('jump'); this.gesture = null; });
    // keyboard
    this.input.keyboard.on('keydown', e => {
      if (e.repeat) return;
      const k = e.code;
      if (['Space', 'ArrowUp', 'KeyW'].includes(k)) this.act('jump');
      else if (['ArrowDown', 'KeyS'].includes(k)) this.act('slide');
      else if (this.isBoss && ['ArrowLeft', 'KeyA'].includes(k)) this.act('left', true);
      else if (this.isBoss && ['ArrowRight', 'KeyD'].includes(k)) this.act('right', true);
      else if (this.world === 3 && ['ArrowLeft', 'KeyA', 'KeyB'].includes(k)) this.act('blastBack');
      else if (['KeyF', 'KeyJ', 'Enter'].includes(k) || (!this.isBoss && ['ArrowRight', 'KeyD'].includes(k))) this.act('magic');
      else if (k === 'KeyM' || k === 'KeyE') this.act('meltdown');
      else if (k === 'KeyP' || k === 'Escape') this.togglePause();
      else if (k === 'KeyH') this.run.showBoxes = !this.run.showBoxes;
    });
    this.input.keyboard.on('keyup', e => {
      if (!this.isBoss) return;
      if (['ArrowLeft', 'KeyA'].includes(e.code)) this.act('left', false);
      if (['ArrowRight', 'KeyD'].includes(e.code)) this.act('right', false);
    });

    // overlays
    this.overlay = this.add.container(0, 0).setDepth(50);
    const stage = this.registry.get('stage') || 1, fresh = !this.registry.get('carry');
    const Wd = WORLDS[this.world], stick = 'Left thumb: drag to run · pull down (or diagonally) to slide · flick up to jump\n';
    if (this.isBoss && this.world === 5) this.showMessage('LASER TITS', 'Level 5 boss · Dungeon of Questionable Pleasures · tap to start',
      stick + 'JUMP button: jump and double jump   ·   MAGIC: only hurts her while she’s VULNERABLE\nLasers: low line = jump, high line = slide · Rings show where things land · When the floor glows, get up on a bench');
    else if (this.isBoss && this.world === 4) this.showMessage('QUESO JEFE', 'Level 4 boss · The Cheddar Cartel · tap to start',
      stick + 'JUMP button: jump and double jump   ·   MAGIC: only hurts her while she’s VULNERABLE\nChanclas: low = jump, high = slide · Gold rings: a cheese wheel lands there · Gin puddles are slippery');
    else if (this.isBoss && this.world === 2) this.showMessage('THE EVIL OVERLORD', 'Level 2 boss · Meadows of Malicious Happiness · tap to start',
      stick + 'JUMP button: jump and double jump   ·   MAGIC: only hurts her while she’s VULNERABLE\nWatch the sparkles: they show where fish and spoons are about to go');
    else if (this.isBoss) this.showMessage('THE MOULD KING', 'Level 1 boss · The Festering Swamp · tap to start',
      stick + 'JUMP button: jump and double jump   ·   MAGIC: only hurts Eddie while he’s VULNERABLE\nWatch the markers: green = mould bomb, red = danger, gold = where Eddie lands');
    else if (this.world === 3) this.showMessage(`WORLD 3 · RUN ${stage}`, `${Wd.runNames[stage - 1]} · tap to start`,
      stage === 1 ? 'Something huge is in the woods. Don’t let him catch you.\nRoots & boulders: jump · ' + (WORLDS[3].noTrunks ? '' : 'Fallen trunks: slide under · ') + 'Arrows: watch the red marker\nBLAST BACK (or swipe left) fires magic behind you to knock Grunt back' : stage === 4 ? 'The last stretch. He’s right behind you and he’s FURIOUS.\nEverything at once: jump the debris, slide the shelves, double jump the canyon\nKeep going: his giant paw is slamming down behind you'
      : stage === 3 ? 'He’s got the Uzis out.\nRed marker = debris landing there: it stays on the trail, so jump it\nRock shelves: slide · Bears and moose: double jump or blast · Hawks: slide or blast'
      : stage === 2 ? 'Over the river. He’s still coming.\nRocks: jump · Broken bridge: jump · Canyon: DOUBLE jump · Leaping salmon: slide\nBears swipe where the red line shows: low = jump, high = slide · Moose: double jump or blast twice'
      : 'Grunt is still right behind you. Keep running.');
    else if (stage === 2) this.showMessage(`${Wd.stageName} · PART 2`, 'Deeper in. Nastier. · tap to start', `${Wd.bossName === 'EDDIE' ? 'Eddie waits' : Wd.bossName === 'RINA' ? 'The Queso Jefe waits' : Wd.bossName === 'SYLVANAS' ? 'Sylvanas waits' : 'The Evil Overlord waits'} at the end of this one.`);
    else if (this.world === 5) this.showMessage('WORLD 5', 'Dungeon of Questionable Pleasures · tap to start', 'Welcome. Safe word: TACOS.\nSkeletons, hounds & mimic tongues: jump · Gargoyles, floggers & flying paddles: slide\nKnights can’t be blasted: slide under the whip · Red markers: something is landing there');
    else if (this.world === 4) this.showMessage('WORLD 4', 'The Cheddar Cartel · tap to start', 'Welcome to the wrong neighbourhood.\nRats & rolling cheese wheels: jump · Flying crackers: slide · Mozzarella: jump it, it’s sticky\nCheese river: jump (wide ones: DOUBLE jump) · Armoured rats take two blasts');
    else if (this.world === 2) this.showMessage('WORLD 2', 'Meadows of Malicious Happiness · tap to start', 'Everything here is cute. Everything here wants you dead.\nBunnies: jump · Kittens: slide · Flowers: jump · Butterflies: they blind you\nCrystal turrets fire rainbow beams: low beam = jump, high beam = slide');
    else this.showMessage('WORLD 1', 'The Festering Swamp · tap to start', 'Tap / swipe up: jump (tap again in the air to double jump)\nSwipe down: slide   ·   Swipe right: magic\nCollect 10 crystals to fill the Chaos Meter, then hit MELTDOWN');

    const ev = this.run.events;
    ev.on('hearts', n => this.setHearts(n));
    ev.on('chaos', c => this.setChaos(c));
    ev.on('score', n => this.setScore(n));
    ev.on('bosshp', (f, ph) => this.setBoss(f, ph));
    ev.on('prox', p => this.setProx(p));
    ev.on('blastReady', ok => this.blastBtn?.setAlpha(ok ? 1 : 0.4));
    ev.on('danger', k => this.setDanger(k));
    ev.on('bossvuln', d => { this.tweens.killTweensOf(this.vulTxt); this.vulTxt.setAlpha(1); this.tweens.add({ targets: this.vulTxt, alpha: 0, delay: d * 1000 - 300, duration: 300 }); });
    ev.on('gameover', msg => this.showMessage(msg || 'SPLAT.', this.isBoss ? 'Tap to retry the boss (3 hearts, Chaos Meter reset)' : this.world === 3 ? 'Tap to retry this run (3 hearts, Grunt back where he started)' : this.scene.get('Run').stage === 2 ? 'Tap to retry part 2 (3 hearts, score kept from part 1)' : 'Tap to restart part 1'));
    ev.on('finished', info => this.time.delayedCall(this.isBoss ? 300 : 1200, () => {
      if (this.isBoss || (this.world === 3 && info.ending)) {
        const best = saveBest(this.world, info.score, this.registry.get('assisted'));
        const what = this.world === 3 ? `Grunt has been hairballed · Final Sprint ${info.time.toFixed(1)} s` : `${this.world === 5 ? 'Sylvanas has been returned to sender' : this.world === 4 ? 'The Queso Jefe has been cheesed' : this.world === 2 ? 'The Evil Overlord has been dethroned' : 'The Mould King has been mouldered'} · ${info.time.toFixed(1)} s`;
        this.showMessage(best ? 'NEW BEST!' : 'BOSS DEFEATED', `${what} · score ${info.score.toLocaleString()}`,
          info.breakdown + (this.registry.get('assisted') ? '\n(Assisted retry: doesn’t count towards your best score)' : '') + '\n\nTap to return to the menu');
      }
      else if (this.world === 3) { const Wd = WORLDS[3], more = info.stage < Wd.stages.length;
        this.showMessage(`RUN ${info.stage} CLEARED`, more ? `Tap for run ${info.stage + 1}: ${Wd.runNames[info.stage]}` : 'You escaped (for now) · tap to play Into the Wild again',
          `Score so far: ${info.score.toLocaleString()}` + (more ? '' : '\nRuns ' + (Wd.stages.length + 1) + ' to 4 (' + Wd.runNames.slice(Wd.stages.length).join(', ') + ') are on their way')); }
      else if (this.world === 5) this.showMessage(info.stage === 1 ? 'DUNGEON PART 1 CLEARED' : 'DUNGEON CLEARED', info.stage === 1 ? 'Tap for part 2' : 'Tap to face LASER TITS', `Score so far: ${info.score.toLocaleString()}`);
      else if (this.world === 4) this.showMessage(info.stage === 1 ? 'VILLAGE PART 1 CLEARED' : 'VILLAGE CLEARED', info.stage === 1 ? 'Tap for part 2' : 'Tap to face THE QUESO JEFE', `Score so far: ${info.score.toLocaleString()}`);
      else if (info.stage === 1) this.showMessage('SWAMP PART 1 CLEARED', 'Tap for part 2', `Score so far: ${info.score.toLocaleString()}`);
      else this.showMessage('SWAMP CLEARED', 'Tap to face THE MOULD KING', `Score so far: ${info.score.toLocaleString()}`);
    }));
    this.setHearts(this.run.hearts ?? 3); this.setChaos(this.run.chaos ?? 0); this.setScore(this.run.score ?? 0);
  }

  roundButton(x, y, r, label, fn, size = 30, ring = 0xece6f5, onUp = null) {
    const c = this.add.container(x, y);
    const bg = this.add.circle(0, 0, r, 0x0e1614, 0.5).setStrokeStyle(4, ring, 0.7);
    const t = this.add.text(0, 0, label, { fontFamily: FONT, fontSize: size, color: INK, align: 'center' }).setOrigin(0.5);
    c.add([bg, t]); c.setSize(r * 2, r * 2);
    c.setInteractive(new Phaser.Geom.Circle(r, r, r), Phaser.Geom.Circle.Contains);
    c.on('pointerdown', () => { bg.setFillStyle(VIOLET, 0.85); fn(); });
    const up = () => { bg.setFillStyle(0x0e1614, 0.5); if (onUp && c.held) onUp(); c.held = false; };
    c.on('pointerdown', () => { c.held = true; });
    c.on('pointerup', up); c.on('pointerout', up);
    return c;
  }

  // ---------- boss joystick ----------
  // Put a thumb anywhere on the left side: the stick appears under it. Lean left/right to run; pull down (straight or
  // diagonally) to slide that way; flick up to jump (lean to jump sideways). Let go to stop.
  makeStick(x, y) {
    const R = 120;
    this.stick = { home: [x, y], R, id: null, base: [x, y], dir: 0, slideArmed: true, jumpArmed: true };
    this.stickBase = this.add.circle(x, y, R, 0x0e1614, 0.45).setStrokeStyle(4, 0xece6f5, 0.55);
    this.stickKnob = this.add.circle(x, y, 52, 0xece6f5, 0.35).setStrokeStyle(4, 0xece6f5, 0.8);
    this.stickHint = this.add.text(x, y + R + 30, 'MOVE · pull ↓ to SLIDE', { fontFamily: FONT, fontSize: 26, color: INK }).setOrigin(0.5).setAlpha(0.6);
    this.stickZone = p => p.x < this.scale.width * 0.42 && p.y > 260;
  }
  stickDown(p) {
    const s = this.stick; if (!s || s.id !== null || !this.stickZone(p) || (this.overlay.visible)) return false;
    s.id = p.id; s.base = [p.x, p.y]; s.slideArmed = s.jumpArmed = true;
    this.stickBase.setPosition(p.x, p.y).setAlpha(1); this.stickKnob.setPosition(p.x, p.y).setFillStyle(0x9b4dff, 0.7);
    this.stickHint.setAlpha(0);
    return true;
  }
  stickMove(p) {
    const s = this.stick; if (!s || s.id !== p.id) return false;
    let dx = p.x - s.base[0], dy = p.y - s.base[1];
    const d = Math.hypot(dx, dy); if (d > s.R) { dx *= s.R / d; dy *= s.R / d; }
    this.stickKnob.setPosition(s.base[0] + dx, s.base[1] + dy);
    const nx = dx / s.R, ny = dy / s.R;
    const dir = Math.abs(nx) > 0.3 ? Math.sign(nx) : 0;
    if (dir !== s.dir) { s.dir = dir; this.act('stick', dir); }
    if (ny > 0.5 && s.slideArmed) { s.slideArmed = false; this.act('slideDir', Math.abs(nx) > 0.2 ? Math.sign(nx) : 0); }
    if (ny < 0.3) s.slideArmed = true;
    if (ny < -0.6 && s.jumpArmed) { s.jumpArmed = false; this.act('jump'); }
    if (ny > -0.3) s.jumpArmed = true;
    return true;
  }
  stickUp(p) {
    const s = this.stick; if (!s || s.id !== p.id) return false;
    s.id = null; s.dir = 0; this.act('stick', 0);
    this.stickBase.setPosition(...s.home).setAlpha(0.6); this.stickKnob.setPosition(...s.home).setFillStyle(0xece6f5, 0.35);
    return true;
  }

  /** Music on/off. Off by default; the choice is remembered on this device. */
  speakerButton(x, y) {
    const r = 46, c = this.add.container(x, y).setDepth(60);   // above the overlays, so it works on the start and pause screens too
    const bg = this.add.circle(0, 0, r, 0x0e1614, 0.5).setStrokeStyle(4, 0xece6f5, 0.7);
    const g = this.add.graphics();
    const draw = () => {
      g.clear().fillStyle(0xece6f5, 1);
      g.fillRect(-22, -9, 12, 18).fillTriangle(-12, -9, 4, -22, 4, 22).fillTriangle(-12, 9, 4, -22, 4, 22);   // speaker
      if (Music.on) { g.lineStyle(4, 0xc6f135, 1); g.beginPath(); g.arc(6, 0, 10, -0.9, 0.9); g.strokePath(); g.beginPath(); g.arc(6, 0, 19, -0.9, 0.9); g.strokePath(); }
      else { g.lineStyle(5, 0xee2a8a, 1).lineBetween(10, -10, 26, 10).lineBetween(26, -10, 10, 10); }   // muted: red cross
      bg.setStrokeStyle(4, Music.on ? 0xc6f135 : 0xece6f5, 0.7);
    };
    draw();
    c.add([bg, g]); c.setSize(r * 2, r * 2);
    c.setInteractive(new Phaser.Geom.Circle(r, r, r), Phaser.Geom.Circle.Contains);
    c.on('pointerdown', (p, lx, ly, e) => { e && e.stopPropagation(); Music.toggle(this); if (this.paused) Music.pause(true); draw(); });
    return c;
  }

  /** Back to the start menu (stops the game and its music). */
  toMenu() {
    this.paused = false;
    const cur = this.registry.get('gameScene') || 'Run';
    Music.play(this, null);
    this.scene.stop(cur); this.scene.start('Menu');
  }
  /** Start World 1 again from swamp part 1. */
  newLevel(world = 1) { this.registry.set('world', world); this.registry.set('stage', 1); this.registry.remove('carry'); this.goTo('Run'); }
  /** After a boss: on to the next world (every level starts with 3 hearts and an empty Chaos Meter, GDD). */
  nextWorld() { this.newLevel(this.world < LAST_WORLD ? this.world + 1 : 1); }
  /** Testing shortcut: part 1 → part 2 → boss → back to part 1 (fresh hearts each time). */
  skipAhead() {
    if (this.isBoss) return this.newLevel(this.world);
    this.registry.remove('carry');
    if (this.world === 3) { const s = this.registry.get('stage') || 1; if (s < WORLDS[3].stages.length) { this.registry.set('stage', s + 1); this.goTo('Run'); } else this.newLevel(3); return; }
    if ((this.registry.get('stage') || 1) === 1) { this.registry.set('stage', 2); this.goTo('Run'); } else this.goTo(WORLDS[this.world].boss);
  }
  setScore(n) { this.scoreTxt.setText(n.toLocaleString()); }

  // switch between the running stages and the boss arena
  goTo(sceneKey) {
    const cur = this.registry.get('gameScene') || 'Run';
    this.registry.set('gameScene', sceneKey);
    this.scene.stop(cur); this.scene.start(sceneKey); this.scene.restart();
  }

  act(name, down = true) {
    const r = this.run;
    if (this.overlay.visible && !this.paused) {
      if (!down) return;
      if (r.mode === 'ready') { this.overlay.setVisible(false); r.startRun(); }
      else if (r.mode === 'gameover') this.isBoss ? r.retry() : r.restartLevel();
      else if (r.mode === 'finished') r.next();
      else if (r.mode === 'won') this.toMenu();
      return;
    }
    if (this.paused) return;
    r.act(name, down);
  }
  togglePause() {
    if (this.overlay.visible && !this.paused) return;
    this.paused = !this.paused;
    if (this.paused) { this.scene.pause(this.run.scene.key); this.showPauseMenu(); }
    else { this.scene.resume(this.run.scene.key); this.overlay.setVisible(false); }
    Music.pause(this.paused);
  }
  showPauseMenu() {
    const W = this.scale.width, H = this.scale.height, o = this.overlay; o.removeAll(true);
    o.add(this.add.rectangle(W / 2, H / 2, W, H, 0x0b1210, 0.78).setInteractive());
    o.add(this.add.text(W / 2, 200, 'PAUSED', { fontFamily: FONT, fontSize: 84, color: INK }).setOrigin(0.5));
    const opts = [
      ['Resume', () => this.togglePause()],
      [this.isBoss ? 'Restart boss fight' : 'Restart run', () => { this.paused = false; this.scene.resume(this.run.scene.key); this.run.restart(); }],
      ...(this.world === 3 ? [[(this.registry.get('stage') || 1) < WORLDS[3].stages.length ? 'Skip to the next run' : 'Back to run 1', () => { this.paused = false; this.skipAhead(); }]] : [[this.isBoss ? 'Back to part 1' : (this.registry.get('stage') === 2 ? 'Skip to the boss' : 'Skip to part 2'), () => { this.paused = false; this.skipAhead(); }]]),
      ['Main menu', () => this.toMenu()],
      [() => `Hitboxes: ${this.run.showBoxes ? 'ON' : 'OFF'}`, () => { this.run.showBoxes = !this.run.showBoxes; }],
      [() => `Slow motion: ${this.run.timeScale < 1 ? 'ON' : 'OFF'}`, () => { this.run.timeScale = this.run.timeScale < 1 ? 1 : 0.25; }],
    ];
    opts.forEach(([label, fn], i) => {
      const y = 340 + i * 115;
      const bg = this.add.rectangle(W / 2, y, 600, 90, 0x1b2f29, 1).setStrokeStyle(3, 0xece6f5, 0.4).setInteractive({ useHandCursor: true });
      const txt = this.add.text(W / 2, y, typeof label === 'function' ? label() : label, { fontFamily: FONT, fontSize: 40, color: INK }).setOrigin(0.5);
      bg.on('pointerdown', () => { fn(); if (typeof label === 'function') txt.setText(label()); });
      o.add([bg, txt]);
    });
    o.setVisible(true);
  }
  showMessage(title, sub, help, bossLink = false) {
    const W = this.scale.width, H = this.scale.height, o = this.overlay; o.removeAll(true);
    const bg = this.add.rectangle(W / 2, H / 2, W, H, 0x0b1210, 0.6).setInteractive();
    bg.on('pointerdown', () => this.act('tap'));
    o.add(bg);
    o.add(this.add.text(W / 2, H * 0.27, title, { fontFamily: FONT, fontSize: title.length > 22 ? 70 : 110, color: INK, stroke: '#2b0d55', strokeThickness: 12, align: 'center' }).setOrigin(0.5));
    o.add(this.add.text(W / 2, H * 0.27 + 112, sub, { fontFamily: FONT, fontSize: 58, color: '#c6f135', stroke: '#0b1210', strokeThickness: 8, align: 'center', wordWrap: { width: W - 200 } }).setOrigin(0.5));
    if (help) o.add(this.add.text(W / 2, H * 0.27 + 190, help, { fontFamily: BODY, fontStyle: 'bold', fontSize: 42, color: INK, stroke: '#0b1210', strokeThickness: 6, align: 'center', lineSpacing: 12, wordWrap: { width: W - 160 } }).setOrigin(0.5, 0));
    if (bossLink) {
      const link = (x, label, fn, col = MOULD) => {
        const b = this.add.rectangle(x, H - 150, 580, 96, 0x22341a, 1).setStrokeStyle(4, col, 0.9).setInteractive({ useHandCursor: true });
        const t = this.add.text(x, H - 150, label, { fontFamily: FONT, fontSize: 32, color: '#d8ff8a' }).setOrigin(0.5);
        b.on('pointerdown', (p, lx, ly, e) => { e.stopPropagation(); fn(); });
        o.add([b, t]);
      };
      const Wd = WORLDS[this.world];
      if (bossLink === 'title') {
        link(W / 2 - 600, `Skip to: ${Wd.bossTitle}`, () => { this.registry.remove('carry'); this.goTo(Wd.boss); });
        link(W / 2, `World 2: ${WORLDS[2].bossTitle}`, () => this.newLevel(2), 0xff7ae0);
        link(W / 2 + 600, `World 3: ${WORLDS[3].bossTitle}`, () => this.newLevel(3), 0x6fc3ff);
      } else link(W / 2, `Skip to the boss: ${Wd.bossTitle}`, () => { this.registry.remove('carry'); this.goTo(Wd.boss); }, 0xff7ae0);
    }
    o.setVisible(true);
  }
  setHearts(n) { this.heartIcons.forEach((h, i) => { h.setVisible(i < 3 || i < n); h.setAlpha(i < n ? 1 : 0.18); if (i === n) this.tweens.add({ targets: h, scale: { from: 1.3, to: 0.8 }, duration: 250 }); }); }
  setChaos(c) {
    this.tweens.add({ targets: this.meter, width: this.meterW * c / 100, duration: 200 });
    const full = c >= 100;
    this.meltBtn.setVisible(full); this.ready.setAlpha(full ? 1 : 0);
    if (full && !this.pulse) this.pulse = this.tweens.add({ targets: [this.meterGlow, this.meltBtn], alpha: { from: 0.3, to: 1 }, scale: { from: 1, to: 1.06 }, yoyo: true, repeat: -1, duration: 420 });
    if (!full && this.pulse) { this.pulse.stop(); this.pulse = null; this.meterGlow.setAlpha(0); this.meltBtn.setScale(1).setAlpha(1); }
  }
  setProx(p) {
    if (!this.proxBar) return;
    const on = p !== null && p !== undefined;
    for (const o of [this.proxLabel, this.proxBack, this.proxBar, this.proxPaw]) o.setAlpha(on ? 1 : 0);
    if (!on) return;
    this.proxBar.width = 552 * Math.min(1, p / 100);
    this.proxBar.fillColor = p > 72 ? 0xff2a2a : p > 45 ? 0xff8a3a : 0xffc23a;
  }
  /** Pulsing red screen edges when Grunt is about to catch you (k = 0..1). */
  setDanger(k) {
    if (!this.dangerG) return;
    const G = this.dangerG; G.clear(); if (k <= 0) return;
    const W = this.scale.width, H = this.scale.height, a = (0.25 + 0.45 * k) * (0.6 + 0.4 * Math.sin(this.time.now / 90));
    for (let i = 0; i < 6; i++) { const w = 18 + i * 16, al = a * (1 - i / 6); G.lineStyle(18, 0xff1a1a, al).strokeRect(w / 2, w / 2, W - w, H - w); }
  }
  setBoss(f, ph) {
    this.tweens.add({ targets: this.bossBar, width: 552 * f, duration: 150 });
    this.phaseTxt.setText(this.phaseNames[ph]);
  }
}
