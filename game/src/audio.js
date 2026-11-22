// Verde Cay — synthesised sound. No audio files: the three radio stations are
// sequenced note patterns played through WebAudio oscillators, plus an engine
// hum, a two-tone police siren and a gunshot crack.
import { RADIO } from './config.js';

let ctx = null;
let master = null;
let stationIndex = 0;
let radioTimer = null;
let noteStep = 0;
let engineOsc = null;
let engineGain = null;
let sirenOsc = null;
let sirenGain = null;
let muted = false;

export function initAudio() {
  if (ctx) return;
  try {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = 0.5;
    master.connect(ctx.destination);
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 60;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0.0;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 420;
    engineOsc.connect(lp); lp.connect(engineGain); engineGain.connect(master);
    engineOsc.start();
    sirenOsc = ctx.createOscillator();
    sirenOsc.type = 'triangle';
    sirenOsc.frequency.value = 700;
    sirenGain = ctx.createGain();
    sirenGain.gain.value = 0.0;
    sirenOsc.connect(sirenGain); sirenGain.connect(master);
    sirenOsc.start();
    startRadio();
  } catch (err) {
    ctx = null;
  }
}

function noteFreq(root, semis) { return root * Math.pow(2, semis / 12); }

function playNote(freq, when, dur, type = 'square', vol = 0.12) {
  if (!ctx) return;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0, when);
  g.gain.linearRampToValueAtTime(vol, when + 0.02);
  g.gain.exponentialRampToValueAtTime(0.001, when + dur);
  o.connect(g); g.connect(master);
  o.start(when); o.stop(when + dur + 0.05);
}

function radioTick() {
  if (!ctx || muted) return;
  const st = RADIO[stationIndex];
  const beat = 60 / st.bpm;
  const now = ctx.currentTime + 0.05;
  // Bass on the beat, a lead note every other beat, a sparkle on the off-beat.
  const scale = st.scale;
  const bassNote = scale[noteStep % scale.length];
  playNote(noteFreq(st.root / 2, bassNote), now, beat * 0.9, 'triangle', 0.16);
  if (noteStep % 2 === 0) {
    const lead = scale[(noteStep * 2 + 1) % scale.length] + 12;
    playNote(noteFreq(st.root, lead), now, beat * 0.8, 'square', 0.07);
  }
  if (noteStep % 4 === 3) playNote(noteFreq(st.root, 24), now, beat * 0.4, 'sine', 0.05);
  noteStep++;
}

export function startRadio() {
  if (!ctx || radioTimer) return;
  radioTimer = window.setInterval(radioTick, (60 / RADIO[stationIndex].bpm) * 1000);
}

export function nextStation() {
  stationIndex = (stationIndex + 1) % RADIO.length;
  noteStep = 0;
  if (radioTimer) { window.clearInterval(radioTimer); radioTimer = null; }
  startRadio();
  return RADIO[stationIndex].name;
}

export function currentStation() { return RADIO[stationIndex].name; }

export function setEngine(speed01, running) {
  if (!ctx) return;
  const target = running ? 0.05 + speed01 * 0.06 : 0.0;
  engineGain.gain.setTargetAtTime(target, ctx.currentTime, 0.1);
  engineOsc.frequency.setTargetAtTime(55 + speed01 * 130, ctx.currentTime, 0.1);
}

export function setSiren(on) {
  if (!ctx) return;
  sirenGain.gain.setTargetAtTime(on ? 0.045 : 0.0, ctx.currentTime, 0.2);
  if (on) {
    const now = ctx.currentTime;
    sirenOsc.frequency.cancelScheduledValues(now);
    sirenOsc.frequency.setValueAtTime(660, now);
    sirenOsc.frequency.linearRampToValueAtTime(880, now + 0.45);
    sirenOsc.frequency.linearRampToValueAtTime(660, now + 0.9);
  }
}

export function playShot() {
  if (!ctx) return;
  const now = ctx.currentTime;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = 'square';
  o.frequency.setValueAtTime(180, now);
  o.frequency.exponentialRampToValueAtTime(50, now + 0.12);
  g.gain.setValueAtTime(0.25, now);
  g.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
  o.connect(g); g.connect(master);
  o.start(now); o.stop(now + 0.16);
  // Noise crack.
  const len = Math.floor(ctx.sampleRate * 0.08);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const ng = ctx.createGain();
  ng.gain.value = 0.3;
  src.connect(ng); ng.connect(master);
  src.start(now);
}

export function playChime() {
  if (!ctx) return;
  const now = ctx.currentTime;
  playNote(660, now, 0.18, 'sine', 0.14);
  playNote(880, now + 0.14, 0.3, 'sine', 0.14);
}

export function toggleMute() {
  muted = !muted;
  if (master) master.gain.value = muted ? 0 : 0.5;
  return muted;
}
