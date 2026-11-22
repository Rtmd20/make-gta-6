// Verde Cay — boot, render loop, chase camera and the menu/map/pause states.
import * as THREE from 'three';
import { buildCity } from './city.js';
import { createWorld } from './world.js';
import { updateHUD, showPrompt, drawMinimap, drawBigMap, fillPauseStats } from './hud.js';
import { initInput, held, pressed, endFrame, axis } from './input.js';
import { initAudio, nextStation, currentStation, setEngine } from './audio.js';
import { stageShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const params = new URLSearchParams(location.search);
const shotName = params.get('shot');

window.addEventListener('error', (e) => {
  const el = $('loading');
  if (el) el.textContent = `ERROR: ${e.message}`;
});

initInput();

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
$('scene').appendChild(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 1400);
camera.position.set(110, 12, 170);

const city = buildCity(scene);
const world = createWorld(scene, city);
window.__vc = { world, city, scene, camera };

let shot = null;
if (shotName) {
  shot = stageShot(shotName, world, city, scene, camera);
  if (shotName === 'foot' && shot.prompt) showPrompt(shot.prompt);
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let menuOrbit = 0;
let frames = 0;

function chaseCamera(dt, t) {
  const p = world.player;
  const speed01 = world.player.vehicle
    ? Math.min(1, Math.abs(world.player.vehicle.speed) / 60) : 0;
  const dist = p.onFoot ? 5.2 : 7.2 + speed01 * 3.2;
  const height = p.onFoot ? 2.7 : 3.1 + speed01 * 0.8;
  const fx = Math.sin(p.heading), fz = Math.cos(p.heading);
  const tx = p.x - fx * dist, tz = p.z - fz * dist;
  const k = 1 - Math.exp(-6 * dt);
  camera.position.x += (tx - camera.position.x) * k;
  camera.position.y += (height - camera.position.y) * k;
  camera.position.z += (tz - camera.position.z) * k;
  camera.lookAt(p.x + fx * 9, 1.6, p.z + fz * 9);
  const targetFov = 60 + speed01 * 16;
  if (Math.abs(camera.fov - targetFov) > 0.3) {
    camera.fov += (targetFov - camera.fov) * Math.min(1, dt * 4);
    camera.updateProjectionMatrix();
  }
}

function menuCamera(dt, t) {
  menuOrbit += dt * 0.03;
  const cx = 120 + Math.sin(menuOrbit) * 60;
  const cz = 40 + Math.cos(menuOrbit) * 90;
  camera.position.set(cx, 14, cz);
  camera.lookAt(150, 6, -40);
  if (Math.abs(camera.fov - 55) > 0.3) {
    camera.fov = 55;
    camera.updateProjectionMatrix();
  }
}

function nearestVehiclePrompt() {
  if (!world.player.onFoot) return null;
  const p = world.player;
  const cands = [
    { x: world.heroCar.x, z: world.heroCar.z, label: 'E — DRIVE THE CORAL COMET RS' },
    { x: world.playerBoat.x, z: world.playerBoat.z, label: 'E — BOARD THE SPEEDBOAT' },
  ];
  for (const tc of world.traffic) cands.push({ x: tc.x, z: tc.z, label: 'E — STEAL THIS CAR' });
  let best = null, bestD = 6;
  for (const c of cands) {
    const d = Math.hypot(c.x - p.x, c.z - p.z);
    if (d < bestD) { best = c; bestD = d; }
  }
  return best ? best.label : null;
}

const clock = new THREE.Clock();
function frame() {
  requestAnimationFrame(frame);
  const dt = Math.min(clock.getDelta(), 0.05);
  const t = clock.elapsedTime;
  const s = world.state;

  if (shot) {
    // Staged screenshot: the scene is posed, the sea keeps a slow swell.
    city.updateSea(t);
    const pose = shot.pose(t);
    camera.position.copy(pose.pos);
    camera.lookAt(pose.look);
    if (Math.abs(camera.fov - pose.fov) > 0.1) {
      camera.fov = pose.fov;
      camera.updateProjectionMatrix();
    }
    if (s.mode === 'play') {
      updateHUD(world, currentStation());
      drawMinimap(world, city);
    }
    if (s.mode === 'map') drawBigMap(world, city);
  } else {
    // --- State keys ------------------------------------------------------------
    if (s.mode === 'menu' && (pressed('Enter') || pressed('NumpadEnter'))) {
      s.mode = 'play';
      $('menu').classList.remove('on');
      $('hud').classList.add('on');
      initAudio();
      world.showToast('VERDE CAY', world.currentJob().brief, 5);
    }
    if (s.mode === 'play' && pressed('KeyM')) {
      s.mode = 'map';
      $('mapview').classList.add('on');
      drawBigMap(world, city);
    } else if (s.mode === 'map' && (pressed('KeyM') || pressed('Escape'))) {
      s.mode = 'play';
      $('mapview').classList.remove('on');
    }
    if (s.mode === 'play' && pressed('KeyP')) {
      s.mode = 'pause';
      fillPauseStats(world);
      $('pauseview').classList.add('on');
    } else if (s.mode === 'pause' && pressed('KeyP')) {
      s.mode = 'play';
      $('pauseview').classList.remove('on');
    }
    if (s.mode === 'play' && pressed('KeyQ')) {
      initAudio();
      const name = nextStation();
      world.showToast('RADIO', name, 2);
    }
    if (pressed('KeyM') && s.mode === 'play') { /* handled above */ }

    // --- World + camera ----------------------------------------------------------
    world.update(dt, t);
    if (s.mode === 'play') {
      chaseCamera(dt, t);
      updateHUD(world, currentStation());
      drawMinimap(world, city);
      showPrompt(nearestVehiclePrompt());
    } else if (s.mode === 'menu') {
      menuCamera(dt, t);
      showPrompt(null);
    } else if (s.mode === 'map') {
      drawBigMap(world, city);
    }
  }

  renderer.render(scene, camera);
  frames++;
  if (frames === 3) {
    const el = $('loading');
    if (el) el.style.display = 'none';
    window.__shotReady = true;
  }
  endFrame();
}
frame();
