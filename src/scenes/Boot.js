import { SWAMP_FILES } from '../world/Swamp.js?v=20261020102710';
import { Music } from '../audio/Music.js?v=20261020102710';
import { CREATURE_PARTS } from '../creatures/Creatures.js?v=20261020102710';
// Loads the gremlin's parts and makes the simple placeholder textures used by the test run.
export const PARTS = ['body', 'head', 'eye', 'ear', 'tail', 'pouch', 'upperArm', 'foreArm', 'upperArmFar', 'foreArmFar',
  'thighN', 'bootN', 'thighFfar', 'bootFfar'];

export const EDDIE_PARTS = ['torso', 'head', 'face_shout', 'face_chomp', 'face_hurt', 'upN', 'foN', 'upF', 'foF', 'thN', 'shN', 'thF', 'shF', 'rock', 'rock_s1'];

export class Boot extends Phaser.Scene {
  constructor() { super('Boot'); }
  preload() {
    const W = this.scale.width, H = this.scale.height;
    const bar = this.add.rectangle(W / 2 - 300, H / 2, 0, 18, 0x9b4dff).setOrigin(0, 0.5);
    this.add.rectangle(W / 2, H / 2, 604, 24).setStrokeStyle(2, 0xece6f5, 0.4);
    this.add.text(W / 2, H / 2 - 60, 'Waking the gremlin…', { fontFamily: 'Lilita One, Trebuchet MS, sans-serif', fontSize: 44, color: '#ece6f5' }).setOrigin(0.5);
    this.load.on('progress', p => { bar.width = 600 * p; });
    this.load.json('rig', 'assets/gremlin/rig.json');
    for (const n of PARTS) this.load.image('g_' + n, `assets/gremlin/${n}.png`);
    this.load.json('eddieRig', 'assets/eddie/rig.json');
    this.load.json('creatures', 'assets/creatures/creatures.json');
    for (const [k, f] of Object.entries(SWAMP_FILES)) this.load.image(k, f);
    this.load.json('swampSizes', 'assets/swamp/sizes.json');
    for (const [kind, parts] of Object.entries(CREATURE_PARTS)) for (const n of parts) this.load.image(`c_${kind}_${n}`, `assets/creatures/${kind}_${n}.png`);
    for (const n of EDDIE_PARTS) this.load.image('e_' + n, `assets/eddie/${n}.png`);
    for (const n of [1, 2, 3, 4, 5]) this.load.image('menu_thumb' + n, `assets/menu/thumb_world${n}.webp`);   // start menu thumbnails
  }
  create() {
    Music.init();
    this.makeTextures();
    // shortcuts: #boss (Eddie), #world2 (World 2 part 1), #boss2 (the Evil Overlord)
    const h = location.hash;
    const first = h === '#boss' ? 'Boss' : h === '#boss2' ? 'Boss2' : h === '#boss4' ? 'Boss4' : h === '#boss5' ? 'Boss5' : 'Run';
    this.registry.set('world', h.startsWith('#world5') || h === '#boss5' ? 5 : h.startsWith('#world4') || h === '#boss4' ? 4 : h.startsWith('#world3') ? 3 : h === '#world2' || h === '#boss2' ? 2 : 1);
    if (h === '#world4part2' || h === '#world5part2') this.registry.set('stage', 2);   // World 4 (test version): straight to part 2
    this.registry.set('gameScene', first);
    if (h === '#world3run2') this.registry.set('stage', 2);   // shortcut straight to River Run
    if (h === '#world3run3') this.registry.set('stage', 3);   // ...or Uzi Rampage
    if (h === '#world3run4') this.registry.set('stage', 4);   // ...or Final Sprint
    // no shortcut in the address: the game opens on the start menu
    const start = h && h !== '#test4' && h !== '#test5' ? () => { this.scene.start(first); this.scene.launch('UI'); } : () => this.scene.start('Menu');   // #test5: the menu with World 5 (in testing) open
    // wait for the display font so text doesn't jump when it arrives
    if (document.fonts && document.fonts.load) Promise.race([document.fonts.load('40px "Lilita One"'), new Promise(r => setTimeout(r, 1500))]).then(start);
    else start();
  }
  canvasTex(key, w, h, draw) {
    const t = this.textures.createCanvas(key, w, h); draw(t.getContext(), w, h); t.refresh();
  }
  makeTextures() {
    // soft round glow used for magic, aura and eye glow
    this.canvasTex('glow', 256, 256, (c, w) => {
      const g = c.createRadialGradient(w / 2, w / 2, 0, w / 2, w / 2, w / 2);
      g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,.75)'); g.addColorStop(0.6, 'rgba(255,255,255,.25)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      c.fillStyle = g; c.fillRect(0, 0, w, w);
    });
    // swamp-dusk sky
    this.canvasTex('sky', 4, 1080, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#2c4a40'); g.addColorStop(0.8, '#1b2f29'); g.addColorStop(1, '#162722');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
    });
    // far reeds strip (tiles horizontally)
    this.canvasTex('reeds', 1024, 360, (c, w, h) => {
      c.fillStyle = 'rgba(12,26,22,.6)';
      for (let x = -60, i = 0; x < w; x += 128, i++) {
        const bh = 160 + ((i * 37) % 120) + 60;
        c.beginPath(); c.moveTo(x, h); c.quadraticCurveTo(x + 40, h - bh, x + 90, h - bh * 0.9); c.quadraticCurveTo(x + 120, h - bh * 0.4, x + 180, h); c.fill();
      }
      c.fillStyle = 'rgba(12,26,22,.6)'; c.beginPath(); c.moveTo(w - 60, h); c.quadraticCurveTo(w - 20, h - 220, w + 30, h - 200); c.lineTo(w, h); c.fill();
    });
    // ground strip
    this.canvasTex('ground', 256, 260, (c, w, h) => {
      c.fillStyle = '#3b3322'; c.fillRect(0, 0, w, h); c.fillStyle = '#4b4130'; c.fillRect(0, 0, w, 10);
      c.fillStyle = 'rgba(0,0,0,.28)'; c.fillRect(20, 30, 90, 8); c.fillRect(150, 62, 50, 7); c.fillRect(60, 110, 70, 7);
      c.fillStyle = 'rgba(198,241,53,.12)'; c.fillRect(40, -2, 5, -1); c.fillRect(40, 0, 5, 0);
    });
    // placeholder obstacles (deliberately plain: final art comes later)
    this.canvasTex('log', 200, 110, (c, w, h) => {
      c.fillStyle = '#5a3e26'; c.strokeStyle = '#2a1a0e'; c.lineWidth = 6;
      c.beginPath(); c.roundRect(4, 14, w - 8, h - 18, 40); c.fill(); c.stroke();
      c.fillStyle = '#8a6440'; c.beginPath(); c.ellipse(w - 34, h / 2 + 4, 26, (h - 26) / 2, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      c.strokeStyle = 'rgba(0,0,0,.3)'; c.lineWidth = 3; c.beginPath(); c.ellipse(w - 34, h / 2 + 4, 12, 20, 0, 0, Math.PI * 2); c.stroke();
    });
    this.canvasTex('stump', 160, 350, (c, w, h) => {
      c.fillStyle = '#4e3622'; c.strokeStyle = '#2a1a0e'; c.lineWidth = 6;
      c.beginPath(); c.moveTo(14, h); c.lineTo(24, 30); c.lineTo(w - 24, 30); c.lineTo(w - 14, h); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#8a6440'; c.beginPath(); c.ellipse(w / 2, 32, w / 2 - 24, 22, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 4; for (let y = 90; y < h; y += 70) { c.beginPath(); c.moveTo(30, y); c.lineTo(60, y + 30); c.stroke(); }
    });
    this.canvasTex('branch', 520, 230, (c, w, h) => {
      c.strokeStyle = '#2f2214'; c.lineWidth = 46; c.lineCap = 'round';
      c.beginPath(); c.moveTo(-10, 40); c.quadraticCurveTo(w / 2, 120, w + 10, 60); c.stroke();
      c.strokeStyle = '#3e5a2a'; c.lineWidth = 10;
      for (let x = 40; x < w; x += 55) { c.beginPath(); c.moveTo(x, 80 + Math.sin(x) * 10); c.quadraticCurveTo(x + 10, 150, x - 4, 200 + (x % 3) * 8); c.stroke(); }
    });
    this.canvasTex('frog', 150, 120, (c, w, h) => {
      c.fillStyle = '#4f8a2a'; c.strokeStyle = '#1d3410'; c.lineWidth = 5;
      c.beginPath(); c.ellipse(w / 2, h - 46, 62, 40, 0, 0, Math.PI * 2); c.fill(); c.stroke();
      for (const ex of [w / 2 - 30, w / 2 + 30]) { c.beginPath(); c.arc(ex, 34, 22, 0, Math.PI * 2); c.fill(); c.stroke();
        c.fillStyle = '#f2e86a'; c.beginPath(); c.arc(ex, 32, 12, 0, Math.PI * 2); c.fill(); c.fillStyle = '#111'; c.fillRect(ex - 2, 24, 4, 16); c.fillStyle = '#4f8a2a'; }
      c.strokeStyle = '#1d3410'; c.lineWidth = 4; c.beginPath(); c.moveTo(w / 2 - 32, h - 44); c.quadraticCurveTo(w / 2, h - 30, w / 2 + 32, h - 44); c.stroke();
      c.strokeStyle = '#7a1414'; c.lineWidth = 6; c.beginPath(); c.moveTo(w / 2 - 22, 22); c.lineTo(w / 2 - 6, 30); c.moveTo(w / 2 + 22, 22); c.lineTo(w / 2 + 6, 30); c.stroke();
    });
    this.canvasTex('crystal', 80, 110, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#e7c8ff'); g.addColorStop(0.5, '#a052ff'); g.addColorStop(1, '#5a1fb0');
      c.fillStyle = g; c.strokeStyle = '#2b0d55'; c.lineWidth = 4;
      c.beginPath(); c.moveTo(w / 2, 4); c.lineTo(w - 8, h * 0.38); c.lineTo(w / 2, h - 4); c.lineTo(8, h * 0.38); c.closePath(); c.fill(); c.stroke();
      c.strokeStyle = 'rgba(255,255,255,.6)'; c.beginPath(); c.moveTo(w / 2, 8); c.lineTo(w / 2, h - 10); c.moveTo(10, h * 0.38); c.lineTo(w - 10, h * 0.38); c.stroke();
    });
    this.canvasTex('potion', 90, 120, (c, w, h) => {
      c.fillStyle = '#e8324e'; c.strokeStyle = '#3a0a14'; c.lineWidth = 5;
      c.beginPath(); c.arc(w / 2, h - 44, 38, 0, Math.PI * 2); c.fill(); c.stroke();
      c.fillStyle = '#d9c9b0'; c.fillRect(w / 2 - 14, 10, 28, 30); c.strokeRect(w / 2 - 14, 10, 28, 30);
      c.fillStyle = '#fff'; c.font = 'bold 40px sans-serif'; c.textAlign = 'center'; c.fillText('♥', w / 2, h - 30);
    });
    // ---- Eddie's mould attacks (drawn here so they stay crisp at any size) ----
    this.canvasTex('mouldBomb', 120, 120, (c, w) => {
      const g = c.createRadialGradient(46, 44, 6, 60, 60, 56); g.addColorStop(0, '#e8ff7a'); g.addColorStop(0.45, '#9fcc1e'); g.addColorStop(1, '#3f5a08');
      c.fillStyle = g; c.beginPath();
      for (let i = 0; i <= 24; i++) { const a = i / 24 * Math.PI * 2, r = 48 + 6 * Math.sin(i * 2.7) + 4 * Math.cos(i * 5.1); c.lineTo(60 + Math.cos(a) * r, 60 + Math.sin(a) * r); }
      c.closePath(); c.fill(); c.strokeStyle = '#25330a'; c.lineWidth = 4; c.stroke();
      c.fillStyle = 'rgba(60,40,20,.7)'; for (const [x, y, r] of [[42, 70, 7], [70, 40, 5], [78, 74, 9], [52, 46, 4]]) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
      c.fillStyle = '#b8e02a'; for (const x of [40, 64, 84]) { c.beginPath(); c.ellipse(x, 104 + (x % 3) * 4, 5, 10, 0, 0, 7); c.fill(); }
    });
    this.canvasTex('mouldNet', 260, 260, (c, w) => {
      c.strokeStyle = '#c4e534'; c.lineWidth = 6; c.lineCap = 'round';
      const cx = w / 2, cy = w / 2;
      for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(a) * 120, cy + Math.sin(a) * 120); c.stroke(); }
      for (const r of [32, 62, 92, 118]) { c.beginPath(); for (let i = 0; i <= 9; i++) { const a = i / 9 * Math.PI * 2; c.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } c.stroke(); }
      c.fillStyle = '#9fcc1e'; for (let i = 0; i < 14; i++) { const a = i * 0.9, r = 30 + (i * 23) % 90; c.beginPath(); c.ellipse(cx + Math.cos(a) * r, cy + Math.sin(a) * r + 8, 5, 11, 0, 0, 7); c.fill(); }
    });
    this.canvasTex('shroom', 140, 200, (c, w, h) => {
      c.fillStyle = '#efe6cf'; c.strokeStyle = '#3a2214'; c.lineWidth = 5;
      c.beginPath(); c.moveTo(52, h); c.quadraticCurveTo(46, 110, 58, 70); c.lineTo(84, 70); c.quadraticCurveTo(94, 110, 88, h); c.closePath(); c.fill(); c.stroke();
      const g = c.createLinearGradient(0, 0, 0, 80); g.addColorStop(0, '#f05a36'); g.addColorStop(1, '#a8241a');
      c.fillStyle = g; c.beginPath(); c.moveTo(8, 78); c.quadraticCurveTo(20, 6, 70, 6); c.quadraticCurveTo(122, 6, 132, 78); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#fff4dc'; for (const [x, y, r] of [[40, 40, 9], [70, 24, 8], [98, 44, 10], [62, 56, 6], [24, 62, 5], [114, 64, 5]]) { c.beginPath(); c.arc(x, y, r, 0, 7); c.fill(); }
    });
    this.canvasTex('swampBg', 4, 1080, (c, w, h) => {
      const g = c.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#16261c'); g.addColorStop(0.75, '#1f3324'); g.addColorStop(1, '#141f15');
      c.fillStyle = g; c.fillRect(0, 0, w, h);
    });
    this.canvasTex('heart', 96, 88, (c, w, h) => {
      c.fillStyle = '#ee2a8a'; c.strokeStyle = '#2b0b1c'; c.lineWidth = 6;
      c.beginPath(); c.moveTo(w / 2, h - 8); c.bezierCurveTo(-10, h * 0.45, 12, 2, w / 2, 24); c.bezierCurveTo(w - 12, 2, w + 10, h * 0.45, w / 2, h - 8); c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.ellipse(28, 30, 10, 7, -0.6, 0, Math.PI * 2); c.fill();
    });
    this.canvasTex('heartGold', 96, 88, (c, w, h) => {
      c.fillStyle = '#ffc93a'; c.strokeStyle = '#4a3000'; c.lineWidth = 6;
      c.beginPath(); c.moveTo(w / 2, h - 8); c.bezierCurveTo(-10, h * 0.45, 12, 2, w / 2, 24); c.bezierCurveTo(w - 12, 2, w + 10, h * 0.45, w / 2, h - 8); c.fill(); c.stroke();
      c.fillStyle = 'rgba(255,255,255,.45)'; c.beginPath(); c.ellipse(28, 30, 10, 7, -0.6, 0, Math.PI * 2); c.fill();
    });
    // the Evil Overlord's spoon (bowl on the right)
    this.canvasTex('spoon', 200, 64, (c, w, h) => {
      c.lineJoin = 'round'; c.strokeStyle = '#2a2230'; c.lineWidth = 5;
      const g = c.createLinearGradient(0, 14, 0, 50); g.addColorStop(0, '#f4f2f8'); g.addColorStop(0.45, '#a9a4b4'); g.addColorStop(1, '#5d5868');
      c.fillStyle = g;
      c.beginPath(); c.moveTo(8, 27); c.quadraticCurveTo(4, 32, 8, 37); c.lineTo(112, 36); c.lineTo(112, 28); c.closePath(); c.fill(); c.stroke();   // handle
      c.beginPath(); c.ellipse(28, 32, 12, 8, 0, 0, Math.PI * 2); c.fill(); c.stroke();                                                       // handle end
      c.beginPath(); c.ellipse(150, 32, 44, 24, 0, 0, Math.PI * 2); c.fill(); c.stroke();                                                    // bowl
      c.fillStyle = 'rgba(255,255,255,.85)'; c.beginPath(); c.ellipse(140, 22, 16, 6, -0.2, 0, Math.PI * 2); c.fill();
      c.fillStyle = 'rgba(255,120,220,.35)'; c.beginPath(); c.ellipse(160, 40, 18, 7, 0.2, 0, Math.PI * 2); c.fill();
    });
    // the LOSER. flag the tiny bunny plants on the defeated Overlord
    this.canvasTex('loserFlag', 220, 260, (c, w, h) => {
      c.fillStyle = '#6b4a2a'; c.fillRect(14, 0, 12, h); c.strokeStyle = '#2a1a0e'; c.lineWidth = 3; c.strokeRect(14, 0, 12, h);
      c.fillStyle = '#f6efe0'; c.beginPath(); c.moveTo(26, 12); c.lineTo(w - 6, 20); c.lineTo(w - 22, 62); c.lineTo(w - 4, 104); c.lineTo(26, 98); c.closePath(); c.fill(); c.stroke();
      c.fillStyle = '#c4122e'; c.font = 'bold 46px "Lilita One", Impact, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('LOSER.', 112, 60);
    });
    this.canvasTex('flag', 120, 420, (c, w, h) => {
      c.fillStyle = '#d9c9b0'; c.fillRect(10, 0, 12, h);
      c.fillStyle = '#9b4dff'; c.beginPath(); c.moveTo(22, 10); c.lineTo(w, 50); c.lineTo(22, 90); c.fill();
      c.fillStyle = '#c6f135'; c.font = 'bold 30px sans-serif'; c.fillText('✓', 40, 62);
    });
  }
}
