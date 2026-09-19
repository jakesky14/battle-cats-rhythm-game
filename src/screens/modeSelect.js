import { showScreen } from '../router.js';
import { state } from '../state.js';
import { topBar } from '../ui.js';
import { renderMenu } from './menu.js';
import { renderSongSelect } from './songSelect.js';

const MODES = [
  { id: 'cpu', label: '🤖 Vs CPU', desc: 'Arrow keys. Battle an auto-playing CPU — miss too much and you lose the beat!' },
  { id: 'twoPlayer', label: '🎮 2 Player', desc: 'P1 uses Arrow keys, P2 uses WASD. Race for the highest score on the same song.' },
  { id: 'practice', label: '🎯 Practice', desc: 'Arrow keys, no fail state, no rewards — just you and the notes.' },
];

export function renderModeSelect(container) {
  container.appendChild(topBar(state.catFood, { onBack: () => showScreen(renderMenu) }));
  const wrap = document.createElement('div');
  wrap.className = 'screen mode-select-screen';
  wrap.innerHTML = `<h2>Choose a Mode</h2><div class="mode-list"></div>`;
  container.appendChild(wrap);

  const list = wrap.querySelector('.mode-list');
  MODES.forEach((m) => {
    const card = document.createElement('button');
    card.className = 'mode-card';
    card.innerHTML = `<div class="mode-label">${m.label}</div><div class="mode-desc">${m.desc}</div>`;
    card.onclick = () => showScreen(renderSongSelect, m.id);
    list.appendChild(card);
  });
}
