// Verde Cay's HUD: DOM panels in every corner plus a circular minimap drawn
// on a 2D canvas, and a full-screen city map (M) with the crew and stats.
// The HUD is plain DOM so it stays crisp in screenshots.
import { CITY } from './config.js';
import { roadLines } from './city.js';

const WORLD = { x0: -200, x1: 300, z0: -200, z1: 200 };

function el(tag, cls, parent, text = '') {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text) e.textContent = text;
  if (parent) parent.appendChild(e);
  return e;
}

export class HUD {
  constructor() {
    const hud = document.getElementById('hud');
    this.root = hud;

    // Mission card, top-left
    this.mission = el('div', 'panel mission', hud);
    this.mJob = el('div', 'm-job', this.mission);
    this.mTitle = el('div', 'm-title', this.mission);
    this.mStage = el('div', 'm-stage', this.mission);
    this.mObj = el('div', 'm-obj', this.mission);
    this.mTimer = el('div', 'm-timer', this.mission);

    // Wanted + money + clock, top-right
    this.wanted = el('div', 'panel wanted', hud);
    this.stars = el('div', 'stars', this.wanted);
    this.starEls = [];
    for (let i = 0; i < 5; i++) this.starEls.push(el('span', 'star', this.stars, '☆'));
    this.money = el('div', 'money', this.wanted);
    this.clock = el('div', 'clock', this.wanted);

    // Police dispatch, right
    this.dispatch = el('div', 'panel dispatch', hud);
    el('div', 'd-head', this.dispatch, '◆ VCPD DISPATCH');
    this.dispatchRows = el('div', 'd-rows', this.dispatch);

    // Health / armour / respect + dialogue, bottom-left
    this.bars = el('div', 'panel bars', hud);
    this.barRows = {};
    for (const [key, label] of [['health', 'HEALTH'], ['armour', 'ARMOUR'], ['respect', 'RESPECT']]) {
      const row = el('div', 'bar-row', this.bars);
      el('span', 'bar-label', row, label);
      const track = el('div', 'bar-track', row);
      const fill = el('div', 'bar-fill ' + key, track);
      this.barRows[key] = fill;
    }
    this.dialogue = el('div', 'dialogue', this.bars);

    // Speed + car + weapons + radio, bottom-centre-right
    this.speed = el('div', 'panel speed', hud);
    this.speedNum = el('div', 'speed-num', this.speed);
    this.speedUnit = el('div', 'speed-unit', this.speed);
    this.carName = el('div', 'car-name', this.speed);
    this.condition = el('div', 'condition', this.speed);
    this.weapons = el('div', 'weapons', this.speed);
    this.weaponEls = [];
    for (let i = 0; i < 3; i++) this.weaponEls.push(el('span', 'weapon', this.weapons));
    this.radio = el('div', 'radio', this.speed, '♪ RADIO · WAVE 96.1 — SUNSET FM');

    // Circular minimap, bottom-right
    this.mapWrap = el('div', 'panel minimap', hud);
    this.mapCanvas = el('canvas', '', this.mapWrap);
    this.mapCanvas.width = 220;
    this.mapCanvas.height = 220;
    this.mapCtx = this.mapCanvas.getContext('2d');

    // Contextual prompt, centre-bottom
    this.prompt = el('div', 'prompt', hud);

    // Toast, centre-top
    this.toast = el('div', 'toast', hud);

    // Full map screen (hidden until M)
    this.mapScreen = el('div', 'mapscreen', document.body);
    this.mapScreen.style.display = 'none';
    el('div', 'map-title', this.mapScreen, 'VERDE CAY — CITY MAP');
    const mapBody = el('div', 'map-body', this.mapScreen);
    this.bigMap = el('canvas', 'big-map', mapBody);
    this.bigMap.width = 640;
    this.bigMap.height = 640;
    this.bigCtx = this.bigMap.getContext('2d');
    this.mapStats = el('div', 'map-stats', mapBody);
    this.mapFoot = el('div', 'map-foot', this.mapScreen, 'M / ESC — BACK TO THE STREETS');
  }

