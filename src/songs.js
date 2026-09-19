// Songs and note charts are generated procedurally (pentatonic scales always
// sound consonant, whatever the pattern) so there's no need for licensed audio
// files. Each song uses a fixed seed, so the chart is identical every playthrough.

function mulberry32(seed) {
  let a = seed;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function noteToFreq(note) {
  const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const match = note.match(/^([A-G]#?)(\d)$/);
  const [, name, octaveStr] = match;
  const midi = (parseInt(octaveStr, 10) + 1) * 12 + noteNames.indexOf(name);
  return 440 * Math.pow(2, (midi - 69) / 12);
}

function pentatonicScale(rootNote, minorMode) {
  const rootFreq = noteToFreq(rootNote);
  const steps = minorMode ? [0, 3, 5, 7, 10] : [0, 2, 4, 7, 9];
  const freqs = [];
  [0, 12].forEach((oct) => steps.forEach((s) => freqs.push(rootFreq * Math.pow(2, (s + oct) / 12))));
  return freqs;
}

const SUBDIVISIONS = [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5];

function generateSong({ id, title, bpm, difficulty, bars, scale, seed, waveform, density }) {
  const rng = mulberry32(seed);
  const notes = [];
  const melody = [];
  let lastLane = -1;

  for (let bar = 0; bar < bars; bar++) {
    SUBDIVISIONS.forEach((offset) => {
      const beat = bar * 4 + offset;

      if (rng() < 0.85) {
        const degree = Math.floor(rng() * scale.length);
        melody.push({
          beat,
          freq: scale[degree],
          durationBeats: offset % 1 === 0 ? 0.9 : 0.4,
        });
      }

      if (rng() < density) {
        let lane = Math.floor(rng() * 4);
        if (lane === lastLane && rng() < 0.5) lane = (lane + 1) % 4;
        lastLane = lane;
        notes.push({ beat, lane });
      }
    });
  }

  return { id, title, bpm, difficulty, bars, notes, melody, waveform };
}

export const SONGS = [
  generateSong({
    id: 'paws-effect',
    title: 'Paws & Effect',
    bpm: 120,
    difficulty: 'Easy',
    bars: 24,
    scale: pentatonicScale('C4', false),
    seed: 1,
    waveform: 'square',
    density: 0.45,
  }),
  generateSong({
    id: 'midnight-meowls',
    title: 'Midnight Meowls',
    bpm: 96,
    difficulty: 'Normal',
    bars: 24,
    scale: pentatonicScale('A3', true),
    seed: 2,
    waveform: 'triangle',
    density: 0.62,
  }),
  generateSong({
    id: 'turbo-tuna-rush',
    title: 'Turbo Tuna Rush',
    bpm: 150,
    difficulty: 'Hard',
    bars: 28,
    scale: pentatonicScale('D4', false),
    seed: 3,
    waveform: 'sawtooth',
    density: 0.78,
  }),
];
