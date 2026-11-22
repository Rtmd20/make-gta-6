// Verde Cay: bootstrap and game loop. The menu is a DOM overlay on top of a
// live view of the city; Enter starts the game, M opens the map, P pauses.
import * as THREE from 'three';
import { makeTextures } from './textures.js';
import { buildCity } from './city.js';
import { Renderer } from './render.js';
import { World } from './world.js';
import { HUD } from './hud.js';
import { Input } from './input.js';
import { AudioEngine } from './audio.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const textures = makeTextures();
const renderer = new Renderer(canvas, textures);
const hud = new HUD();
const audio = new AudioEngine();
const input = new Input();
const city = buildCity(renderer.scene, textures);
const world = new World(renderer.scene, city, textures, audio, hud);

window.__vc = { world, renderer, city, hud };

// --- Title screen ---------------------------------------------------------------
const title = document.getElementById('title');
const titleSub = document.getElementById('title-sub');
titleSub.innerHTML = 'Eight jobs. One crew. A city that never sleeps and a police force that never '
  + 'forgets. Steal it, drive it, sail it — and make it out to open water.';
const startBtn = document.getElementById('start-btn');

function showMenu() {
  world.mode = 'menu';
  title.style.display = 'flex';
  document.getElementById('hud').style.display = 'none';
  // Park the camera on the boulevard for the title backdrop
  renderer.camera.position.set(176, 9, 78);
  renderer.camera.lookAt(176, 3, -40);
  renderer.camPos.set(176, 9, 78);
  renderer.camLook.set(176, 3, -40);
}

function startGame() {
  audio.ensure();
  title.style.display = 'none';
  document.getElementById('hud').style.display = 'block';
  world.mode = 'play';
  hud.update(world.getHUDState());
  hud.showToast('JOB 1 — FIRST LIGHT: Take the Coral Comet RS');
}

startBtn.addEventListener('click', startGame);
input.onFirstKey = () => audio.ensure();
window.addEventListener('keydown', (e) => {
  if (e.code === 'Enter' && world.mode === 'menu') startGame();
  if (e.code === 'KeyP' && world.mode === 'play') {
    world.mode = 'pause';
    hud.showToast('PAUSED — press P to continue');
  } else if (e.code === 'KeyP' && world.mode === 'pause') {
    world.mode = 'play';
  }
  if ((e.code === 'Escape' || e.code === 'KeyM') && world.mode === 'map') {
    world.mode = 'play';
    hud.showMap(false);
  }
});

// --- Resize -----------------------------------------------------------------------
function resize() {
  renderer.resize(window.innerWidth, window.innerHeight);
}
window.addEventListener('resize', resize);
resize();

// --- Staged screenshots ------------------------------------------------------------
const shot = applyShot(world, hud);
if (shot === 'menu') {
  showMenu();
} else if (shot) {
  title.style.display = 'none';
  document.getElementById('hud').style.display = 'block';
  if (shot === 'map') {
    document.getElementById('hud').style.display = 'none';
  }
} else {
  showMenu();
}

// --- Loop -----------------------------------------------------------------------------
let last = performance.now();
let fpsAccum = 0;
let fpsFrames = 0;
function loop(now) {
  requestAnimationFrame(loop);
  const dt = Math.min((now - last) / 1000, 0.05);
  last = now;
  fpsAccum += dt;
  fpsFrames += 1;

  if (world.mode === 'menu') {
    if (shot === 'menu') {
      // Fixed backdrop for the title screenshot: boulevard at sunset.
      renderer.camera.position.set(176, 9, 78);
      renderer.camera.lookAt(176, 3, -40);
    } else {
      // Slow drift along the boulevard behind the title
      const t = now / 1000;
      renderer.camera.position.set(176 + Math.sin(t * 0.05) * 6, 9, 78 - (t * 0.4 % 40));
      renderer.camera.lookAt(176, 3, -40);
    }
  } else if (world.mode === 'play' || world.mode === 'map') {
    world.update(dt, input);
    const p = world.player;
    if (world.mode === 'play') {
      if (p.onFoot) renderer.updateOnFootCamera(p, p.heading, dt, shot === 'foot');
      else renderer.updateCamera(p, p.heading, Math.abs(p.speed) * 3.6, dt, shot === 'cover');
    }
  }
  renderer.updateSea(dt);
  // Lighthouse beacon sweeps (target is relative to the lighthouse group)
  const ba = now / 1000 * 0.6;
  city.lighthouse.cone.rotation.y = ba;
  city.lighthouse.beacon.target.position.set(Math.sin(ba) * 60, -37, Math.cos(ba) * 60);
  renderer.render();
  input.endFrame();
  if (fpsAccum >= 1) {
    window.__fps = fpsFrames / fpsAccum;
    fpsAccum = 0;
    fpsFrames = 0;
  }
}
requestAnimationFrame(loop);