  showToast(text, ms = 3200) {
    this.toast.textContent = text;
    this.toast.style.opacity = '1';
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => { this.toast.style.opacity = '0'; }, ms);
  }

  update(s) {
    this.mJob.textContent = `JOB ${s.jobIdx + 1} / 8 · ${s.crew}`;
    this.mTitle.textContent = s.jobTitle;
    this.mStage.textContent = `Stage ${s.stageIdx + 1} of ${s.stageCount}`;
    this.mObj.textContent = s.objective;
    this.mTimer.textContent = s.timer != null ? `◷ ${s.timer}` : '';
    for (let i = 0; i < 5; i++) {
      this.starEls[i].textContent = i < s.wanted ? '★' : '☆';
      this.starEls[i].classList.toggle('lit', i < s.wanted);
    }
    this.money.textContent = '$' + s.money.toLocaleString('en-US');
    this.clock.textContent = s.clock;
    // Dispatch rows
    this.dispatchRows.innerHTML = '';
    if (s.dispatch.length === 0) {
      const row = el('div', 'd-row', this.dispatchRows);
      el('span', '', row, 'VCPD DISPATCH');
      el('span', 'd-tactic quiet', row, 'ALL QUIET');
    } else {
      for (const u of s.dispatch) {
        const row = el('div', 'd-row', this.dispatchRows);
        el('span', '', row, u.unit);
        el('span', 'd-dist', row, `${Math.round(u.dist)}m`);
        el('span', 'd-tactic', row, u.tactic);
      }
    }
    // Bars
    this.barRows.health.style.width = s.health + '%';
    this.barRows.armour.style.width = s.armour + '%';
    this.barRows.respect.style.width = s.respect + '%';
    this.dialogue.textContent = s.dialogue ? `${s.dialogueCrew}: "${s.dialogue}"` : '';
    // Speed
    this.speedNum.textContent = s.inBoat ? Math.round(s.speedKnots) : Math.round(s.speedKmh);
    this.speedUnit.textContent = s.inBoat ? ' knots' : ' km/h';
    this.carName.textContent = s.vehicleName;
    this.condition.textContent = s.vehicleName ? `Condition ${Math.round(s.condition)}%` : '';
    const names = ['FIST', 'PISTOL', 'SMG'];
    this.weaponEls.forEach((wEl, i) => {
      wEl.textContent = `${i + 1}\n${names[i]}`;
      wEl.classList.toggle('active', i === s.weaponIdx);
    });
    this.radio.textContent = `♪ RADIO · ${s.radio}`;
    // Prompt
    this.prompt.textContent = s.prompt || '';
    this.prompt.style.opacity = s.prompt ? '1' : '0';
    // Minimap
    this.drawMinimap(s);
  }

  drawMinimap(s) {
    const g = this.mapCtx;
    const W = 220;
    g.clearRect(0, 0, W, W);
    // Clip to the circle
    g.save();
    g.beginPath();
    g.arc(W / 2, W / 2, W / 2 - 2, 0, Math.PI * 2);
    g.clip();
    const sx = (x) => ((x - WORLD.x0) / (WORLD.x1 - WORLD.x0)) * W;
    const sz = (z) => ((z - WORLD.z0) / (WORLD.z1 - WORLD.z0)) * W;
    // Sea + beach + land
    g.fillStyle = '#0a4a5c';
    g.fillRect(0, 0, W, W);
    g.fillStyle = '#d9b77c';
    g.fillRect(sx(CITY.beachX0), 0, sx(CITY.seaX0) - sx(CITY.beachX0), W);
    g.fillStyle = '#1d3320';
    g.fillRect(0, 0, sx(CITY.beachX0), W);
    // Blocks
    g.fillStyle = '#2c4a2e';
    for (const cx of [-145, -87, -29, 29, 87, 145]) {
      for (const cz of [-145, -87, -29, 29, 87, 145]) {
        g.fillRect(sx(cx - 22), sz(cz - 22), sx(cx + 22) - sx(cx - 22), sz(cz + 22) - sz(cz - 22));
      }
    }
    // Streets
    g.strokeStyle = '#5a5a60';
    g.lineWidth = 3;
    for (const l of roadLines()) {
      g.beginPath(); g.moveTo(sx(l), 0); g.lineTo(sx(l), W); g.stroke();
      g.beginPath(); g.moveTo(0, sz(l)); g.lineTo(W, sz(l)); g.stroke();
    }
    // Boulevard
    g.strokeStyle = '#c9a227';
    g.lineWidth = 2;
    g.beginPath(); g.moveTo(sx(CITY.boulevardX), 0); g.lineTo(sx(CITY.boulevardX), W); g.stroke();
    // Job target marker
    if (s.target) {
      g.fillStyle = '#ffd24a';
      g.save();
      g.translate(sx(s.target.x), sz(s.target.z));
      g.rotate(Math.PI / 4);
      g.fillRect(-5, -5, 10, 10);
      g.restore();
    }
    // Police dots
    g.fillStyle = '#ff3b30';
    for (const p of s.policeDots) {
      g.beginPath();
      g.arc(sx(p.x), sz(p.z), 3.5, 0, Math.PI * 2);
      g.fill();
    }
    // Player arrow (rotates with heading)
    g.save();
    g.translate(sx(s.pos.x), sz(s.pos.z));
    g.rotate(Math.atan2(s.headingX, s.headingZ));
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.moveTo(0, -9);
    g.lineTo(6, 7);
    g.lineTo(-6, 7);
    g.closePath();
    g.fill();
    g.restore();
    // North marker
    g.fillStyle = '#ffffff';
    g.font = 'bold 11px Arial';
    g.textAlign = 'center';
    g.fillText('N', W / 2, 13);
    g.restore();
  }

  showMap(show, s) {
    this.mapScreen.style.display = show ? 'flex' : 'none';
    if (show && s) this.drawMapScreen(s);
  }

  drawMapScreen(s) {
    const g = this.bigCtx;
    const W = 640;
    g.clearRect(0, 0, W, W);
    const sx = (x) => ((x - WORLD.x0) / (WORLD.x1 - WORLD.x0)) * W;
    const sz = (z) => ((z - WORLD.z0) / (WORLD.z1 - WORLD.z0)) * W;
    g.fillStyle = '#0a4a5c';
    g.fillRect(0, 0, W, W);
    g.fillStyle = '#d9b77c';
    g.fillRect(sx(CITY.beachX0), 0, sx(CITY.seaX0) - sx(CITY.beachX0), W);
    g.fillStyle = '#1d3320';
    g.fillRect(0, 0, sx(CITY.beachX0), W);
    g.fillStyle = '#2c4a2e';
    for (const cx of [-145, -87, -29, 29, 87, 145]) {
      for (const cz of [-145, -87, -29, 29, 87, 145]) {
        g.fillRect(sx(cx - 22), sz(cz - 22), sx(cx + 22) - sx(cx - 22), sz(cz + 22) - sz(cz - 22));
      }
    }
    g.strokeStyle = '#5a5a60';
    g.lineWidth = 5;
    for (const l of roadLines()) {
      g.beginPath(); g.moveTo(sx(l), 0); g.lineTo(sx(l), W); g.stroke();
      g.beginPath(); g.moveTo(0, sz(l)); g.lineTo(W, sz(l)); g.stroke();
    }
    // Labels
    g.fillStyle = '#f5f0e6';
    g.font = 'bold 15px Arial';
    g.textAlign = 'center';
    g.fillText('PALM BOULEVARD', sx(CITY.boulevardX) - 40, sz(180));
    g.fillText('BEACH', sx(214), sz(20));
    g.fillText('MARINA', sx(212), sz(150));
    g.fillText('LIGHTHOUSE', sx(196), sz(-150));
    // Job target
    if (s.target) {
      g.fillStyle = '#ffd24a';
      g.beginPath();
      g.arc(sx(s.target.x), sz(s.target.z), 10, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#1a1a1a';
      g.font = 'bold 13px Arial';
      g.fillText('◆', sx(s.target.x), sz(s.target.z) + 5);
      g.fillStyle = '#ffd24a';
      g.font = 'bold 14px Arial';
      g.textAlign = 'left';
      g.fillText('◆ ' + s.objective.toUpperCase(), 20, 30);
    }
    // Player
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(sx(s.pos.x), sz(s.pos.z), 8, 0, Math.PI * 2);
    g.fill();
    // Stats panel
    this.mapStats.innerHTML = '';
    const rows = [
      ['YOU', `$${s.money.toLocaleString('en-US')} · ${s.respect} RESPECT`],
      ['JOB', `${s.jobIdx + 1}/8 ${s.jobTitle}`],
      ['WANTED', '★'.repeat(s.wanted) + '☆'.repeat(5 - s.wanted)],
      ['HEALTH', `${s.health} · ARMOUR ${s.armour}`],
      ['GARAGE', s.vehicleName || '—'],
      ['CREW', ''],
    ];
    for (const [k, v] of rows) {
      const row = el('div', 'ms-row', this.mapStats);
      el('span', 'ms-key', row, k);
      el('span', '', row, ' — ' + v);
    }
    for (const c of s.crewList) {
      const row = el('div', 'ms-row ms-crew', this.mapStats);
      el('span', '', row, `· ${c.name} — ${c.role}`);
    }
  }
}
