// Verde Cay's living world: the player on foot, in a car or in the speedboat,
// traffic, pedestrians, VCPD police who answer the wanted level, eight story
// missions, combat, and saving. All the numbers come from config.js.
import * as THREE from 'three';
import { CITY, CAR, BOAT, PLAYER, MISSIONS, GARAGE_CARS, SAVE_KEY } from './config.js';
import { makeCarMesh, makeBoatMesh, makeHeliMesh, makePedMesh, makePlayerMesh, makeMarkerMesh } from './vehicles.js';

const POLICE_NAMES = ['VCPD-11', 'VCPD-25', 'VCPD-38', 'VCPD-42', 'VCPD-57', 'VCPD-63', 'VCPD-71', 'VCPD-88', 'Marine-3', 'Marine-7', 'Air-1', 'Air-2'];
const TACTICS = ['RAMMING', 'PURSUIT', 'FLANKING', 'SPOTLIGHT', 'ROADBLOCK', 'FIRING', 'RESPONDING', 'CLOSING IN'];
const PED_COLORS = [0xf2e6b8, 0x9fc5e8, 0xe88ca0, 0x8fd0a0, 0xd9b48a, 0xc9a0dc];
const TRAFFIC_COLORS = [0x3a7bd5, 0xf2b705, 0x8a8f98, 0x2fae6e, 0xffffff, 0x222831, 0xd96a2b];

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function dist2(ax, az, bx, bz) { const dx = ax - bx, dz = az - bz; return Math.sqrt(dx * dx + dz * dz); }
function angleTo(ax, az, bx, bz) { return Math.atan2(bx - ax, bz - az); }

