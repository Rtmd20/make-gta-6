// All sound is synthesised with WebAudio — no audio files, nothing downloaded.
// Engine hum, police sirens, gunshots, splashes and three little radio stations
// that play looping oscillator melodies over a bass line.
import { RADIO } from './config.js';

const NOTE = { C: 261.63, D: 293.66, E: 329.63, F: 349.23, G: 392.0, A: 440.0, B: 493.88, c: 523.25, d: 587.33, e: 659.25, g: 783.99 };
const TUNES = [
  { bass: ['C', 'G', 'A', 'F'], lead: ['E', 'G', 'c', 'G', 'A', 'c', 'd', 'e'] },
  { bass: ['A', 'F', 'C', 'G'], lead: ['A', 'c', 'E', 'G', 'A', 'G', 'E', 'C'] },
  { bass: ['D', 'B', 'G', 'A'], lead: ['D', 'F', 'A', 'd', 'c', 'A', 'G', 'E'] },
];

export function createAudio() {
  let context = null;
  let master = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let radioTimer = null;
  let radioStep = 0;
  let station = 0;
  let enabled = true;
  let muted = false;

  function ensure() {
    if (context) return true;
    try {
      const Ctor = window.AudioContext || window.webkitAudioContext;
      if (!Ctor) return false;
      context = new Ctor();
      master = context.createGain();
      master.gain.value = 0.5;
      master.connect(context.destination);
      engineOsc = context.createOscillator();
      engineOsc.type = 'sawtooth';
      engineOsc.frequency.value = 60;
      engineGain = context.createGain();
      engineGain.gain.value = 0;
      engineOsc.connect(engineGain).connect(master);
      engineOsc.start();
      sirenOsc = context.createOscillator();
      sirenOsc.type = 'sine';
      sirenOsc.frequency.value = 700;
      sirenGain = context.createGain();
      sirenGain.gain.value = 0;
      sirenOsc.connect(sirenGain).connect(master);
      sirenOsc.start();
    } catch {
      return false;
    }
    return true;
  }
  function unlock() { if (ensure() && context.state === 'suspended') context.resume(); }
  function beep(freq, seconds, type, volume) {
    if (!ensure() || muted) return;
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.type = type || 'square';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(volume || 0.15, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + seconds);
    osc.connect(gain).connect(master);
    osc.start();
    osc.stop(context.currentTime + seconds);
  }
  function shot() { beep(180, 0.12, 'square', 0.25); beep(90, 0.18, 'sawtooth', 0.2); }
  function crash() { beep(70, 0.3, 'sawtooth', 0.3); }
  function splash() { beep(300, 0.4, 'sine', 0.2); beep(180, 0.5, 'sine', 0.15); }
  function pickup() { beep(660, 0.1, 'sine', 0.2); setTimeout(() => beep(880, 0.15, 'sine', 0.2), 90); }
  function missionDone() { [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.25, 'sine', 0.22), i * 120)); }
  function setEngine(speed01, onBoat) {
    if (!context) return;
    engineGain.gain.value = muted ? 0 : 0.04 + speed01 * 0.06;
    engineOsc.frequency.value = (onBoat ? 50 : 55) + speed01 * (onBoat ? 90 : 140);
  }
  function setSiren(on, time) {
    if (!context) return;
    sirenGain.gain.value = on && !muted ? 0.05 : 0;
    if (on) sirenOsc.frequency.value = 650 + Math.sin(time * 4) * 250;
  }
  function startRadio() {
    if (radioTimer || !ensure()) return;
    radioTimer = setInterval(() => {
      if (muted || !enabled) return;
      const tune = TUNES[station];
      const bass = NOTE[tune.bass[Math.floor(radioStep / 2) % tune.bass.length]];
      const lead = NOTE[tune.lead[radioStep % tune.lead.length]];
      beep(bass / 2, 0.45, 'triangle', 0.08);
      if (radioStep % 2 === 0) beep(lead, 0.4, 'sine', 0.07);
      radioStep += 1;
    }, 240);
  }
  function nextStation() {
    station = (station + 1) % RADIO.length;
    radioStep = 0;
    return station;
  }
  function currentStation() { return RADIO[station]; }
  function toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.5; return muted; }
  return { unlock, shot, crash, splash, pickup, missionDone, setEngine, setSiren, startRadio, nextStation, currentStation, toggleMute, ensure };
}
