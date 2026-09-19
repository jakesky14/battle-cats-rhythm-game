export function computeGrade(accuracy) {
  if (accuracy >= 0.97) return 'SSS';
  if (accuracy >= 0.93) return 'SS';
  if (accuracy >= 0.87) return 'S';
  if (accuracy >= 0.78) return 'A';
  if (accuracy >= 0.65) return 'B';
  return 'C';
}

const GRADE_BONUS = { SSS: 80, SS: 50, S: 30, A: 15, B: 5, C: 0 };
const DIFFICULTY_MULT = { Easy: 1, Normal: 1.2, Hard: 1.5 };

export function computeCatFoodReward({ accuracy, fullCombo, difficulty }) {
  const diffMult = DIFFICULTY_MULT[difficulty] || 1;
  let reward = Math.round(60 * accuracy * diffMult);
  reward += GRADE_BONUS[computeGrade(accuracy)];
  if (fullCombo) reward += 40;
  return Math.max(10, reward);
}
