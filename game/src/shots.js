// Verde Cay — staged screenshot scenes. Each shot sets the world up in a
// fixed, deterministic pose (Job 4 chase for the cover, a theft on foot, the
// map, the title screen) and hands the camera pose back to the main loop.
import * as THREE from 'three';
import { makeExplosion, tickExplosion } from './city.js';

const $ = (id) => document.getElementById(id);

function setJob(world, jobIndex, stageIndex, timer = 299) {
  world.state.jobIndex = jobIndex;
  world.state.stageIndex = stageIndex;
  world.state.jobTimer = timer;
  world.state.storyDone = false;
  world.state.dialogue = world.currentJob().line;
}

function placeCruiser(world, i, x, z, heading) {
  const c = world.cruisers[i];
  c.active = true;
  c.x = x; c.z = z; c.heading = heading; c.speed = 34; c.hp = 3;
  c.mesh.group.visible = true;
  c.mesh.group.position.set(x, 0, z);
  c.mesh.group.rotation.y = heading;
}

function placeHeli(world, x, z) {
  world.heli.group.visible = true;
  world.heli.group.position.set(x, 20, z);
  // Shorten the light cone to match the lower hover height.
  const cone = world.heli.group.userData.cone;
  cone.scale.y = 20 / 26;
  cone.position.y = -10;
  world.heli.group.userData.spot.target.position.set(0, -20, 0);
  world.heli.group.userData.spot.target.updateMatrixWorld();
}

export function stageShot(name, world, city, scene, camera) {
  const s = world.state;
  const hero = world.heroCar;
  if (name === 'cover') {
    // Job 4 Harbor Lights: sunset boulevard chase, 165 km/h, roadblock blast.
    setJob(world, 3, 0, 259);
    s.wanted = 3; s.heat = 3; s.money = 6420; s.respect = 48;
    s.clockMin = 18 * 60 + 47;
    hero.x = 132; hero.z = 62; hero.heading = Math.PI; hero.speed = 45.8; hero.condition = 82;
    hero.mesh.group.position.set(hero.x, 0, hero.z);
    hero.mesh.group.rotation.y = hero.heading;
    world.player.vehicle = hero;
    world.player.onFoot = false;
    world.player.boat = false;
    world.player.x = hero.x; world.player.z = hero.z; world.player.heading = hero.heading;
    world.player.condition = 82;
    world.player.group.visible = false;
    placeCruiser(world, 0, 126.5, 34, Math.PI);
    placeCruiser(world, 1, 137.5, 28, Math.PI);
    placeCruiser(world, 2, 124.5, 52, Math.PI);
    placeHeli(world, 147, 40);
    const ex = makeExplosion(scene, 132, 40);
    tickExplosion(ex, 0.5); tickExplosion(ex, 0.4);
    s.mode = 'play';
    $('menu').classList.remove('on');
    $('mapview').classList.remove('on');
    $('pauseview').classList.remove('on');
    $('hud').classList.add('on');
    return {
      pose(t) {
        const hx = hero.x, hz = hero.z;
        // Three-quarter rear view: the hero car's red-orange flank reads,
        // the roadblock blast stays ahead, the heli sits upper-right.
        return {
          pos: new THREE.Vector3(hx - 2.2, 2.6, hz + 7.6),
          look: new THREE.Vector3(hx, 1.4, hz - 14),
          fov: 62,
        };
      },
    };
  }
  if (name === 'foot') {
    // On foot, a theft in progress next to the Coral Comet RS.
    setJob(world, 0, 1, 287);
    s.wanted = 0; s.heat = 0; s.money = 1250; s.respect = 24;
    s.clockMin = 18 * 60 + 31;
    hero.x = 96; hero.z = 118; hero.heading = Math.PI * 0.5; hero.condition = 100;
    hero.mesh.group.position.set(hero.x, 0, hero.z);
    hero.mesh.group.rotation.y = hero.heading;
    world.player.x = 93.5; world.player.z = 120; world.player.heading = Math.PI * 0.42;
    world.player.onFoot = true; world.player.vehicle = null;
    world.player.group.visible = true;
    world.player.group.position.set(world.player.x, 0, world.player.z);
    world.player.group.rotation.y = world.player.heading;
    s.mode = 'play';
    $('menu').classList.remove('on');
    $('mapview').classList.remove('on');
    $('pauseview').classList.remove('on');
    $('hud').classList.add('on');
    return {
      pose(t) {
        return {
          pos: new THREE.Vector3(89.5, 2.4, 126.5),
          look: new THREE.Vector3(96.5, 1.4, 117),
          fov: 55,
        };
      },
      prompt: 'E — STEAL THE CORAL COMET RS',
    };
  }
  if (name === 'map') {
    setJob(world, 3, 1, 241);
    s.wanted = 2; s.heat = 2; s.money = 6420; s.respect = 48;
    s.clockMin = 19 * 60 + 5;
    placeCruiser(world, 0, 48, -30, 0);
    placeCruiser(world, 1, 0, 90, Math.PI);
    hero.x = 132; hero.z = 40; hero.heading = Math.PI;
    hero.mesh.group.position.set(hero.x, 0, hero.z);
    hero.mesh.group.rotation.y = hero.heading;
    world.player.x = hero.x; world.player.z = hero.z; world.player.heading = hero.heading;
    s.mode = 'map';
    $('menu').classList.remove('on');
    $('pauseview').classList.remove('on');
    $('hud').classList.remove('on');
    $('mapview').classList.add('on');
    return {
      pose(t) {
        return {
          pos: new THREE.Vector3(60, 120, 120),
          look: new THREE.Vector3(60, 0, 0),
          fov: 50,
        };
      },
    };
  }
  // menu — the title screen over the sunset city.
  setJob(world, 0, 0, 300);
  s.wanted = 0; s.heat = 0; s.money = 1250; s.respect = 24;
  hero.x = 128; hero.z = 10; hero.heading = Math.PI;
  hero.mesh.group.position.set(hero.x, 0, hero.z);
  hero.mesh.group.rotation.y = hero.heading;
  world.player.x = 128; world.player.z = 14;
  s.mode = 'menu';
  $('mapview').classList.remove('on');
  $('pauseview').classList.remove('on');
  $('hud').classList.remove('on');
  $('menu').classList.add('on');
  return {
    pose(t) {
      const a = 0.35 + t * 0.02;
      return {
        pos: new THREE.Vector3(118 + Math.sin(a) * 26, 9 + Math.sin(t * 0.1) * 1.5, 60 + Math.cos(a) * 26),
        look: new THREE.Vector3(140, 4, -20),
        fov: 55,
      };
    },
  };
}