export function createWorld(rng, scene, city, audio) {
  const state = {
    mode: 'foot',
    screen: 'title',
    time: 18.67,
    day: 9,
    money: 21780,
    respect: 165,
    respectMax: 500,
    respectRank: 'Dock Hand',
    health: 100,
    armour: 55,
    wanted: 0,
    missionIndex: 0,
    stageIndex: 0,
    weapon: 1,
    carName: 'Coral Comet RS',
    carCondition: 100,
    speedKmh: 0,
    boatSpeedKn: 0,
    missionTime: 0,
    heatTimer: 0,
    paused: false,
    over: false,
    won: false,
    radio: 0,
    shotsFired: 0,
    carsStolen: 0,
    crew: ['Ana', 'Marco', 'Rosa'],
    garage: GARAGE_CARS.map((c) => c.name),
    dropsCollected: 0,
    message: '',
    messageTimer: 0,
    cameraYaw: Math.PI,
    cameraPitch: 0.32,
  };

  const playerMesh = makePlayerMesh();
  scene.add(playerMesh);
  const carMesh = makeCarMesh(0xe8481f, false);
  scene.add(carMesh);
  const boatMesh = makeBoatMesh();
  boatMesh.position.set(0, 0.4, 252);
  scene.add(boatMesh);
  const heliMesh = makeHeliMesh();
  heliMesh.visible = false;
  scene.add(heliMesh);
  // Two VCPD marine boats for the boat escape — white hulls so they read
  // against the teal water, hidden until the player is on the water.
  const marineBoats = [];
  for (let i = 0; i < 2; i += 1) {
    const mb = makeBoatMesh(0xeef2f4);
    mb.visible = false;
    scene.add(mb);
    marineBoats.push({ mesh: mb, x: 0, z: 0, heading: 0, name: i === 0 ? 'Marine-3' : 'Marine-7' });
  }
  const marker = makeMarkerMesh();
  scene.add(marker);

  const player = { x: -8, z: 108, heading: Math.PI, speed: 0, walkPhase: 0 };
  const car = { x: -180, z: 100, heading: 0.4, speed: 0, condition: 100, name: 'Coral Comet RS', color: 0xe8481f, parked: true };
  const boat = { x: 0, z: 252, heading: Math.PI, speed: 0, boarded: false };
  const heli = { x: 40, z: 60, y: 55, heading: 0 };

  const traffic = [];
  for (let i = 0; i < 14; i += 1) {
    const mesh = makeCarMesh(rng.pick(TRAFFIC_COLORS), false);
    scene.add(mesh);
    const horizontal = rng.chance(0.5);
    traffic.push({
      mesh,
      x: rng.range(-280, 280), z: horizontal ? rng.pick([-256, -192, -128, -64, 0, 64, 128]) : rng.range(-280, 120),
      heading: horizontal ? (rng.chance(0.5) ? Math.PI / 2 : -Math.PI / 2) : (rng.chance(0.5) ? 0 : Math.PI),
      speed: rng.range(9, 16), horizontal,
      road: horizontal ? rng.pick([-256, -192, -128, -64, 0, 64, 128]) : rng.pick([-256, -192, -128, -64, 0, 64, 128, 192, 256]),
    });
  }
  const peds = [];
  for (let i = 0; i < 18; i += 1) {
    const mesh = makePedMesh(rng.pick(PED_COLORS), rng);
    scene.add(mesh);
    peds.push({
      mesh, x: rng.range(-280, 280), z: rng.range(-280, 140),
      heading: rng.range(0, Math.PI * 2), speed: rng.range(1.2, 2.4), phase: rng.range(0, 6),
      targetX: rng.range(-280, 280), targetZ: rng.range(-280, 140),
    });
  }
  const police = [];
  function spawnPolice(count) {
    while (police.length < count) {
      const mesh = makeCarMesh(0x1a2f4a, true);
      scene.add(mesh);
      const idx = police.length;
      police.push({
        mesh, name: POLICE_NAMES[idx % POLICE_NAMES.length],
        x: player.x + rng.range(-90, 90), z: player.z + rng.range(-90, 90),
        heading: 0, speed: 0, health: 60, tactic: TACTICS[idx % TACTICS.length],
      });
    }
    while (police.length > count) {
      const p = police.pop();
      scene.remove(p.mesh);
    }
  }
  const rival = { mesh: makeCarMesh(0xf2b705, false), x: 120, z: -64, heading: 0, speed: 0, health: 100, active: false };
  scene.add(rival.mesh);
  const van = { mesh: makeCarMesh(0x8a8f98, false), x: 60, z: 120, heading: Math.PI / 2, speed: 0, health: 100, active: false, stopped: false };
  van.mesh.scale.set(1.15, 1.15, 1.3);
  scene.add(van.mesh);
  const drops = [
    { x: 200, z: -200, taken: false, mesh: null },
    { x: -260, z: -180, taken: false, mesh: null },
    { x: 120, z: 60, taken: false, mesh: null },
  ];
  for (const d of drops) {
    const m = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.8, 1.2), new THREE.MeshStandardMaterial({ color: 0x2fae6e, emissive: 0x1a7a3a, emissiveIntensity: 0.8 }));
    m.position.set(d.x, 0.8, d.z);
    scene.add(m);
    d.mesh = m;
  }
  const marco = { mesh: makePedMesh(0x3a7bd5, rng), x: 260, z: 100, freed: false };
  scene.add(marco.mesh);
  marco.mesh.visible = false;

  function missionTarget() {
    const m = MISSIONS[state.missionIndex];
    const s = state.stageIndex;
    switch (m.id) {
      case 1: return s === 0 ? { x: -180, z: 100, label: 'the Comet' } : { x: -240, z: -40, label: 'Rosa\u2019s garage' };
      case 2: return s === 0 ? { x: -192, z: 96, label: 'Solmar Casino' } : s === 1 ? { x: 0, z: 132, label: 'the boulevard' } : { x: -192, z: 96, label: 'the valet bay' };
      case 3: { const d = drops[state.dropsCollected]; return d ? { x: d.x, z: d.z, label: 'cash drop' } : { x: 0, z: 0, label: 'home' }; }
      case 4: return s === 0 ? { x: 0, z: -64, label: 'the roadblock' } : { x: 240, z: -240, label: 'the safe house' };
      case 5: return { x: rival.x, z: rival.z, label: 'the rival GT' };
      case 6: return s === 0 ? { x: van.x, z: van.z, label: 'the bank van' } : { x: 40, z: 140, label: 'the pier warehouse' };
      case 7: return s === 0 ? { x: 260, z: 100, label: 'the impound yard' } : { x: 0, z: 0, label: 'downtown' };
      case 8: return s === 0 ? { x: 0, z: 150, label: 'the pier' } : s === 1 ? { x: 0, z: 252, label: 'La Marea' } : { x: 0, z: 430, label: 'open water' };
      default: return { x: 0, z: 0, label: 'Verde Cay' };
    }
  }
  function setWanted(n) { state.wanted = clamp(n, 0, 5); spawnPolice(state.wanted >= 4 ? 6 : state.wanted * 2); heliMesh.visible = state.wanted >= 3; }

  function startMission(index) {
    state.missionIndex = index;
    state.stageIndex = 0;
    state.missionTime = 0;
    state.dropsCollected = 0;
    const m = MISSIONS[index];
    state.message = `${m.title} — ${m.brief}`;
    state.messageTimer = 6;
    if (index === 1) setWanted(2);
    if (index === 2) setWanted(1);
    if (index === 3) setWanted(3);
    if (index === 4) { setWanted(2); rival.active = true; }
    if (index === 5) { setWanted(3); van.active = true; }
    if (index === 6) { setWanted(2); marco.mesh.visible = true; }
    if (index === 7) setWanted(4);
  }

  function completeMission() {
    const m = MISSIONS[state.missionIndex];
    state.money += m.reward;
    state.respect += m.respect;
    state.respectRank = state.respect >= 400 ? 'Shot Caller' : state.respect >= 250 ? 'Fixer' : state.respect >= 120 ? 'Street Boss' : 'Dock Hand';
    audio.missionDone();
    state.message = `Job done: ${m.title} — +$${m.reward.toLocaleString()}  +${m.respect} respect`;
    state.messageTimer = 5;
    save();
    if (state.missionIndex >= MISSIONS.length - 1) {
      state.won = true;
      state.screen = 'won';
      return;
    }
    startMission(state.missionIndex + 1);
  }
  function advanceStage() {
    state.stageIndex += 1;
    const m = MISSIONS[state.missionIndex];
    if (state.stageIndex >= m.stages.length) { completeMission(); return; }
    audio.pickup();
    state.message = m.stages[state.stageIndex];
    state.messageTimer = 4;
  }

  function save() {
    try {
      window.localStorage.setItem(SAVE_KEY, JSON.stringify({
        money: state.money, respect: state.respect, missionIndex: state.missionIndex,
        garage: state.garage, crew: state.crew, day: state.day,
      }));
    } catch { /* storage off: the save lasts this visit only */ }
  }
  function load() {
    try {
      const raw = window.localStorage.getItem(SAVE_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      state.money = data.money ?? state.money;
      state.respect = data.respect ?? state.respect;
      state.missionIndex = data.missionIndex ?? 0;
      state.garage = data.garage ?? state.garage;
      state.crew = data.crew ?? state.crew;
      return true;
    } catch { return false; }
  }

  function fireWeapon() {
    if (state.mode !== 'foot' || state.weapon === 0) return;
    state.shotsFired += 1;
    audio.shot();
    const range = state.weapon === 2 ? 45 : 32;
    let best = null; let bestD = range;
    for (const p of police) {
      const d = dist2(player.x, player.z, p.x, p.z);
      if (d < bestD) { best = p; bestD = d; }
    }
    if (best) {
      best.health -= state.weapon === 2 ? 34 : 20;
      if (best.health <= 0) {
        best.health = 60;
        best.x = player.x + 120; best.z = player.z + 120;
        state.money += 150;
      }
      if (state.wanted < 2) setWanted(2);
    }
  }

  function collideBuildings(x, z, radius) {
    for (const c of city.colliders) {
      if (Math.abs(x - c.x) < c.hw + radius && Math.abs(z - c.z) < c.hd + radius) return true;
    }
    return false;
  }

  function update(dt, input) {
    state.time += dt / 240;
    if (state.time >= 24) { state.time -= 24; state.day += 1; }
    state.missionTime += dt;
    if (state.messageTimer > 0) state.messageTimer -= dt;
    if (state.wanted > 0 && state.missionIndex !== 1) {
      state.heatTimer += dt;
      if (state.heatTimer > 45) { setWanted(state.wanted - 1); state.heatTimer = 0; }
    }
    const fwd = input.forward();
    const str = input.strafe();
    const drag = input.consumeDrag();
    if (drag.x !== 0) state.cameraYaw -= drag.x * 0.005;
    if (drag.y !== 0) state.cameraPitch = clamp(state.cameraPitch + drag.y * 0.003, 0.12, 0.9);
    if (input.consume('enter')) enterExitVehicle();
    if (input.consume('fire')) fireWeapon();
    const slot = input.weaponSlot();
    if (slot >= 0) state.weapon = slot;
    if (input.consume('radio')) { state.radio = audio.nextStation(); }
    if (state.mode === 'foot') updateFoot(dt, fwd, str, input);
    else if (state.mode === 'car') updateCar(dt, fwd, str, input);
    else updateBoat(dt, fwd, str);
    updateTraffic(dt);
    updatePeds(dt);
    updatePolice(dt);
    updateMission(dt);
    updateMeshes(dt);
    audio.setEngine(state.mode === 'car' ? Math.abs(car.speed) / CAR.maxSpeed : state.mode === 'boat' ? boat.speed / BOAT.maxSpeed : 0, state.mode === 'boat');
    audio.setSiren(state.wanted >= 2, performance.now() / 1000);
  }

  function updateFoot(dt, fwd, str, input) {
    const run = input.isHeld('ShiftLeft') || input.isHeld('ShiftRight');
    const speed = run ? PLAYER.runSpeed : PLAYER.walkSpeed;
    const yaw = state.cameraYaw;
    const mx = Math.sin(yaw) * fwd + Math.cos(yaw) * str;
    const mz = Math.cos(yaw) * fwd - Math.sin(yaw) * str;
    const len = Math.hypot(mx, mz);
    if (len > 0.01) {
      const nx = player.x + (mx / len) * speed * dt;
      const nz = player.z + (mz / len) * speed * dt;
      if (!collideBuildings(nx, player.z, 0.6)) player.x = nx;
      if (!collideBuildings(player.x, nz, 0.6)) player.z = nz;
      player.heading = Math.atan2(mx, mz);
      player.walkPhase += dt * speed * 1.4;
    }
    player.x = clamp(player.x, -315, 315);
    player.z = clamp(player.z, -315, 148);
    state.speedKmh = len > 0.01 ? Math.round(speed * 3.6) : 0;
  }

  function updateCar(dt, fwd, str, input) {
    const braking = input.isHeld('Space');
    if (fwd > 0) car.speed += CAR.accel * dt;
    else if (fwd < 0) car.speed -= (car.speed > 0.5 ? CAR.brake : CAR.reverse) * dt;
    else car.speed -= Math.sign(car.speed) * 8 * dt;
    if (braking) car.speed -= Math.sign(car.speed) * CAR.brake * dt;
    car.speed = clamp(car.speed, -CAR.maxReverse, CAR.maxSpeed);
    if (Math.abs(car.speed) < 0.2 && fwd === 0) car.speed = 0;
    car.heading += str * CAR.turn * dt * clamp(Math.abs(car.speed) / 10, 0, 1) * (car.speed >= 0 ? 1 : -1);
    const nx = car.x + Math.sin(car.heading) * car.speed * dt;
    const nz = car.z + Math.cos(car.heading) * car.speed * dt;
    if (collideBuildings(nx, nz, 2.2)) {
      car.speed *= -0.25;
      car.condition = Math.max(0, car.condition - 2);
      audio.crash();
    } else {
      car.x = clamp(nx, -315, 315);
      car.z = clamp(nz, -315, 149);
    }
    state.speedKmh = Math.round(Math.abs(car.speed) * 3.6);
    state.carCondition = Math.round(car.condition);
    player.x = car.x; player.z = car.z; player.heading = car.heading;
  }

  function updateBoat(dt, fwd, str) {
    if (fwd > 0) boat.speed += BOAT.accel * dt;
    else if (fwd < 0) boat.speed -= BOAT.accel * 0.6 * dt;
    else boat.speed -= Math.sign(boat.speed) * 4 * dt;
    boat.speed = clamp(boat.speed, -6, BOAT.maxSpeed);
    boat.heading += str * BOAT.turn * dt * clamp(Math.abs(boat.speed) / 8, 0, 1);
    boat.x += Math.sin(boat.heading) * boat.speed * dt;
    boat.z += Math.cos(boat.heading) * boat.speed * dt;
    boat.x = clamp(boat.x, -320, 320);
    boat.z = clamp(boat.z, 150, 470);
    state.boatSpeedKn = Math.round(Math.abs(boat.speed) * 1.94);
    state.speedKmh = state.boatSpeedKn;
    player.x = boat.x; player.z = boat.z; player.heading = boat.heading;
  }

  function enterExitVehicle() {
    if (state.mode === 'foot') {
      const dc = dist2(player.x, player.z, car.x, car.z);
      const db = dist2(player.x, player.z, boat.x, boat.z);
      if (dc < 5 && car.condition > 0) {
        state.mode = 'car';
        state.carsStolen += 1;
        if (car.parked) { car.parked = false; state.message = 'Coral Comet RS — yours now.'; state.messageTimer = 3; }
        audio.unlock();
      } else if (db < 6 && state.missionIndex === 7) {
        state.mode = 'boat';
        boat.boarded = true;
        audio.splash();
        state.message = 'La Marea — full throttle to open water!';
        state.messageTimer = 4;
        if (state.stageIndex === 1) advanceStage();
      }
    } else if (state.mode === 'car') {
      state.mode = 'foot';
      player.x = car.x + Math.sin(car.heading + Math.PI / 2) * 3;
      player.z = car.z + Math.cos(car.heading + Math.PI / 2) * 3;
    } else if (state.mode === 'boat') {
      state.mode = 'foot';
      player.x = boat.x; player.z = Math.max(148, boat.z - 4);
    }
  }

  function updateTraffic(dt) {
    for (const t of traffic) {
      if (t.horizontal) {
        t.x += Math.sin(t.heading) * 12 * dt;
        if (t.x > 310) t.x = -310;
        if (t.x < -310) t.x = 310;
        t.z = t.road;
      } else {
        t.z += Math.cos(t.heading) * 12 * dt;
        if (t.z > 140) t.z = -310;
        if (t.z < -310) t.z = 140;
        t.x = t.road;
      }
      t.mesh.position.set(t.x, 0, t.z);
      t.mesh.rotation.y = t.heading;
    }
  }

  function updatePeds(dt) {
    for (const p of peds) {
      const d = dist2(p.x, p.z, p.targetX, p.targetZ);
      if (d < 3) {
        p.targetX = rng.range(-280, 280);
        p.targetZ = rng.range(-280, 140);
      }
      const h = angleTo(p.x, p.z, p.targetX, p.targetZ);
      p.heading = h;
      p.x += Math.sin(h) * p.speed * dt;
      p.z += Math.cos(h) * p.speed * dt;
      p.phase += dt * 6;
      p.mesh.position.set(p.x, 0, p.z);
      p.mesh.rotation.y = h;
      const swing = Math.sin(p.phase) * 0.5;
      p.mesh.userData.legs[0].rotation.x = swing;
      p.mesh.userData.legs[1].rotation.x = -swing;
    }
  }

  function updatePolice(dt) {
    // On land the cruisers chase the player; once the player is on the water
    // they can only race to the pier head and watch — the helicopter keeps up.
    const targetX = state.mode === 'boat' ? clamp(player.x, -60, 60) : player.x;
    const targetZ = state.mode === 'boat' ? 146 : player.z;
    for (const p of police) {
      const d = dist2(p.x, p.z, targetX, targetZ);
      const h = angleTo(p.x, p.z, targetX, targetZ);
      let turn = h - p.heading;
      while (turn > Math.PI) turn -= Math.PI * 2;
      while (turn < -Math.PI) turn += Math.PI * 2;
      p.heading += clamp(turn, -2.2 * dt, 2.2 * dt);
      const speed = state.mode === 'boat' ? 26 : 24;
      p.speed = d > 8 ? speed : speed * 0.5;
      p.x += Math.sin(p.heading) * p.speed * dt;
      p.z += Math.cos(p.heading) * p.speed * dt;
      p.x = clamp(p.x, -315, 315);
      p.z = clamp(p.z, -315, 149);
      if (d < 4.5 && state.mode !== 'boat') {
        if (state.armour > 0) state.armour = Math.max(0, state.armour - 12 * dt);
        else state.health = Math.max(0, state.health - 10 * dt);
        if (state.health <= 0) { state.over = true; state.screen = 'over'; }
      }
      p.mesh.position.set(p.x, 0, p.z);
      p.mesh.rotation.y = p.heading;
    }
    if (heliMesh.visible) {
      heli.heading += dt * 0.4;
      const hx = player.x + Math.sin(heli.heading) * 26;
      const hz = player.z + Math.cos(heli.heading) * 26;
      heli.x += (hx - heli.x) * dt * 0.8;
      heli.z += (hz - heli.z) * dt * 0.8;
      heliMesh.position.set(heli.x, 52 + Math.sin(performance.now() / 700) * 2, heli.z);
      heliMesh.rotation.y = Math.atan2(player.x - heli.x, player.z - heli.z);
      heliMesh.userData.rotor.rotation.y += dt * 30;
      heliMesh.userData.spot.target.position.set(player.x, 0, player.z);
      heliMesh.userData.spot.target.updateMatrixWorld();
    }
    // Marine boats only chase on the water, flanking La Marea.
    const marineOn = state.mode === 'boat';
    for (const mb of marineBoats) {
      mb.mesh.visible = marineOn;
      if (!marineOn) continue;
      const h = angleTo(mb.x, mb.z, player.x, player.z);
      let turn = h - mb.heading;
      while (turn > Math.PI) turn -= Math.PI * 2;
      while (turn < -Math.PI) turn += Math.PI * 2;
      mb.heading += clamp(turn, -2 * dt, 2 * dt);
      const d = dist2(mb.x, mb.z, player.x, player.z);
      const speed = d > 20 ? 28 : 20;
      mb.x += Math.sin(mb.heading) * speed * dt;
      mb.z += Math.cos(mb.heading) * speed * dt;
      mb.mesh.position.set(mb.x, 0.4, mb.z);
      mb.mesh.rotation.y = mb.heading;
    }
    if (rival.active) {
      rival.heading = Math.sin(performance.now() / 9000) * 0.6 + Math.PI / 2;
      rival.x += Math.sin(rival.heading) * 18 * dt;
      rival.z = -64 + Math.sin(performance.now() / 4000) * 8;
      rival.mesh.position.set(rival.x, 0, rival.z);
      rival.mesh.rotation.y = rival.heading;
      if (state.mode === 'car' && dist2(car.x, car.z, rival.x, rival.z) < 5) {
        rival.health -= 40 * dt;
        car.condition = Math.max(0, car.condition - 6 * dt);
        if (rival.health <= 0) { rival.active = false; rival.mesh.visible = false; advanceStage(); }
      }
    }
    if (van.active && !van.stopped) {
      van.x += Math.sin(van.heading) * 6 * dt;
      van.mesh.position.set(van.x, 0, van.z);
      van.mesh.rotation.y = van.heading;
      if (state.mode === 'car' && dist2(car.x, car.z, van.x, van.z) < 6) {
        van.stopped = true;
        state.message = 'Van stopped. Take it to the pier warehouse.';
        state.messageTimer = 4;
        advanceStage();
      }
    }
  }

  function updateMission(dt) {
    const m = MISSIONS[state.missionIndex];
    const target = missionTarget();
    const d = dist2(player.x, player.z, target.x, target.z);
    marker.position.set(target.x, 0, target.z);
    marker.userData.diamond.rotation.y += dt * 2;
    marker.userData.diamond.position.y = 4 + Math.sin(performance.now() / 300) * 0.5;
    marker.visible = state.screen === 'play';
    switch (m.id) {
      case 1:
        if (state.stageIndex === 0 && d < 6 && state.mode === 'foot') advanceStage();
        else if (state.stageIndex === 1 && d < 8 && state.mode === 'car') advanceStage();
        break;
      case 2:
        if (state.stageIndex === 0 && d < 8 && state.mode === 'car') advanceStage();
        else if (state.stageIndex === 1 && state.wanted === 0) advanceStage();
        else if (state.stageIndex === 2 && d < 8 && state.mode === 'car') advanceStage();
        break;
      case 3:
        for (const drop of drops) {
          if (!drop.taken && dist2(player.x, player.z, drop.x, drop.z) < 5) {
            drop.taken = true;
            drop.mesh.visible = false;
            state.dropsCollected += 1;
            state.money += 1200;
            audio.pickup();
            if (state.dropsCollected >= 3) completeMission();
            else advanceStage();
          }
        }
        break;
      case 4:
        if (state.stageIndex === 0 && d < 30) {
          for (const p of police) {
            if (state.mode === 'car' && dist2(car.x, car.z, p.x, p.z) < 5) p.health -= 30 * dt;
          }
          if (police.length > 0 && police.every((p) => p.health <= 20)) advanceStage();
        } else if (state.stageIndex === 1 && d < 10) advanceStage();
        break;
      case 6:
        if (state.stageIndex === 1 && d < 10) advanceStage();
        else if (state.stageIndex === 2 && state.wanted === 0) advanceStage();
        break;
      case 7:
        if (state.stageIndex === 0 && d < 6) { marco.freed = true; advanceStage(); }
        else if (state.stageIndex === 1 && state.mode === 'car') advanceStage();
        break;
      case 8:
        if (state.stageIndex === 0 && d < 8) advanceStage();
        else if (state.stageIndex === 1 && state.mode === 'boat') advanceStage();
        else if (state.stageIndex === 2 && boat.z > CITY.waterZ) completeMission();
        break;
      default:
        break;
    }
  }

  function updateMeshes(dt) {
    playerMesh.visible = state.mode === 'foot';
    playerMesh.position.set(player.x, 0, player.z);
    playerMesh.rotation.y = player.heading;
    const swing = Math.sin(player.walkPhase) * 0.5;
    playerMesh.userData.legs[0].rotation.x = swing;
    playerMesh.userData.legs[1].rotation.x = -swing;
    carMesh.position.set(car.x, 0, car.z);
    carMesh.rotation.y = car.heading;
    boatMesh.position.set(boat.x, 0.4 + Math.sin(performance.now() / 500) * 0.12, boat.z);
    boatMesh.rotation.y = boat.heading;
    boatMesh.rotation.z = Math.sin(performance.now() / 600) * 0.03;
    // Wake grows and fades with boat speed; marine boats get the same treatment.
    const wakeScale = state.mode === 'boat' ? Math.min(1, Math.abs(boat.speed) / 20) : 0;
    boatMesh.userData.wakeMat.opacity = wakeScale * 0.22;
    boatMesh.userData.wake.scale.set(1 + wakeScale * 0.3, 1 + wakeScale * 0.4, 1);
    for (const mb of marineBoats) {
      if (mb.mesh.visible && mb.mesh.userData.wakeMat) mb.mesh.userData.wakeMat.opacity = 0.35;
    }
    if (heliMesh.visible && heliMesh.userData.tailRotor) heliMesh.userData.tailRotor.rotation.z += dt * 40;
    for (const p of peds) {
      if (p.mesh.userData.arms) {
        const swing = Math.sin(p.phase) * 0.4;
        p.mesh.userData.arms[0].rotation.x = -swing;
        p.mesh.userData.arms[1].rotation.x = swing;
      }
    }
    for (const drop of drops) {
      if (drop.mesh.visible) drop.mesh.rotation.y += dt;
    }
  }

  function stageCover() {
    state.screen = 'play';
    state.missionIndex = 7;
    state.stageIndex = 2;
    state.mode = 'boat';
    boat.x = 6; boat.z = 268; boat.heading = 0; boat.speed = 26; boat.boarded = true;
    player.x = boat.x; player.z = boat.z; player.heading = boat.heading;
    car.x = 0; car.z = 146; car.heading = Math.PI;
    setWanted(4);
    for (let i = 0; i < police.length; i += 1) {
      const p = police[i];
      // The cruisers have just raced to the pier head and stopped at the water.
      p.x = [-24, -8, 8, 24, -16, 16][i % 6];
      p.z = [140, 146, 142, 147, 135, 138][i % 6];
      p.heading = 0;
      p.mesh.position.set(p.x, 0, p.z);
    }
    heli.x = 30; heli.z = 230;
    heliMesh.visible = true;
    heliMesh.position.set(heli.x, 52, heli.z);
    state.missionTime = 107;
    state.money = 91400;
    state.health = 76; state.armour = 58;
    state.respect = 320;
    state.carCondition = 84;
    state.boatSpeedKn = 42;
    state.speedKmh = 42;
    // The camera sits south of the boat looking back north, three-quarter:
    // La Marea in front, the pier, the VCPD cruisers and the city behind her.
    state.cameraYaw = Math.PI + 0.38;
    state.cameraPitch = 0.28;
    state.message = 'Reach open water — lose the VCPD marine units!';
    state.messageTimer = 6;
  }
  function stageFoot() {
    state.screen = 'play';
    state.missionIndex = 0;
    state.stageIndex = 0;
    state.mode = 'foot';
    player.x = -168; player.z = 112; player.heading = 0.6;
    car.x = -160; car.z = 122; car.heading = 0.6;
    // Hide the toast for this shot so the hero car reads in the centre frame.
    state.message = '';
    state.messageTimer = 0;
    // Put the hero car and two traffic cars in frame on the boulevard.
    traffic[0].x = -138; traffic[0].z = 132; traffic[0].road = 132; traffic[0].horizontal = true; traffic[0].heading = Math.PI / 2;
    traffic[1].x = -196; traffic[1].z = 132; traffic[1].road = 132; traffic[1].horizontal = true; traffic[1].heading = -Math.PI / 2;
    setWanted(0);
    state.money = 21780;
    state.health = 100; state.armour = 55;
    state.cameraYaw = 0.6;
    state.cameraPitch = 0.3;
  }
  function stageMap() {
    state.screen = 'map';
    state.missionIndex = 4;
    state.stageIndex = 0;
    state.money = 38250;
    state.respect = 240;
  }
  function stageMenu() {
    state.screen = 'title';
    state.missionIndex = 0;
    state.money = 21780;
  }

  // After the screenshot sim runs, put the helicopter and the marine boats back
  // into the frame — the sim's chase logic pulls them out of view otherwise.
  function restageShot(name) {
    if (name !== 'cover') return;
    // Helicopter low and close on the boat's starboard side, marine boats
    // flanking close in, so the chase reads in one cinematic frame.
    heli.x = boat.x + 14; heli.z = boat.z - 22;
    heliMesh.position.set(heli.x, 15, heli.z);
    heliMesh.scale.setScalar(1.3);
    heliMesh.rotation.y = Math.atan2(player.x - heli.x, player.z - heli.z);
    marineBoats[0].x = boat.x - 11; marineBoats[0].z = boat.z - 14; marineBoats[0].heading = 0;
    marineBoats[1].x = boat.x + 12; marineBoats[1].z = boat.z - 18; marineBoats[1].heading = 0;
    for (const mb of marineBoats) {
      mb.mesh.visible = true;
      mb.mesh.position.set(mb.x, 0.4, mb.z);
      mb.mesh.rotation.y = 0;
    }
  }

  startMission(0);
  return {
    state, player, car, boat, heli, traffic, peds, police, rival, van, drops, marco, scene, marineBoats,
    cityBuildings: city.buildings,
    update, startMission, completeMission, advanceStage, setWanted, save, load,
    missionTarget, stageCover, stageFoot, stageMap, stageMenu, fireWeapon, restageShot,
  };
}
