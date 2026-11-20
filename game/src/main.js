// VERDE CAY — boot and the one loop. Input is read every frame, the world
// advances in fixed 1/60 s steps, the Three.js renderer paints the city and the
// DOM HUD paints the mission, the wanted level and the dispatch panel.
//
// ?seed=N fixes the traffic and pedestrian pattern. ?shot=cover|foot|map|menu
// (with &seed=N) stages that scene instead of running the loop, paints it and
// sets window.__shotReady for a screenshot.
import * as THREE from 'three';
import { STEP } from './config.js';
import { createRandom } from './random.js';
import { buildCity } from './city.js';
import { createWorld } from './world.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import { createRenderer } from './render.js';
import { createHud } from './hud.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const rng = createRandom(seed);
const scene = new THREE.Scene();
const city = buildCity(scene, rng);
const audio = createAudio();
const world = createWorld(rng, scene, city, audio);
const renderer = createRenderer(canvas, world, city);
const hud = createHud(world, audio);
const input = createInput(canvas);

function announce(message) { status.textContent = message; }

function startGame(fromSave) {
  if (fromSave && world.load()) {
    world.startMission(world.state.missionIndex);
  } else {
    world.state.money = 21780;
    world.state.respect = 165;
    world.startMission(0);
  }
  world.state.screen = 'play';
  world.state.health = 100;
  world.state.armour = 55;
  world.state.over = false;
  world.state.won = false;
  audio.unlock();
  audio.startRadio();
  announce(`Playing Verde Cay. Job ${world.state.missionIndex + 1} of 8.`);
}

function runShot(name) {
  stageShot(name, world, renderer);
  hud.update();
}

function runGame() {
  let accumulator = 0;
  let last = performance.now();

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    const s = world.state;
    if (input.consume('pause')) {
      if (s.screen === 'play') { s.screen = 'paused'; announce('Paused.'); }
      else if (s.screen === 'paused') { s.screen = 'play'; announce('Playing.'); }
    }
    if (input.consume('map')) {
      if (s.screen === 'play') { s.screen = 'map'; announce('Map open.'); }
      else if (s.screen === 'map') { s.screen = 'play'; announce('Playing.'); }
    }
    if (input.consume('confirm')) {
      if (s.screen === 'title') startGame(false);
      else if (s.screen === 'over' || s.screen === 'won') startGame(false);
    }
    if (s.screen === 'play') {
      while (accumulator >= STEP) {
        world.update(STEP, input);
        accumulator -= STEP;
        if (world.state.screen !== 'play') break;
      }
    } else {
      accumulator = 0;
    }
    if (world.state.over && s.screen === 'play') s.screen = 'over';
    renderer.draw(s, s.screen);
    hud.update();
  }

  canvas.addEventListener('pointerdown', () => {
    if (world.state.screen === 'title') startGame(false);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && world.state.screen === 'play') {
      world.state.screen = 'paused';
      announce('Paused.');
    }
  });
  announce('Verde Cay. Press Enter or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
