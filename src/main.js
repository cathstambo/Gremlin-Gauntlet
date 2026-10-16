// Gremlin Gauntlet: game entry point.
// Landscape 16:9 logical play area (1920×1080) scaled to fit any screen.
import { Menu } from './scenes/Menu.js?v=20261016133224';
import { Boot } from './scenes/Boot.js?v=20261016133224';
import { Run } from './scenes/Run.js?v=20261016133224';
import { UI } from './scenes/UI.js?v=20261016133224';
import { Boss } from './scenes/Boss.js?v=20261016133224';
import { Overlord } from './scenes/Overlord.js?v=20261016133224';
import { Cartel } from './scenes/Cartel.js?v=20261016133224';

window.game = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#13201c',
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: 1920, height: 1080 },
  render: { antialias: true, powerPreference: 'high-performance' },
  input: { activePointers: 4 },
  fps: { target: 60 },
  scene: [Boot, Menu, Run, Boss, Overlord, Cartel, UI],
});
