// One lane highway's worth of gameplay state — used for the player, a CPU
// opponent (auto-judged), or either human in 2-player mode. Keeping this in
// one class lets gameplay.js run 1-3 of them side by side without duplicating logic.
export const JUDGEMENT_SCORE = { perfect: 300, good: 150, ok: 50, miss: 0 };
export const PERFECT_WINDOW = 0.06;
export const GOOD_WINDOW = 0.12;
export const OK_WINDOW = 0.18; // beyond this, a note counts as missed

export class NoteTrack {
  constructor(song, { isAuto = false } = {}) {
    const secPerBeat = 60 / song.bpm;
    this.notes = song.notes.map((n) => ({ lane: n.lane, time: n.beat * secPerBeat, judged: false, result: null }));
    this.totalNotes = this.notes.length;
    this.isAuto = isAuto;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.perfect = 0;
    this.good = 0;
    this.ok = 0;
    this.miss = 0;
    this.lastJudgement = null; // { result, delta }
  }

  judge(note, delta) {
    note.judged = true;
    const absDelta = Math.abs(delta);
    let result;
    if (absDelta <= PERFECT_WINDOW) result = 'perfect';
    else if (absDelta <= GOOD_WINDOW) result = 'good';
    else if (absDelta <= OK_WINDOW) result = 'ok';
    else result = 'miss';

    note.result = result;
    this.score += JUDGEMENT_SCORE[result];
    if (result === 'miss') {
      this.combo = 0;
      this.miss++;
    } else {
      this.combo++;
      this[result]++;
    }
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.lastJudgement = { result, delta };
    return result;
  }

  // Player input: find the closest unjudged note in this lane within the OK window.
  hit(lane, now) {
    if (this.isAuto) return null;
    let candidate = null;
    let bestDelta = Infinity;
    for (const n of this.notes) {
      if (n.judged || n.lane !== lane) continue;
      const delta = now - n.time;
      if (Math.abs(delta) <= OK_WINDOW && Math.abs(delta) < bestDelta) {
        candidate = n;
        bestDelta = Math.abs(delta);
      }
    }
    if (candidate) return this.judge(candidate, now - candidate.time);
    return null;
  }

  // Called every frame: auto-hits notes on schedule (CPU) or auto-misses notes
  // the player let pass. Returns the list of results judged this tick.
  update(now) {
    const results = [];
    this.notes.forEach((n) => {
      if (n.judged) return;
      if (this.isAuto) {
        if (now >= n.time) results.push(this.judge(n, 0));
      } else if (now - n.time > OK_WINDOW) {
        results.push(this.judge(n, now - n.time));
      }
    });
    return results;
  }

  get accuracy() {
    const maxScore = this.totalNotes * 300;
    return maxScore > 0 ? this.score / maxScore : 0;
  }

  get fullCombo() {
    return this.miss === 0 && this.ok === 0 && this.totalNotes > 0;
  }

  get lastNoteTime() {
    return this.notes.reduce((m, n) => Math.max(m, n.time), 0);
  }
}

const METER_MAGNITUDE = { perfect: 8, good: 4, ok: 1, miss: 6 };

// Shifts a 0-100 "battle meter" toward whichever side just landed a hit (or
// away from a side that just missed). side is 'left' or 'right'. weight scales
// the effect (used to soften/harden how hard the CPU pushes back).
export function applyMeterShift(meter, result, side, weight = 1) {
  const magnitude = (METER_MAGNITUDE[result] ?? 0) * weight;
  const direction = result === 'miss' ? -1 : 1;
  const sideSign = side === 'right' ? 1 : -1;
  return Math.max(0, Math.min(100, meter + sideSign * direction * magnitude));
}
