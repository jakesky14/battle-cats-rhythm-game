const STORAGE_KEY = 'bcrg-save-v1';

function defaultState() {
  return {
    catFood: 500,
    owned: {}, // characterId -> count
    equippedId: null,
    highScores: {}, // songId -> { score, grade, accuracy }
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    return { ...defaultState(), ...JSON.parse(raw) };
  } catch {
    return defaultState();
  }
}

export const state = loadState();

export function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // storage unavailable (private browsing, quota) — game still works, just won't save
  }
}

export function addCatFood(amount) {
  state.catFood = Math.max(0, state.catFood + amount);
  persist();
}

export function ownCharacter(id) {
  state.owned[id] = (state.owned[id] || 0) + 1;
  persist();
  return state.owned[id];
}

export function setEquipped(id) {
  state.equippedId = id;
  persist();
}

export function setHighScore(songId, result) {
  const prev = state.highScores[songId];
  if (!prev || result.score > prev.score) {
    state.highScores[songId] = result;
    persist();
    return true;
  }
  return false;
}
