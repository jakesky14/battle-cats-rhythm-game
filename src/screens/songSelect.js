import { showScreen } from '../router.js';
import { state } from '../state.js';
import { topBar } from '../ui.js';
import { SONGS } from '../songs.js';
import { renderModeSelect } from './modeSelect.js';
import { renderGameplay } from './gameplay.js';

export function renderSongSelect(container, mode = 'cpu') {
  container.appendChild(topBar(state.catFood, { onBack: () => showScreen(renderModeSelect) }));
  const wrap = document.createElement('div');
  wrap.className = 'screen song-select-screen';
  wrap.innerHTML = `<h2>Choose a Song</h2><div class="song-list"></div>`;
  container.appendChild(wrap);

  const list = wrap.querySelector('.song-list');
  SONGS.forEach((song) => {
    const best = state.highScores[song.id];
    const card = document.createElement('button');
    card.className = 'song-card diff-' + song.difficulty.toLowerCase();
    card.innerHTML = `
      <div class="song-title">${song.title}</div>
      <div class="song-meta">${song.difficulty} · ${song.bpm} BPM · ${song.notes.length} notes</div>
      <div class="song-best">${best ? `Best: ${best.grade} (${best.score})` : 'Not played yet'}</div>
    `;
    card.onclick = () => showScreen(renderGameplay, song, mode);
    list.appendChild(card);
  });
}
