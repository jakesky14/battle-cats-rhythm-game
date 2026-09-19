import { showScreen } from '../router.js';
import { state, addCatFood, setHighScore } from '../state.js';
import { topBar } from '../ui.js';
import { computeGrade, computeCatFoodReward } from '../scoring.js';
import { getEquippedMultiplier, getCharacter } from '../characters.js';
import { renderSongSelect } from './songSelect.js';
import { renderMenu } from './menu.js';
import { renderGameplay } from './gameplay.js';

export function renderResults(container, song, mode, payload) {
  const { failed, tracksData } = payload;
  container.appendChild(topBar(state.catFood));
  const wrap = document.createElement('div');
  wrap.className = 'screen results-screen';

  if (mode === 'cpu') {
    renderCpuResults(wrap, song, failed, tracksData);
  } else if (mode === 'twoPlayer') {
    renderTwoPlayerResults(wrap, song, tracksData);
  } else {
    renderPracticeResults(wrap, song, tracksData);
  }

  container.appendChild(wrap);
  wrap.querySelector('#retry-btn')?.addEventListener('click', () => showScreen(renderGameplay, song, mode));
  wrap.querySelector('#songs-btn')?.addEventListener('click', () => showScreen(renderSongSelect, mode));
  wrap.querySelector('#menu-btn')?.addEventListener('click', () => showScreen(renderMenu));
}

function statsBlock(t) {
  const grade = computeGrade(t.accuracy);
  return `
    <div class="grade grade-${grade}">${grade}</div>
    <div class="result-stats">
      <div>Score: <strong>${t.score}</strong></div>
      <div>Accuracy: <strong>${(t.accuracy * 100).toFixed(1)}%</strong></div>
      <div>Max Combo: <strong>${t.maxCombo}</strong>${t.fullCombo ? ' 🌟 FULL COMBO' : ''}</div>
      <div class="breakdown">Perfect ${t.perfect} · Good ${t.good} · Ok ${t.ok} · Miss ${t.miss}</div>
    </div>
  `;
}

function resultButtons() {
  return `
    <div class="result-buttons">
      <button id="retry-btn" class="big-btn">Retry</button>
      <button id="songs-btn" class="big-btn">Songs</button>
      <button id="menu-btn" class="big-btn">Menu</button>
    </div>
  `;
}

function renderCpuResults(wrap, song, failed, tracksData) {
  const playerTrack = tracksData.find((t) => !t.isAuto);

  if (failed) {
    wrap.innerHTML = `
      <h2>${song.title}</h2>
      <div class="fail-banner">💔 You lost the beat!</div>
      ${statsBlock(playerTrack)}
      ${resultButtons()}
    `;
    return;
  }

  const multiplier = getEquippedMultiplier(state);
  const equipped = state.equippedId ? getCharacter(state.equippedId) : null;
  const finalScore = Math.round(playerTrack.score * multiplier);
  const grade = computeGrade(playerTrack.accuracy);
  const catFoodEarned = Math.round(
    computeCatFoodReward({ accuracy: playerTrack.accuracy, fullCombo: playerTrack.fullCombo, difficulty: song.difficulty }) * multiplier
  );

  addCatFood(catFoodEarned);
  const isNewBest = setHighScore(song.id, { score: finalScore, grade, accuracy: playerTrack.accuracy });

  wrap.innerHTML = `
    <h2>${song.title}</h2>
    <div class="grade grade-${grade}">${grade}</div>
    ${isNewBest ? '<div class="new-best">New Best!</div>' : ''}
    <div class="result-stats">
      <div>Score: <strong>${finalScore}</strong>${multiplier > 1 ? ` <span class="mult-tag">x${multiplier.toFixed(2)}</span>` : ''}</div>
      <div>Accuracy: <strong>${(playerTrack.accuracy * 100).toFixed(1)}%</strong></div>
      <div>Max Combo: <strong>${playerTrack.maxCombo}</strong>${playerTrack.fullCombo ? ' 🌟 FULL COMBO' : ''}</div>
      <div class="breakdown">Perfect ${playerTrack.perfect} · Good ${playerTrack.good} · Ok ${playerTrack.ok} · Miss ${playerTrack.miss}</div>
    </div>
    ${equipped ? `<div class="equipped-tag">${equipped.emoji} ${equipped.name} boosted your rewards!</div>` : ''}
    <div class="reward">🍗 +${catFoodEarned} Cat Food</div>
    ${resultButtons()}
  `;
}

function renderTwoPlayerResults(wrap, song, tracksData) {
  const p1 = tracksData.find((t) => t.hudKey === 'left');
  const p2 = tracksData.find((t) => t.hudKey === 'right');
  let winnerText;
  if (p1.score === p2.score) winnerText = "It's a draw!";
  else winnerText = (p1.score > p2.score ? p1.label : p2.label) + ' wins!';

  wrap.innerHTML = `
    <h2>${song.title}</h2>
    <div class="winner-banner">🏆 ${winnerText}</div>
    <div class="two-player-results">
      <div class="player-result"><h3>${p1.label}</h3>${statsBlock(p1)}</div>
      <div class="player-result"><h3>${p2.label}</h3>${statsBlock(p2)}</div>
    </div>
    ${resultButtons()}
  `;
}

function renderPracticeResults(wrap, song, tracksData) {
  const t = tracksData[0];
  wrap.innerHTML = `
    <h2>${song.title} <span class="practice-tag">Practice</span></h2>
    ${statsBlock(t)}
    <div class="practice-note">Practice runs don't earn Cat Food or count toward high scores.</div>
    ${resultButtons()}
  `;
}
