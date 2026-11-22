// Verde Cay — the HUD: mission card, wanted stars, VCPD dispatch panel,
// health/armour/respect bars, minimap and the full-screen city map.
import { WORLD, STREETS, JOBS, CREW } from './config.js';

const $ = (id) => document.getElementById(id);
const WEAPON_NAMES = { 1: 'FIST', 2: 'PISTOL', 3: 'SMG' };

function fmtClock(mins) {
  const h = Math.floor(mins / 60) % 24;
  const m = Math.floor(mins % 60);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')} · SAT`;
}

function fmtTimer(secs) {
  const s = Math.max(0, Math.ceil(secs));
  return `⏱ ${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export function updateHUD(world, radioName) {
  const s = world.state;
  const job = s.storyDone ? null : world.currentJob();
  const stage = s.storyDone ? null : world.currentStage();
  $('hud-job').textContent = s.storyDone
    ? 'STORY COMPLETE'
    : `JOB ${s.jobIndex + 1} / 8 · ${job.giver}`;
  $('hud-jobname').textContent = s.storyDone ? 'FREE ROAM' : job.name;
  $('hud-stage').textContent = s.storyDone
    ? 'All eight jobs done — Verde Cay is yours.'
    : `Stage ${s.stageIndex + 1} of ${job.stages.length}`;
  $('hud-next').textContent = s.storyDone ? 'Explore, earn respect, stay out of jail.' : stage.text;
  $('hud-timer').textContent = s.storyDone ? '—' : fmtTimer(s.jobTimer);
  $('hud-stars').innerHTML = Array.from({ length: 5 }, (_, i) =>
    i < s.wanted ? '★' : '<span class="off">☆</span>').join('');
  $('hud-money').textContent = `$${s.money.toLocaleString()}`;
  $('hud-clock').textContent = fmtClock(s.clockMin);
  $('health-fill').style.width = `${s.health}%`;
  $('armour-fill').style.width = `${s.armour}%`;
  $('respect-fill').style.width = `${s.respect}%`;
  $('dialogue').textContent = job ? job.line : 'CREW: “The city is ours now.”';
  const units = world.dispatchUnits();
  $('dispatch-units').innerHTML = units.map((u) =>
    `<div class="unit"><span>${u.name}</span><span>${u.dist ? u.dist + 'm' : ''}</span><span class="tac">${u.tac}</span></div>`).join('');
  const kmh = world.speedKmh();
  if (world.player.boat) {
    $('hud-speed').textContent = Math.round(world.speedKnots());
    $('hud-speedunit').textContent = 'kn';
  } else {
    $('hud-speed').textContent = Math.round(kmh);
    $('hud-speedunit').textContent = 'km/h';
  }
  $('hud-carname').textContent = world.vehicleName().toUpperCase();
  $('hud-cond').textContent = world.player.vehicle
    ? `Condition ${Math.round(world.player.condition)}%`
    : 'On foot — press E near a car to drive';
  document.querySelectorAll('#weapons .slot').forEach((el) => {
    const w = Number(el.dataset.w);
    el.classList.toggle('active', w === s.weapon);
    el.textContent = `${w} · ${WEAPON_NAMES[w]}`;
  });
  $('radio-line').textContent = `♪ RADIO · ${radioName}`;
  // Toast.
  const now = performance.now() / 1000;
  if (s.toast && now < s.toastUntil) {
    $('toast').style.display = 'block';
    $('toast').innerHTML = `${s.toast}${s.toastSub ? `<small>${s.toastSub}</small>` : ''}`;
  } else {
    $('toast').style.display = 'none';
  }
}

export function showPrompt(text) {
  const el = $('prompt');
  if (text) { el.style.display = 'block'; el.textContent = text; }
  else el.style.display = 'none';
}

// --- Maps ---------------------------------------------------------------------
// Both maps draw the same world: sea to the east, sand beach, the road grid,
// building blocks, the objective marker, the player and the police.

function drawMapBase(ctx, size, world, city, label) {
  const half = WORLD.half + 30;
  const scale = size / (half * 2);
  const toX = (x) => (x + half) * scale;
  const toY = (z) => (z + half) * scale;
  ctx.clearRect(0, 0, size, size);
  // Land and sea.
  ctx.fillStyle = '#1d2f1e'; ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#155e7d'; ctx.fillRect(toX(WORLD.seaX), 0, size - toX(WORLD.seaX), size);
  ctx.fillStyle = '#d9b380'; ctx.fillRect(toX(WORLD.beachX), 0, toX(WORLD.seaX) - toX(WORLD.beachX), size);
  // Roads.
  ctx.fillStyle = '#3a3a40';
  for (const ax of STREETS.avenues) ctx.fillRect(toX(ax) - 7 * scale, 0, 14 * scale, size);
  for (const cz of STREETS.cross) ctx.fillRect(0, toY(cz) - 7 * scale, size, 14 * scale);
  // Building blocks.
  ctx.fillStyle = '#6b5a48';
  for (const c of city.colliders) {
    if (c.minX > WORLD.seaX) continue;
    ctx.fillRect(toX(c.minX), toY(c.minZ), (c.maxX - c.minX) * scale, (c.maxZ - c.minZ) * scale);
  }
  // Marina docks.
  ctx.fillStyle = '#8a6a45';
  for (const d of city.dockSpots) ctx.fillRect(toX(d.x - 13), toY(d.z - 2.5), 26 * scale, 5 * scale);
  // Lighthouse.
  ctx.fillStyle = '#ffd23e';
  ctx.beginPath(); ctx.arc(toX(178), toY(-185), label ? 7 : 4, 0, Math.PI * 2); ctx.fill();
  if (label) {
    ctx.fillStyle = '#ffe9a8'; ctx.font = 'bold 13px Arial';
    // Keep labels inside the map: right-align anything past 60% width.
    const lx = (x) => (toX(x) > size * 0.6 ? [toX(x) - 10, 'right'] : [toX(x) + 10, 'left']);
    let [tx, ta] = lx(178);
    ctx.textAlign = ta; ctx.fillText('LIGHTHOUSE', tx, toY(-185) + 4);
    [tx, ta] = lx(196);
    ctx.textAlign = ta; ctx.fillText('MARINA', tx, toY(144) + 4);
    ctx.textAlign = 'left';
    ctx.fillText('PALM BOULEVARD', toX(132) - 64, toY(210) - 8);
    ctx.fillText('BEACH', toX(156) - 10, toY(-40));
  }
  return { toX, toY, scale };
}

export function drawMinimap(world, city) {
  const canvas = $('minimap');
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const { toX, toY } = drawMapBase(ctx, size, world, city, false);
  const s = world.state;
  // Objective marker.
  if (!s.storyDone) {
    const stage = world.currentStage();
    ctx.fillStyle = '#ffd23e';
    ctx.beginPath(); ctx.arc(toX(stage.x), toY(stage.z), 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.stroke();
  }
  // Police.
  ctx.fillStyle = '#3b82f6';
  for (const c of world.cruisers) {
    if (!c.active) continue;
    ctx.beginPath(); ctx.arc(toX(c.x), toY(c.z), 4, 0, Math.PI * 2); ctx.fill();
  }
  if (world.heli.group.visible) {
    ctx.fillStyle = '#60a5fa';
    ctx.beginPath(); ctx.arc(toX(world.player.x + 14), toY(world.player.z - 10), 5, 0, Math.PI * 2); ctx.fill();
  }
  // Player arrow.
  const px = toX(world.player.x), py = toY(world.player.z);
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(-world.player.heading);
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.moveTo(0, -8); ctx.lineTo(5, 6); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill();
  ctx.restore();
  // North tick.
  ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.font = 'bold 11px Arial'; ctx.textAlign = 'center';
  ctx.fillText('N', size / 2, 12);
}

export function drawBigMap(world, city) {
  const canvas = $('bigmap');
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  const { toX, toY } = drawMapBase(ctx, size, world, city, true);
  const s = world.state;
  if (!s.storyDone) {
    const stage = world.currentStage();
    ctx.fillStyle = '#ffd23e';
    ctx.beginPath(); ctx.arc(toX(stage.x), toY(stage.z), 9, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#ffd23e'; ctx.font = 'bold 15px Arial';
    if (toX(stage.x) > size * 0.6) {
      ctx.textAlign = 'right';
      ctx.fillText(`◈ ${stage.text.toUpperCase()}`, toX(stage.x) - 14, toY(stage.z) + 5);
    } else {
      ctx.textAlign = 'left';
      ctx.fillText(`◈ ${stage.text.toUpperCase()}`, toX(stage.x) + 14, toY(stage.z) + 5);
    }
  }
  ctx.fillStyle = '#3b82f6';
  for (const c of world.cruisers) {
    if (!c.active) continue;
    ctx.beginPath(); ctx.arc(toX(c.x), toY(c.z), 6, 0, Math.PI * 2); ctx.fill();
  }
  const px = toX(world.player.x), py = toY(world.player.z);
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(-world.player.heading);
  ctx.fillStyle = '#fff';
  ctx.beginPath(); ctx.moveTo(0, -11); ctx.lineTo(7, 8); ctx.lineTo(-7, 8); ctx.closePath(); ctx.fill();
  ctx.restore();
  const stats = $('mapstats');
  const job = s.storyDone ? null : world.currentJob();
  stats.innerHTML = `
    <b>YOU</b> — $${s.money.toLocaleString()} · ${s.respect} RESPECT<br>
    <b>JOB</b> — ${s.storyDone ? 'All done' : `${s.jobIndex + 1}/8 ${job.name}`}<br>
    <b>WANTED</b> — ${'★'.repeat(s.wanted)}${'☆'.repeat(5 - s.wanted)}<br>
    <b>HEALTH</b> — ${Math.round(s.health)} · <b>ARMOUR</b> — ${Math.round(s.armour)}<br>
    <b>GARAGE</b> — ${s.garage.join(', ')}<br>
    <b>CREW</b><br>${CREW.map((c) => `· ${c.name} — ${c.role}`).join('<br>')}`;
}

export function fillPauseStats(world) {
  const s = world.state;
  $('pause-stats').innerHTML = `
    Money <b>$${s.money.toLocaleString()}</b> · Respect <b>${s.respect}</b><br>
    Job <b>${s.storyDone ? 'Story complete' : `${s.jobIndex + 1} / 8 — ${world.currentJob().name}`}</b><br>
    Wanted <b>${'★'.repeat(s.wanted)}${'☆'.repeat(5 - s.wanted)}</b> · Health <b>${Math.round(s.health)}</b>`;
}
