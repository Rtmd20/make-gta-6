// Verde Cay's sound: everything is synthesised with WebAudio — three radio
// stations as step sequencers, an engine hum, a two-tone siren and gunshots.
// No audio files, no network.
import { RADIO } from './config.js';

const SCALES = {
  synthwave: [0, 3, 5, 7, 10, 12, 15],
  island: [0, 2, 4, 7, 9, 12, 14],
  electro: [0, 2, 3, 7, 8, 12, 14],
};

export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.radioGain = null;
    this.station = 0;
    this.step = 0;
    this.nextStepTime = 0;
    this.timer = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.sirenOsc = null;
    this.sirenGain = null;
    this.radioOn = true;
    this.muted = false;
  }

  // Must be called from a user gesture (key press / click) at least once.
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.5;
    this.master.connect(this.ctx.destination);
    this.radioGain = this.ctx.createGain();
    this.radioGain.gain.value = 0.16;
    this.radioGain.connect(this.master);
    // Engine hum
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 55;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;
    const engineFilter = this.ctx.createBiquadFilter();
    engineFilter.type = 'lowpass';
    engineFilter.frequency.value = 420;
    this.engineOsc.connect(engineFilter);
    engineFilter.connect(this.engineGain);
    this.engineGain.connect(this.master);
    this.engineOsc.start();
    // Siren (two-tone)
    this.sirenOsc = this.ctx.createOscillator();
    this.sirenOsc.type = 'triangle';
    this.sirenOsc.frequency.value = 700;
    this.sirenGain = this.ctx.createGain();
    this.sirenGain.gain.value = 0;
    this.sirenOsc.connect(this.sirenGain);
    this.sirenGain.connect(this.master);
    this.sirenOsc.start();
    this.startRadio();
  }

  setEngine(speedKmh, driving) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.engineGain.gain.setTargetAtTime(driving ? 0.05 + speedKmh / 2400 : 0.0, t, 0.1);
    this.engineOsc.frequency.setTargetAtTime(52 + speedKmh * 0.9, t, 0.08);
  }

  setSiren(on) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.sirenGain.gain.setTargetAtTime(on ? 0.045 : 0, t, 0.2);
    if (on) this.sirenOsc.frequency.setTargetAtTime(660 + 160 * Math.sin(t * 2.4), t, 0.05);
  }

  gunshot() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const dur = 0.16;
    const buf = this.ctx.createBuffer(1, this.ctx.sampleRate * dur, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 900;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.5, t);
    gain.gain.exponentialRampToValueAtTime(0.01, t + dur);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    src.start(t);
  }

  cash() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    [880, 1174, 1568].forEach((f, i) => {
      const o = this.ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(0.0001, t + i * 0.07);
      g.gain.exponentialRampToValueAtTime(0.14, t + i * 0.07 + 0.02);
      g.gain.exponentialRampToValueAtTime(0.001, t + i * 0.07 + 0.28);
      o.connect(g);
      g.connect(this.master);
      o.start(t + i * 0.07);
      o.stop(t + i * 0.07 + 0.3);
    });
  }

  nextStation() {
    this.station = (this.station + 1) % RADIO.length;
    this.step = 0;
  }

  currentStation() {
    return RADIO[this.station];
  }

  startRadio() {
    if (this.timer) return;
    this.nextStepTime = this.ctx.currentTime + 0.1;
    this.timer = setInterval(() => this.scheduleRadio(), 90);
  }

  scheduleRadio() {
    if (!this.ctx || !this.radioOn) return;
    const st = RADIO[this.station];
    const stepDur = 60 / st.bpm / 2; // eighth notes
    while (this.nextStepTime < this.ctx.currentTime + 0.25) {
      this.playStep(st, this.step, this.nextStepTime, stepDur);
      this.nextStepTime += stepDur;
      this.step = (this.step + 1) % 32;
    }
  }

  note(freq, time, dur, type, vol) {
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, time);
    g.gain.exponentialRampToValueAtTime(vol, time + 0.02);
    g.gain.exponentialRampToValueAtTime(0.001, time + dur);
    o.connect(g);
    g.connect(this.radioGain);
    o.start(time);
    o.stop(time + dur + 0.05);
  }

  playStep(st, step, time, stepDur) {
    const scale = SCALES[st.style];
    const root = st.root;
    const deg = (n) => root * Math.pow(2, scale[n % scale.length] / 12 + Math.floor(n / scale.length));
    // Bass on beats
    if (step % 4 === 0) this.note(deg([0, 0, 5, 3][Math.floor(step / 8) % 4]) / 2, time, stepDur * 3.2, 'triangle', 0.5);
    // Chords on the off-beat
    if (step % 8 === 4) {
      this.note(deg(2) * 2, time, stepDur * 2, 'sawtooth', 0.05);
      this.note(deg(4) * 2, time, stepDur * 2, 'sawtooth', 0.05);
    }
    // Lead arpeggio
    const arp = [0, 2, 4, 6, 4, 2, 5, 3];
    if (step % 2 === 0) {
      const n = arp[(step / 2) % arp.length] + (st.style === 'electro' ? 7 : 0);
      this.note(deg(n) * 2, time, stepDur * 0.9, 'square', 0.045);
    }
    // Hat tick
    if (step % 2 === 1) this.note(6000, time, 0.03, 'square', 0.012);
  }
}
