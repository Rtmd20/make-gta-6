// The HUD for Verde Cay: pure DOM over the WebGL canvas, so the text stays crisp
// at any window size. Mission card, wanted stars, the named VCPD dispatch panel,
// a circular minimap, health / armour / respect, NPC dialogue, weapon slots,
// speed and car, the radio — plus the title, pause, map, game-over and win menus.
import { MISSIONS, CREW, WEAPONS, RADIO, GARAGE_CARS } from './config.js';

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}
function fmtClock(hours) {
  const h = Math.floor(hours) % 24;
  const m = Math.floor((hours - Math.floor(hours)) * 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}
function fmtMoney(n) { return `$${Math.round(n).toLocaleString()}`; }

export function createHud(world, audio) {
  const root = document.getElementById('hud');
  const state = world.state;

  const missionCard = el('div', 'hud-card mission-card');
  const missionTitle = el('div', 'mission-title');
  const missionObj = el('div', 'mission-objective');
  const missionStage = el('div', 'mission-stage');
  const missionNext = el('div', 'mission-next');
  const missionTimer = el('div', 'mission-timer');
  missionCard.append(missionTitle, missionObj, missionStage, missionNext, missionTimer);

  const topRight = el('div', 'hud-card top-right');
  const wanted = el('div', 'wanted');
  const money = el('div', 'money');
  const clockLine = el('div', 'clock-line');
  topRight.append(wanted, money, clockLine);

  const dispatch = el('div', 'hud-card dispatch');
  const dispatchTitle = el('div', 'dispatch-title', 'VCPD RESPONSE');
  const dispatchList = el('div', 'dispatch-list');
  dispatch.append(dispatchTitle, dispatchList);

  const minimapWrap = el('div', 'minimap-wrap');
  const minimap = document.createElement('canvas');
  minimap.width = 220; minimap.height = 220;
  minimap.className = 'minimap';
  minimapWrap.appendChild(minimap);
  const minimapLabel = el('div', 'minimap-label', 'VERDE CAY');
  minimapWrap.appendChild(minimapLabel);

  const vitals = el('div', 'hud-card vitals');
  function vitalRow(label, barClass) {
    const row = el('div', 'vital-row');
    const track = el('div', 'vital-track');
    const bar = el('div', `vital-bar ${barClass}`);
    track.appendChild(bar);
    row.append(el('span', 'vital-label', label), track);
    return { row, bar };
  }
  const healthVital = vitalRow('HEALTH', 'health-bar');
  const armourVital = vitalRow('ARMOUR', 'armour-bar');
  const respectVital = vitalRow('RESPECT', 'respect-bar');
  const rankLine = el('div', 'rank-line');
  vitals.append(healthVital.row, armourVital.row, respectVital.row, rankLine);
  const healthBar = healthVital.bar;
  const armourBar = armourVital.bar;
  const respectBar = respectVital.bar;

  const dialogue = el('div', 'hud-card dialogue');
  const dialogueName = el('div', 'dialogue-name');
  const dialogueText = el('div', 'dialogue-text');
  dialogue.append(dialogueName, dialogueText);

  const bottomRight = el('div', 'hud-card bottom-right');
  const speed = el('div', 'speed');
  const vehicle = el('div', 'vehicle');
  const condition = el('div', 'condition');
  const weapons = el('div', 'weapons');
  const radio = el('div', 'radio');
  bottomRight.append(speed, vehicle, condition, weapons, radio);

  const toast = el('div', 'toast');

  const menu = el('div', 'menu');
  const menuTitle = el('div', 'menu-title', 'VERDE CAY');
  const menuSub = el('div', 'menu-sub', 'An open-world crime game · 8 story jobs · Verde Cay Police');
  const menuBody = el('div', 'menu-body');
  const menuPrompt = el('div', 'menu-prompt', 'Press Enter or click to start');
  const menuHint = el('div', 'menu-hint', 'WASD drive / walk · E enter car or boat · F fire · Space brake · Shift run · M map · P pause · Q radio · 1-3 weapons');
  menu.append(menuTitle, menuSub, menuBody, menuPrompt, menuHint);

  root.append(missionCard, topRight, dispatch, minimapWrap, vitals, dialogue, bottomRight, toast, menu);

  const mapCtx = minimap.getContext('2d');
  function drawMinimap() {
    const s = world.state;
    const ctx = mapCtx;
    const W = 220;
    ctx.clearRect(0, 0, W, W);
    ctx.save();
    ctx.beginPath();
    ctx.arc(110, 110, 108, 0, Math.PI * 2);
    ctx.clip();
    // Land, beach and sea, then the real street blocks.
    ctx.fillStyle = '#2a2f2a';
    ctx.fillRect(0, 0, W, W);
    ctx.fillStyle = '#c9a86a';
    ctx.fillRect(0, 0, W, 176);
    ctx.fillStyle = '#e8c98a';
    ctx.fillRect(0, 168, W, 10);
    ctx.fillStyle = '#1e6f8e';
    ctx.fillRect(0, 178, W, 42);
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    for (let i = 0; i < 5; i += 1) ctx.fillRect(10 + i * 44, 188 + (i % 2) * 12, 26, 2);
    const toMap = (x, z) => [110 + (x / 320) * 105, 110 + (z / 320) * 105];
    // Buildings as small blocks in their facade colours.
    if (world.cityBuildings) {
      for (const b of world.cityBuildings) {
        const [bx, by] = toMap(b.x - b.w / 2, b.z - b.d / 2);
        const [ex, ey] = toMap(b.x + b.w / 2, b.z + b.d / 2);
        ctx.fillStyle = b.height > 28 ? '#d9b8e8' : b.height > 18 ? '#f2c98a' : '#a8c8e8';
        ctx.fillRect(bx, by, Math.max(2, ex - bx), Math.max(2, ey - by));
      }
    }
    // Roads.
    ctx.strokeStyle = '#3a4048';
    ctx.lineWidth = 5;
    for (let i = 0; i <= 10; i += 1) {
      const p = 12 + i * 19.6;
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, 220); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(220, p); ctx.stroke();
    }
    ctx.strokeStyle = '#f2b705';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(0, 176); ctx.lineTo(220, 176); ctx.stroke();
    // Pier.
    ctx.strokeStyle = '#9a7b52';
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.moveTo(110, 176); ctx.lineTo(110, 214); ctx.stroke();
    // Lighthouse dot.
    ctx.fillStyle = '#ff5a4a';
    ctx.beginPath(); ctx.arc(114, 196, 3, 0, Math.PI * 2); ctx.fill();
    // Mission target.
    const t = world.missionTarget();
    const [tx, ty] = toMap(t.x, t.z);
    ctx.fillStyle = '#ffd23f';
    ctx.beginPath(); ctx.arc(tx, ty, 7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(tx, ty, 10, 0, Math.PI * 2); ctx.stroke();
    // Police dots.
    ctx.fillStyle = '#3a7bd5';
    for (const p of world.police) {
      const [px, py] = toMap(p.x, p.z);
      ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.fill();
    }
    // Player arrow.
    const [px, py] = toMap(world.player.x, world.player.z);
    ctx.fillStyle = '#e8481f';
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(world.player.heading);
    ctx.beginPath(); ctx.moveTo(0, -9); ctx.lineTo(6, 7); ctx.lineTo(-6, 7); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.restore();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(110, 110, 108, 0, Math.PI * 2); ctx.stroke();
  }

  function update() {
    const s = state;
    const m = MISSIONS[s.missionIndex];
    const inGame = s.screen === 'play' || s.screen === 'paused';
    root.classList.toggle('in-game', inGame);
    missionCard.style.display = inGame ? '' : 'none';
    topRight.style.display = inGame ? '' : 'none';
    dispatch.style.display = inGame && s.wanted > 0 ? '' : 'none';
    minimapWrap.style.display = inGame ? '' : 'none';
    vitals.style.display = inGame ? '' : 'none';
    dialogue.style.display = inGame ? '' : 'none';
    bottomRight.style.display = inGame ? '' : 'none';
    menu.style.display = s.screen === 'play' ? 'none' : '';
    toast.style.opacity = '0';
    if (!inGame) { renderMenu(s); return; }

    missionTitle.textContent = `Job ${m.id}/8 — ${m.title}`;
    missionObj.textContent = m.objective;
    missionStage.textContent = `Stage ${s.stageIndex + 1}/${m.stages.length} · ${m.stages[s.stageIndex] ?? 'Done'}`;
    missionNext.textContent = s.stageIndex < m.stages.length - 1
      ? `Next: ${m.stages[s.stageIndex + 1]}`
      : 'Final stage — finish the job!';
    const mm = Math.floor(s.missionTime / 60);
    const ss = Math.floor(s.missionTime % 60);
    missionTimer.textContent = `${String(mm).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;

    wanted.textContent = '★'.repeat(s.wanted) + '☆'.repeat(5 - s.wanted);
    wanted.className = `wanted wanted-${s.wanted}`;
    money.textContent = fmtMoney(s.money);
    clockLine.textContent = `Day ${s.day} · ${fmtClock(s.time)}`;

    dispatchList.innerHTML = '';
    const units = world.police.slice(0, 6);
    if (s.mode === 'boat') {
      const marine = [
        { name: 'Marine-3', d: 18, tactic: 'RAMMING' },
        { name: 'Marine-7', d: 26, tactic: 'PURSUIT' },
        { name: 'Air-1', d: 34, tactic: 'SPOTLIGHT' },
        { name: 'VCPD-42', d: 41, tactic: 'ROADBLOCK' },
        { name: 'Marine-9', d: 55, tactic: 'FLANKING' },
        { name: 'VCPD-11', d: 63, tactic: 'RESPONDING' },
      ];
      for (const u of marine) {
        const row = el('div', 'dispatch-row');
        row.append(el('span', 'dispatch-name', u.name), el('span', 'dispatch-dist', `${u.d}m`), el('span', 'dispatch-tactic', u.tactic));
        dispatchList.appendChild(row);
      }
    } else {
      for (const p of units) {
        const d = Math.round(Math.hypot(p.x - world.player.x, p.z - world.player.z));
        const row = el('div', 'dispatch-row');
        row.append(el('span', 'dispatch-name', p.name), el('span', 'dispatch-dist', `${d}m`), el('span', 'dispatch-tactic', p.tactic));
        dispatchList.appendChild(row);
      }
    }
    if (s.wanted >= 3) {
      const row = el('div', 'dispatch-row heli-row');
      row.append(el('span', 'dispatch-name', 'Air-1'), el('span', 'dispatch-dist', '52m'), el('span', 'dispatch-tactic', 'SPOTLIGHT'));
      dispatchList.appendChild(row);
    }

    healthBar.style.width = `${s.health}%`;
    armourBar.style.width = `${s.armour}%`;
    respectBar.style.width = `${Math.min(100, (s.respect / s.respectMax) * 100)}%`;
    rankLine.textContent = `${s.respectRank} · ${s.respect}/${s.respectMax} Respect`;

    dialogueName.textContent = `${m.giver} — ${m.giverRole}`;
    dialogueText.textContent = m.dialogue;

    if (s.mode === 'boat') {
      speed.textContent = `${s.boatSpeedKn} kn`;
      vehicle.textContent = 'La Marea · Speedboat';
      condition.textContent = 'Hull 100%';
    } else if (s.mode === 'car') {
      speed.textContent = `${s.speedKmh} km/h`;
      vehicle.textContent = s.carName;
      condition.textContent = `Condition ${s.carCondition}%`;
    } else {
      speed.textContent = `${s.speedKmh} km/h`;
      vehicle.textContent = 'On foot';
      condition.textContent = `Condition ${s.carCondition}%`;
    }
    weapons.innerHTML = '';
    WEAPONS.forEach((w, i) => {
      const chip = el('span', `weapon-chip${i === s.weapon ? ' active' : ''}`, `${i + 1} ${w.name} ${w.ammo}`);
      weapons.appendChild(chip);
    });
    radio.textContent = `♪ ${RADIO[s.radio].name} · ${RADIO[s.radio].style}`;

    if (s.messageTimer > 0 && s.message) {
      toast.textContent = s.message;
      toast.style.opacity = '1';
    } else {
      toast.style.opacity = '0';
    }
    drawMinimap();
  }

  function renderMenu(s) {
    const m = MISSIONS[s.missionIndex];
    if (s.screen === 'title') {
      menuTitle.textContent = 'VERDE CAY';
      menuSub.textContent = 'An open-world crime game · 8 story jobs · Verde Cay Police';
      menuBody.innerHTML = '';
      const lines = [
        `New Game — Job 1/8: ${MISSIONS[0].title}`,
        `Continue — Job ${m.id}/8: ${m.title} · ${fmtMoney(s.money)}`,
        'Controls — WASD · E enter · F fire · Space brake · M map',
        'Crew — Ana (Driver) · Marco (Wheelman) · Rosa (Mechanic) · Kiki (Lookout) · Uncle Sol (Fixer)',
        'Garage — ' + GARAGE_CARS.map((c) => c.name).join(' · '),
      ];
      for (const line of lines) menuBody.appendChild(el('div', 'menu-line', line));
      menuPrompt.textContent = 'Press Enter or click to start';
    } else if (s.screen === 'paused' || s.screen === 'map') {
      menuTitle.textContent = s.screen === 'map' ? 'MAP — VERDE CAY' : 'PAUSED';
      menuSub.textContent = `Job ${m.id}/8: ${m.title} · ${fmtMoney(s.money)} · ${s.respect} respect · Day ${s.day}`;
      menuBody.innerHTML = '';
      const stats = [
        `Missions — ${s.missionIndex}/8 complete · current: ${m.title}`,
        `Crew — ${CREW.map((c) => `${c.name} (${c.role})`).join(' · ')}`,
        `Crew abilities — ${CREW.map((c) => c.ability).join(' · ')}`,
        `Garage — ${s.garage.join(' · ')}`,
        `Radio — ${RADIO.map((r) => r.name).join(' · ')}`,
        `Wanted — ${s.wanted} stars · Health ${Math.round(s.health)} · Armour ${Math.round(s.armour)}`,
        'Save — progress saves automatically after every job (localStorage).',
      ];
      for (const line of stats) menuBody.appendChild(el('div', 'menu-line', line));
      menuPrompt.textContent = 'Press P or M to return to the game';
    } else if (s.screen === 'over') {
      menuTitle.textContent = 'BUSTED';
      menuSub.textContent = 'The VCPD caught up with you in Verde Cay.';
      menuBody.innerHTML = '';
      menuBody.appendChild(el('div', 'menu-line', `You reached Job ${m.id}/8: ${m.title} · ${fmtMoney(s.money)}`));
      menuPrompt.textContent = 'Press Enter to try again';
    } else if (s.screen === 'won') {
      menuTitle.textContent = 'OPEN WATER';
      menuSub.textContent = 'You made it. Verde Cay is yours.';
      menuBody.innerHTML = '';
      menuBody.appendChild(el('div', 'menu-line', `All 8 jobs done · ${fmtMoney(s.money)} · ${s.respect} respect · Shot Caller`));
      menuPrompt.textContent = 'Press Enter to play again';
    }
    menu.style.display = '';
  }

  return { update, renderMenu };
}
