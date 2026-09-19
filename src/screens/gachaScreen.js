import { showScreen } from '../router.js';
import { state, addCatFood, ownCharacter } from '../state.js';
import { topBar } from '../ui.js';
import { pullOne, pullMany, SINGLE_COST, MULTI_COST, MULTI_COUNT } from '../gacha.js';
import { RARITIES } from '../characters.js';
import { renderMenu } from './menu.js';

export function renderGacha(container) {
  container.appendChild(topBar(state.catFood, { onBack: () => showScreen(renderMenu) }));
  const wrap = document.createElement('div');
  wrap.className = 'screen gacha-screen';
  wrap.innerHTML = `
    <h2>🎰 Cat Capsule Machine</h2>
    <div class="gacha-machine">🎁</div>
    <div class="rates">
      ${Object.values(RARITIES).map((r) => `<span style="color:${r.color}">${r.label} ${r.weight}%</span>`).join(' · ')}
    </div>
    <div class="gacha-buttons">
      <button id="pull1" class="big-btn">Pull x1 (🍗${SINGLE_COST})</button>
      <button id="pull11" class="big-btn">Pull x${MULTI_COUNT} (🍗${MULTI_COST})</button>
    </div>
    <div class="pull-results" id="pull-results"></div>
  `;
  container.appendChild(wrap);

  const resultsEl = wrap.querySelector('#pull-results');
  const foodValueEl = () => container.querySelector('.food-counter span');
  const syncFoodDisplay = () => {
    const el = foodValueEl();
    if (el) el.textContent = state.catFood;
  };

  function doPull(count, cost) {
    if (state.catFood < cost) {
      resultsEl.innerHTML = `<div class="not-enough">Not enough Cat Food!</div>`;
      return;
    }
    addCatFood(-cost);
    syncFoodDisplay();

    const pulls = count === 1 ? [pullOne()] : pullMany(count);
    resultsEl.innerHTML = '';
    pulls.forEach((char, i) => {
      const alreadyOwned = (state.owned[char.id] || 0) > 0;
      ownCharacter(char.id);
      if (alreadyOwned) addCatFood(char.dupeValue);

      const card = document.createElement('div');
      card.className = 'pull-card rarity-' + char.rarity;
      card.style.animationDelay = i * 0.08 + 's';
      card.innerHTML = `
        <div class="pull-emoji">${char.emoji}</div>
        <div class="pull-name">${char.name}</div>
        <div class="pull-rarity">${RARITIES[char.rarity].label}</div>
        ${alreadyOwned ? `<div class="dupe-note">Dupe! +${char.dupeValue}🍗</div>` : '<div class="dupe-note new">NEW!</div>'}
      `;
      resultsEl.appendChild(card);
    });
    syncFoodDisplay();
  }

  wrap.querySelector('#pull1').onclick = () => doPull(1, SINGLE_COST);
  wrap.querySelector('#pull11').onclick = () => doPull(MULTI_COUNT, MULTI_COST);
}
