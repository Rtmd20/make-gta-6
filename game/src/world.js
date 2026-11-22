// Verde Cay — game state and rules: the player on foot and in vehicles, the
// eight story jobs, the wanted level and the VCPD response, combat, and saves.
import * as THREE from 'three';
import { JOBS, HERO_CAR, SAVE_KEY, defaultSave, WORLD, CREW } from './config.js';
import { makeCarMesh, makeBoatMesh, makeHeliMesh, makePersonMesh, createTraffic, createPedestrians, updateTraffic, updatePedestrians } from './vehicles.js';
import { makeExplosion, tickExplosion } from './city.js';
import { playShot, playChime, setEngine, setSiren } from './audio.js';
import * as input from './input.js';

const KNOTS = 0.539957;

export function createWorld(scene, city) {
  const save = loadSave();
  const state = {
    mode: 'menu', // menu | play | map | pause
    money: save.money, respect: save.respect,
    health: save.health, armour: save.armour,
    jobIndex: save.jobIndex, stageIndex: 0,
    jobTimer: 300, wanted: 0, heat: 0,
    weapon: 1, clockMin: 18 * 60 + 42,
    garage: save.garage.slice(),
    toast: '', toastUntil: 0, toastSub: '',
    dialogue: JOBS[Math.min(save.jobIndex, 7)].line,
    storyDone: save.jobIndex >= JOBS.length,
    firedRecently: 0,
  };

  // --- Player ---------------------------------------------------------------
  const playerMesh = makePersonMesh(0xf97316);
  scene.add(playerMesh.group);
  const player = {
    group: playerMesh.group, x: 96, z: 132, heading: Math.PI, speed: 0,
    onFoot: true, vehicle: null, boat: false, condition: 100,
  };
  player.group.position.set(player.x, 0, player.z);

  // --- Vehicles ---------------------------------------------------------------
  const hero = makeCarMesh(HERO_CAR.colour);
  hero.group.position.set(96, 0, 120);
  hero.group.rotation.y = Math.PI;
  scene.add(hero.group);
  const heroCar = { mesh: hero, x: 96, z: 120, heading: Math.PI, speed: 0, name: HERO_CAR.name, condition: 100, isHero: true };

  const traffic = createTraffic(scene, 14);
  const peds = createPedestrians(scene, 18);

  // Player boat moored at the marina.
  const playerBoatMesh = makeBoatMesh(0x0ea5e9);
  playerBoatMesh.group.position.set(206, 0.2, 144);
  playerBoatMesh.group.rotation.y = Math.PI / 2;
  scene.add(playerBoatMesh.group);
  const playerBoat = { mesh: playerBoatMesh, x: 206, z: 144, heading: Math.PI / 2, speed: 0, name: 'Marlin 240 Speedboat', condition: 100, isBoat: true };

  // Marine police boats patrolling off the marina.
  const marine = [];
  for (let i = 0; i < 2; i++) {
    const b = makeBoatMesh(0xf5f5f0);
    b.group.position.set(220 + i * 18, 0.2, 100 + i * 60);
    scene.add(b.group);
    marine.push({ mesh: b, x: 220 + i * 18, z: 100 + i * 60, heading: Math.PI, speed: 0, patrol: 100 + i * 60 });
  }

  // Police cruiser pool (spawned by wanted level) and the helicopter.
  const cruisers = [];
  for (let i = 0; i < 4; i++) {
    const c = makeCarMesh(0x1f2937, { police: true });
    c.group.visible = false;
    scene.add(c.group);
    cruisers.push({ mesh: c, x: 0, z: 0, heading: 0, speed: 0, active: false, hp: 3, name: `VCPD-${101 + i}` });
  }
  const heli = makeHeliMesh();
  heli.group.visible = false;
  scene.add(heli.group);
  let heliActive = false;

  // Objective marker: a light pillar and a floating diamond.
  const marker = new THREE.Group();
  const pillar = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 60, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xffd23e, transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }));
  pillar.position.y = 30;
  const diamond = new THREE.Mesh(new THREE.OctahedronGeometry(1.4),
    new THREE.MeshBasicMaterial({ color: 0xffd23e }));
  diamond.position.y = 6;
  marker.add(pillar, diamond);
  scene.add(marker);

  const explosions = [];
  let saveTimer = 0;

  function loadSave() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) return { ...defaultSave(), ...JSON.parse(raw) };
    } catch (err) { /* fresh start */ }
    return defaultSave();
  }
  function persist() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        money: state.money, respect: state.respect, jobIndex: state.jobIndex,
        health: state.health, armour: state.armour, garage: state.garage,
      }));
    } catch (err) { /* storage unavailable */ }
  }

  function currentJob() { return JOBS[Math.min(state.jobIndex, JOBS.length - 1)]; }
  function currentStage() {
    const job = currentJob();
    return job.stages[Math.min(state.stageIndex, job.stages.length - 1)];
  }
  function showToast(text, sub = '', secs = 3) {
    state.toast = text; state.toastSub = sub; state.toastUntil = performance.now() / 1000 + secs;
  }
  function raiseWanted(amount) {
    state.heat = Math.min(5, state.heat + amount);
    state.wanted = Math.floor(state.heat);
  }
  function collide(px, pz, radius) {
    for (const c of city.colliders) {
      if (px > c.minX - radius && px < c.maxX + radius && pz > c.minZ - radius && pz < c.maxZ + radius) {
        const dxl = px - (c.minX - radius), dxr = (c.maxX + radius) - px;
        const dzl = pz - (c.minZ - radius), dzr = (c.maxZ + radius) - pz;
        const m = Math.min(dxl, dxr, dzl, dzr);
        if (m === dxl) px = c.minX - radius;
        else if (m === dxr) px = c.maxX + radius;
        else if (m === dzl) pz = c.minZ - radius;
        else pz = c.maxZ + radius;
        return { x: px, z: pz, hit: true };
      }
    }
    return { x: px, z: pz, hit: false };
  }

  function enterVehicle(v) {
    player.vehicle = v;
    player.onFoot = false;
    player.boat = !!v.isBoat;
    player.group.visible = false;
    if (v.trafficRef) v.trafficRef.stolen = true; // a stolen car leaves the traffic flow
    if (v.isHero) player.condition = v.condition;
    setEngine(0, true);
    if (currentStage().kind === 'steal' && v.isHero) completeStage('stolen');
    if (currentStage().kind === 'boat' && v.isBoat) completeStage('boarded');
  }
  function exitVehicle() {
    if (!player.vehicle) return;
    const v = player.vehicle;
    player.x = v.x - Math.sin(v.heading) * 2.5;
    player.z = v.z - Math.cos(v.heading) * 2.5;
    player.heading = v.heading;
    player.group.position.set(player.x, 0, player.z);
    player.group.visible = true;
    player.vehicle = null;
    player.onFoot = true;
    player.boat = false;
    setEngine(0, false);
  }

  function completeStage(how) {
    const job = currentJob();
    state.stageIndex++;
    playChime();
    if (state.stageIndex >= job.stages.length) {
      const bonus = Math.round(job.reward * 1.15);
      state.money += bonus;
      state.respect = Math.min(100, state.respect + job.respect);
      showToast(`JOB COMPLETE — ${job.name}`, `+$${bonus.toLocaleString()} · +${job.respect} RESPECT`, 4);
      state.jobIndex++;
      state.stageIndex = 0;
      state.jobTimer = 300;
      if (state.jobIndex >= JOBS.length) {
        state.storyDone = true;
        showToast('THE CREW IS FREE', 'All eight jobs done. Verde Cay is yours.', 6);
      } else {
        state.dialogue = JOBS[state.jobIndex].line;
      }
      persist();
    } else {
      showToast('STAGE CLEAR', job.stages[state.stageIndex].text, 2.5);
    }
  }

  function fireWeapon() {
    if (state.weapon === 1) return; // fists: nothing to fire
    playShot();
    state.firedRecently = 3;
    raiseWanted(0.4);
    // Simple hit test: the nearest cruiser roughly ahead of the player.
    const px = player.x, pz = player.z;
    const fx = Math.sin(player.heading), fz = Math.cos(player.heading);
    let best = null, bestD = 70;
    for (const c of cruisers) {
      if (!c.active) continue;
      const dx = c.x - px, dz = c.z - pz;
      const d = Math.hypot(dx, dz);
      const dot = (dx * fx + dz * fz) / (d || 1);
      if (d < bestD && dot > 0.86) { best = c; bestD = d; }
    }
    if (best) {
      best.hp--;
      if (best.hp <= 0) {
        best.active = false;
        best.mesh.group.visible = false;
        const ex = makeExplosion(scene, best.x, best.z);
        explosions.push(ex);
        showToast('CRUISER DOWN', 'The VCPD will send another.', 2.5);
        raiseWanted(0.6);
      }
    }
  }

  function update(dt, t) {
    const now = performance.now() / 1000;
    state.clockMin = (state.clockMin + dt * 0.5) % 1440;
    if (state.firedRecently > 0) state.firedRecently -= dt;

    updateTraffic(traffic, dt);
    updatePedestrians(peds, dt, t, { x: player.x, z: player.z }, state.wanted);
    city.updateSea(t);
    city.beaconTarget.position.set(
      Math.cos(t * 0.25) * 120, 0, Math.sin(t * 0.25) * 120);
    for (let i = explosions.length - 1; i >= 0; i--) {
      tickExplosion(explosions[i], dt);
      if (explosions[i].age > 5) {
        scene.remove(explosions[i].group);
        explosions.splice(i, 1);
      }
    }

    if (state.mode !== 'play') {
      setEngine(0, false);
      setSiren(false);
      return;
    }

    // --- Job timer ------------------------------------------------------------
    if (!state.storyDone) {
      state.jobTimer -= dt;
      if (state.jobTimer <= 0) {
        state.jobTimer = 300;
        state.stageIndex = 0;
        state.respect = Math.max(0, state.respect - 4);
        showToast('JOB FAILED — TIME UP', 'The crew covers for you. Try it again.', 3.5);
      }
    }

    // --- Wanted decay -----------------------------------------------------------
    // Kiki's lookout ability: the trail goes cold twice as fast when no unit sees you.
    const decay = (state.wanted > 0 && !anyPoliceNear()) ? dt * 0.24 : dt * 0.02;
    state.heat = Math.max(0, state.heat - decay);
    state.wanted = Math.floor(state.heat);

    // --- Movement ----------------------------------------------------------------
    const fwd = input.axis('KeyS', 'KeyW');
    const strafe = input.axis('KeyA', 'KeyD');
    if (player.onFoot) {
      const run = input.held('ShiftLeft') || input.held('ShiftRight');
      const speed = run ? 9 : 4.5;
      const mx = Math.sin(player.heading) * fwd + Math.cos(player.heading) * strafe;
      const mz = Math.cos(player.heading) * fwd - Math.sin(player.heading) * strafe;
      const len = Math.hypot(mx, mz) || 1;
      player.x += (mx / len) * speed * dt * (fwd || strafe ? 1 : 0);
      player.z += (mz / len) * speed * dt * (fwd || strafe ? 1 : 0);
      const res = collide(player.x, player.z, 0.6);
      player.x = Math.max(-228, Math.min(WORLD.seaX - 4, res.x));
      player.z = Math.max(-228, Math.min(228, res.z));
      player.group.position.set(player.x, Math.abs(Math.sin(t * 6)) * (fwd || strafe ? 0.05 : 0), player.z);
      if (fwd || strafe) player.group.rotation.y = Math.atan2(mx, mz);
      // E: enter the nearest vehicle.
      if (input.pressed('KeyE')) {
        const v = nearestVehicle(6);
        if (v) {
          enterVehicle(v);
          if (!v.isHero && !v.isBoat) { raiseWanted(1); showToast('CAR STOLEN', 'The VCPD has your description.', 2.5); }
        }
      }
    } else {
      const v = player.vehicle;
      const boost = input.held('ShiftLeft') && v.isHero ? 1.35 : 1;
      const top = (v.isBoat ? 34 : v.isHero ? HERO_CAR.topSpeed : 46) * boost;
      if (fwd > 0) v.speed = Math.min(top, v.speed + 26 * dt);
      else if (fwd < 0) v.speed = Math.max(-12, v.speed - 18 * dt);
      else v.speed *= Math.max(0, 1 - 0.9 * dt);
      if (input.held('Space')) v.speed *= Math.max(0, 1 - 3.2 * dt);
      const steer = strafe * (v.speed >= 0 ? 1 : -1);
      v.heading += steer * 1.9 * dt * Math.min(1, Math.abs(v.speed) / 12);
      const nx = v.x + Math.sin(v.heading) * v.speed * dt;
      const nz = v.z + Math.cos(v.heading) * v.speed * dt;
      if (v.isBoat) {
        v.x = Math.max(WORLD.seaX - 2, Math.min(330, nx));
        v.z = Math.max(-240, Math.min(240, nz));
      } else {
        const res = collide(nx, nz, 1.6);
        if (res.hit && Math.abs(v.speed) > 8) {
          v.condition = Math.max(0, v.condition - 4);
          state.health = Math.max(0, state.health - 2);
          v.speed *= 0.4;
        }
        v.x = Math.max(-228, Math.min(WORLD.seaX - 6, res.x));
        v.z = Math.max(-228, Math.min(228, res.z));
      }
      v.mesh.group.position.set(v.x, v.isBoat ? 0.2 + Math.sin(t * 1.4) * 0.08 : 0, v.z);
      v.mesh.group.rotation.y = v.heading;
      player.x = v.x; player.z = v.z; player.heading = v.heading;
      player.condition = v.condition;
      setEngine(Math.abs(v.speed) / top, true);
      if (input.pressed('KeyE') && Math.abs(v.speed) < 3) exitVehicle();
      if (input.pressed('KeyF')) fireWeapon();
      // Wake visibility follows boat speed.
      if (v.isBoat) v.mesh.group.userData.wakeMat.opacity = Math.min(0.6, Math.abs(v.speed) * 0.02);
    }
    if (player.onFoot && input.pressed('KeyF')) fireWeapon();

    // --- Weapon switching ---------------------------------------------------------
    if (input.pressed('Digit1')) state.weapon = 1;
    if (input.pressed('Digit2')) state.weapon = 2;
    if (input.pressed('Digit3')) state.weapon = 3;

    // --- Job stages --------------------------------------------------------------
    if (!state.storyDone) {
      const stage = currentStage();
      const d = Math.hypot(player.x - stage.x, player.z - stage.z);
      marker.position.set(stage.x, 0, stage.z);
      marker.visible = true;
      diamond.rotation.y = t * 1.5;
      diamond.position.y = 6 + Math.sin(t * 2) * 0.8;
      if (stage.kind === 'goto' && d < 8) completeStage('arrived');
      else if (stage.kind === 'chase' && d < 10) completeStage('through');
      else if (stage.kind === 'boat' && player.boat && d < 12) completeStage('sailed');
      else if (stage.kind === 'steal' && player.vehicle && player.vehicle.isHero) completeStage('stolen');
    } else {
      marker.visible = false;
    }

    // --- Police response ------------------------------------------------------------
    const want = state.wanted;
    let activeCount = 0;
    for (const c of cruisers) if (c.active) activeCount++;
    const targetCruisers = Math.min(4, want);
    if (activeCount < targetCruisers) {
      const c = cruisers.find((x) => !x.active);
      if (c) {
        const a = Math.random() * Math.PI * 2;
        c.x = player.x + Math.sin(a) * 55;
        c.z = player.z + Math.cos(a) * 55;
        c.x = Math.max(-220, Math.min(WORLD.seaX - 8, c.x));
        c.z = Math.max(-220, Math.min(220, c.z));
        c.heading = Math.atan2(player.x - c.x, player.z - c.z);
        c.speed = 0; c.hp = 3; c.active = true;
        c.mesh.group.visible = true;
      }
    }
    if (want === 0) {
      for (const c of cruisers) { c.active = false; c.mesh.group.visible = false; }
    }
    for (const c of cruisers) {
      if (!c.active) continue;
      const dx = player.x - c.x, dz = player.z - c.z;
      const d = Math.hypot(dx, dz);
      const wantHeading = Math.atan2(dx, dz);
      let diff = wantHeading - c.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      c.heading += Math.max(-2.6 * dt, Math.min(2.6 * dt, diff));
      c.speed = Math.min(40 + want * 3, c.speed + 22 * dt);
      if (d < 4.5) { // ramming the player
        c.speed *= 0.5;
        if (player.vehicle) {
          player.vehicle.condition = Math.max(0, player.vehicle.condition - 1.5);
          player.vehicle.speed *= 0.85;
        } else {
          state.health = Math.max(0, state.health - 6 * dt);
        }
      }
      c.x += Math.sin(c.heading) * c.speed * dt;
      c.z += Math.cos(c.heading) * c.speed * dt;
      const res = collide(c.x, c.z, 1.6);
      c.x = Math.max(-228, Math.min(WORLD.seaX - 6, res.x));
      c.z = Math.max(-228, Math.min(228, res.z));
      c.mesh.group.position.set(c.x, 0, c.z);
      c.mesh.group.rotation.y = c.heading;
      if (c.mesh.group.userData.lightBar) {
        const on = Math.floor(t * 6) % 2 === 0;
        c.mesh.group.userData.lightBar.red.material.color.setHex(on ? 0xff2222 : 0x551111);
        c.mesh.group.userData.lightBar.blue.material.color.setHex(on ? 0x112266 : 0x2266ff);
      }
    }
    // Helicopter at 3+ stars.
    heliActive = want >= 3;
    heli.group.visible = heliActive;
    if (heliActive) {
      heli.group.position.set(player.x + 14, 42 + Math.sin(t * 0.8) * 2, player.z - 10);
      heli.rotor.rotation.y += dt * 22;
      const dx = player.x - heli.group.position.x, dz = player.z - heli.group.position.z;
      heli.group.userData.spot.target.position.set(dx, -42, dz);
      heli.group.userData.spot.target.updateMatrixWorld();
      // The light cone hangs straight down from the heli; the spotlight itself
      // tracks the player.
    }
    // Marine boats chase a player boat; otherwise they patrol.
    for (const m of marine) {
      if (player.boat && want >= 1) {
        const dx = player.x - m.x, dz = player.z - m.z;
        const d = Math.hypot(dx, dz);
        m.heading = Math.atan2(dx, dz);
        m.speed = Math.min(30, m.speed + 16 * dt);
        m.x += Math.sin(m.heading) * m.speed * dt;
        m.z += Math.cos(m.heading) * m.speed * dt;
        m.x = Math.max(WORLD.seaX - 2, Math.min(330, m.x));
        m.z = Math.max(-240, Math.min(240, m.z));
      } else {
        m.speed = 8;
        m.z += Math.sin(t * 0.2 + m.patrol) * 0.2;
        m.x = WORLD.seaX + 55 + Math.sin(t * 0.1 + m.patrol) * 10;
        m.heading = Math.PI / 2;
      }
      m.mesh.group.position.set(m.x, 0.2 + Math.sin(t * 1.2 + m.patrol) * 0.08, m.z);
      m.mesh.group.rotation.y = m.heading;
    }
    setSiren(want >= 1);

    // --- Autosave ------------------------------------------------------------------
    saveTimer += dt;
    if (saveTimer > 10) { saveTimer = 0; persist(); }

    // --- Health ---------------------------------------------------------------------
    if (state.health <= 0) {
      state.health = 100;
      state.money = Math.max(0, state.money - 500);
      raiseWanted(-1);
      player.x = 96; player.z = 132;
      if (player.vehicle) exitVehicle();
      player.group.position.set(player.x, 0, player.z);
      showToast('BUSTED — HOSPITAL BILL', '-$500 · The crew patched you up.', 4);
    }
  }

  function anyPoliceNear() {
    for (const c of cruisers) {
      if (c.active && Math.hypot(c.x - player.x, c.z - player.z) < 45) return true;
    }
    return heli.group.visible;
  }

  function nearestVehicle(maxD) {
    const cands = [heroCar, playerBoat];
    for (const tc of traffic) cands.push({ x: tc.x, z: tc.z, mesh: tc, name: 'Street Car', condition: 80, heading: tc.group.rotation.y, speed: 0, trafficRef: tc });
    let best = null, bestD = maxD;
    for (const v of cands) {
      const d = Math.hypot(v.x - player.x, v.z - player.z);
      if (d < bestD) { best = v; bestD = d; }
    }
    if (best && best.mesh && best.mesh.group && !best.isHero && !best.isBoat && !best.mesh.group.visible) return null;
    return best;
  }

  function dispatchUnits() {
    const units = [];
    let i = 0;
    for (const c of cruisers) {
      if (!c.active) continue;
      const d = Math.hypot(c.x - player.x, c.z - player.z);
      const tac = d < 6 ? 'RAMMING' : d < 25 ? 'PURSUIT' : (i % 2 === 0 ? 'FLANKING' : 'ROADBLOCK');
      units.push({ name: c.name, dist: Math.round(d), tac });
      i++;
    }
    if (heli.group.visible) units.push({ name: 'AIR-1', dist: 42, tac: 'SPOTLIGHT' });
    if (player.boat && state.wanted >= 1) {
      units.push({ name: 'MARINE-1', dist: Math.round(Math.hypot(marine[0].x - player.x, marine[0].z - player.z)), tac: 'PURSUIT' });
      units.push({ name: 'MARINE-2', dist: Math.round(Math.hypot(marine[1].x - player.x, marine[1].z - player.z)), tac: 'FLANKING' });
    }
    if (state.firedRecently > 0 && units.length) units[0].tac = 'FIRING';
    if (!units.length) units.push({ name: 'VCPD DISPATCH', dist: 0, tac: 'ALL QUIET' });
    return units.slice(0, 6);
  }

  function speedKmh() {
    if (!player.vehicle) return 0;
    return Math.abs(player.vehicle.speed) * 3.6;
  }

  return {
    state, player, heroCar, playerBoat, traffic, peds, cruisers, marine, heli,
    update, persist, showToast, raiseWanted, completeStage, enterVehicle, exitVehicle,
    currentJob, currentStage,
    speedKmh,
    speedKnots() { return player.boat ? speedKmh() * KNOTS : speedKmh(); },
    dispatchUnits,
    vehicleName() {
      if (!player.vehicle) return 'ON FOOT';
      return player.vehicle.name;
    },
  };
}
