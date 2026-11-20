// A small seeded random generator, so a shot with &seed=N always plays the same way.
// Mulberry32: short, fast, and good enough for traffic, pedestrians and spawn jitter.
export function createRandom(seed) {
  let state = (seed >>> 0) || 0x9e3779b9;
  function next() {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }
  function range(min, max) { return min + next() * (max - min); }
  function pick(list) { return list[Math.floor(next() * list.length)]; }
  function chance(p) { return next() < p; }
  return { next, range, pick, chance };
}
