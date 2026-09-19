import { RARITIES, charactersByRarity } from './characters.js';

const TOTAL_WEIGHT = Object.values(RARITIES).reduce((sum, r) => sum + r.weight, 0);

function rollRarity() {
  let roll = Math.random() * TOTAL_WEIGHT;
  for (const [key, r] of Object.entries(RARITIES)) {
    if (roll < r.weight) return key;
    roll -= r.weight;
  }
  return 'common';
}

export function pullOne() {
  const rarity = rollRarity();
  const pool = charactersByRarity(rarity);
  return pool[Math.floor(Math.random() * pool.length)];
}

export function pullMany(n) {
  return Array.from({ length: n }, pullOne);
}

export const SINGLE_COST = 100;
export const MULTI_COUNT = 11;
export const MULTI_COST = 900; // 11 pulls for the price of 9
