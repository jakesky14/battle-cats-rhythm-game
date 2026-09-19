// Original characters in a Battle Cats-inspired style (own names/art, not official assets).
export const RARITIES = {
  common: { label: 'Common', color: '#8d9aa5', weight: 55, scoreMultiplier: 1.0 },
  rare: { label: 'Rare', color: '#3fa7ff', weight: 30, scoreMultiplier: 1.05 },
  superRare: { label: 'Super Rare', color: '#b862ff', weight: 12, scoreMultiplier: 1.1 },
  uberRare: { label: 'Uber Rare', color: '#ffb02e', weight: 3, scoreMultiplier: 1.2 },
};

export const CHARACTERS = [
  { id: 'basic', name: 'Basic Cat', emoji: '🐱', rarity: 'common', flavor: 'Reporting for duty, nyan!', dupeValue: 10 },
  { id: 'tank', name: 'Tank Cat', emoji: '🛡️', rarity: 'common', flavor: 'Slow but sturdy.', dupeValue: 10 },
  { id: 'speedy', name: 'Speedy Cat', emoji: '💨', rarity: 'common', flavor: 'Zoom zoom.', dupeValue: 10 },
  { id: 'farmer', name: 'Farmer Cat', emoji: '🌾', rarity: 'common', flavor: 'Grows the best catnip.', dupeValue: 10 },
  { id: 'ninja', name: 'Ninja Cat', emoji: '🥷', rarity: 'rare', flavor: 'Strikes right on the offbeat.', dupeValue: 30 },
  { id: 'wizard', name: 'Wizard Cat', emoji: '🪄', rarity: 'rare', flavor: 'Casts combo buffs.', dupeValue: 30 },
  { id: 'archer', name: 'Archer Cat', emoji: '🏹', rarity: 'rare', flavor: 'Never misses a beat.', dupeValue: 30 },
  { id: 'dragon', name: 'Dragon Cat', emoji: '🐉', rarity: 'superRare', flavor: 'Roars in perfect rhythm.', dupeValue: 80 },
  { id: 'samurai', name: 'Samurai Cat', emoji: '⚔️', rarity: 'superRare', flavor: 'One note, one cut.', dupeValue: 80 },
  { id: 'cosmic', name: 'Cosmic Cat', emoji: '🌌', rarity: 'uberRare', flavor: 'Conducts the music of the universe.', dupeValue: 200 },
];

export function charactersByRarity(rarity) {
  return CHARACTERS.filter((c) => c.rarity === rarity);
}

export function getCharacter(id) {
  return CHARACTERS.find((c) => c.id === id) || null;
}

export function getEquippedMultiplier(state) {
  const char = state.equippedId ? getCharacter(state.equippedId) : null;
  if (!char) return 1.0;
  return RARITIES[char.rarity].scoreMultiplier;
}
