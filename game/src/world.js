// Verde Cay's world: the player, the cars, the VCPD, the eight jobs, the
// wanted level, combat and saves. One class owns the whole simulation; the
// renderer and the HUD only read from it.
import * as THREE from 'three';
import { CITY, JOBS, CREW, WEAPONS, WANTED, SAVE_KEY } from './config.js';
import { RNG } from './random.js';
import { makeCarMesh, makeBoatMesh, makeHeliMesh, makePedMesh, TrafficCar, Pedestrian } from './vehicles.js';

const TRAFFIC_COLORS = [0xf5f0e6, 0x2d6bff, 0xffc93c, 0x34c759, 0x8c5a7d, 0x5e7d4a, 0xb59a5e, 0x9aa4a8];

function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function angleLerp(a, b, t) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}

export class World {
  constructor(scene, city, textures, audio, hud) {
    this.scene = scene;
    this.city = city;
    this.textures = textures;
    this.audio = audio;
    this.hud = hud;
    this.rng = new RNG(4242);
    this.mode = 'menu'; // menu | play | map | pause
    this.time = 0;
    this.clockMinutes = 18 * 60 + 31;
    this.frozen = false; // shot mode: render only, no simulation

    // Player
    this.player = {
      x: CITY.spawn.x, z: CITY.spawn.z, heading: CITY.spawn.heading,
      speed: 0, onFoot: true, vehicle: null, condition: 100,
    };
    this.health = 100;
    this.armour = 60;
    this.respect = 12;
    this.money = 1250;
    this.wanted = 0;
    this.wantedTimer = 0;
    this.weaponIdx = 0;
    this.fireCooldown = 0;
    this.jobIdx = 0;
    this.stageIdx = 0;
    this.stageTimer = null;
    this.holdTimer = 0;
    this.dialogue = null;
    this.dialogueUntil = 0;
    this.prompt = '';
    this.stagedSpeedKmh = null;
    this.stagedSpeedKnots = null;
    this.vehicleName = 'ON FOOT';

    // Hero car
    this.heroCar = this.makeVehicle('hero', 0xe8452c, CITY.spawn.x, CITY.spawn.z, CITY.spawn.heading);
    this.heroCar.name = 'Coral Comet RS';
    this.scene.add(this.heroCar.mesh);

    // Traffic
    this.traffic = [];
    for (let i = 0; i < 14; i++) {
      const loop = this.city.loops[this.rng.int(0, this.city.loops.length - 1)];
      const color = TRAFFIC_COLORS[this.rng.int(0, TRAFFIC_COLORS.length - 1)];
      const mesh = makeCarMesh(color, { taxi: this.rng.chance(0.15) });
      this.scene.add(mesh);
      const car = new TrafficCar(mesh, loop, this.rng.range(7, 12), this.rng);
      car.update(0, this.rng);
      this.traffic.push({ kind: 'traffic', mesh, car, stolen: false });
    }
    // Bank van (Job 2) and jammer van (Job 6): parked, stealable
    this.bankVan = this.makeVehicle('van', 0xf5f0e6, 120, 110, Math.PI / 2);
    this.bankVan.name = 'Bank Van';
    this.scene.add(this.bankVan.mesh);
    this.jammerVan = this.makeVehicle('van', 0x3a4a5a, 90, 60, 0);
    this.jammerVan.name = 'Jammer Van';
    this.scene.add(this.jammerVan.mesh);
    // Marina boat (Job 7)
    this.marinaBoat = this.makeVehicle('boat', 0x2d6bff, 244, 148, Math.PI / 2);
    this.marinaBoat.name = 'Wave Runner';
    this.scene.add(this.marinaBoat.mesh);
    // Two marine police boats, hidden until wanted on water
    this.marineBoats = [];
    for (let i = 0; i < 2; i++) {
      const b = this.makeVehicle('boat', 0x1c2f4a, 300 + i * 20, 100 + i * 30, -Math.PI / 2);
      b.mesh.visible = false;
      this.scene.add(b.mesh);
      this.marineBoats.push(b);
    }

    // Pedestrians
    this.peds = [];
    for (let i = 0; i < 18; i++) {
      const mesh = makePedMesh(this.rng);
      this.scene.add(mesh);
      const home = {
        x: this.rng.range(-160, 160),
        z: this.rng.range(-160, 160),
      };
      this.peds.push(new Pedestrian(mesh, home, this.rng));
    }

    // Police
    this.police = [];
    this.heli = null;
    this.heliAngle = 0;

    // Player on-foot mesh
    this.playerMesh = makePedMesh(new RNG(99));
    this.playerMesh.visible = true;
    this.scene.add(this.playerMesh);

    // Explosion (Job 4 roadblock): a lumpy cluster of overlapping fireballs
    // in different orange shades around a hot bright core, with smoke puffs
    // and embers — an explosion, not one smooth dome. The lobes are spread
    // wide with a flame licking up, so the silhouette is jagged; the darker
    // edge lobes give it contrast against the bright core.
    this.explosion = new THREE.Group();
    const fireballs = [
      [2.4, 0xff7a1a, 0, 0.7, 0],
      [1.4, 0xffc93c, 0.8, 3.2, 0],
      [1.6, 0xff9d2e, -2.4, 0.9, 0.4],
      [1.3, 0xff8c2e, 2.3, 1.4, -0.4],
      [1.2, 0xe85d04, -0.5, 0.3, 1.2],
      [1.0, 0xc2410c, 1.8, 0.2, 0.8],
    ];
    for (const [r, col, x, y, z] of fireballs) {
      const ball = new THREE.Mesh(
        new THREE.SphereGeometry(r, 10, 8),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.95 }),
      );
      ball.position.set(x, y, z);
      this.explosion.add(ball);
    }
    // Hot core pushed toward the camera side so it shows on the near face.
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(1.5, 10, 8),
      new THREE.MeshBasicMaterial({ color: 0xfff6d8 }),
    );
    core.position.set(0, 0.8, 0.9);
    this.explosion.add(core);
    // Smoke column rising above the fire, not hidden behind it.
    for (let i = 0; i < 6; i++) {
      const puff = new THREE.Sprite(new THREE.SpriteMaterial({
        map: textures.smoke, transparent: true, opacity: 0.7, depthWrite: false,
      }));
      puff.position.set(this.rng.range(-2, 2), this.rng.range(3.5, 6.5), this.rng.range(-1.5, 1.5));
      puff.scale.setScalar(this.rng.range(4, 7));
      this.explosion.add(puff);
    }
    for (let i = 0; i < 3; i++) {
      const ember = new THREE.Mesh(
        new THREE.SphereGeometry(0.25, 6, 5),
        new THREE.MeshBasicMaterial({ color: 0xffe9a8 }),
      );
      ember.position.set(this.rng.range(-2.5, 2.5), this.rng.range(0.2, 1), this.rng.range(-1.5, 1.5));
      this.explosion.add(ember);
    }
    const flash = new THREE.PointLight(0xff9d2e, 300, 60, 1.5);
    this.explosion.add(flash);
    this.explosion.visible = false;
    this.scene.add(this.explosion);
    this.explosionTimer = 0;

    // Muzzle tracer
    this.tracer = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
      new THREE.LineBasicMaterial({ color: 0xffe9a8, transparent: true, opacity: 0 }),
    );
    this.scene.add(this.tracer);
    this.tracerTimer = 0;

    this.load();
    this.setStage(0, 0);
  }

  makeVehicle(kind, color, x, z, heading) {
    const mesh = kind === 'boat' ? makeBoatMesh(color) : makeCarMesh(color);
    mesh.position.set(x, 0, z);
    mesh.rotation.y = heading;
    return { kind, mesh, x, z, heading, speed: 0, name: kind === 'boat' ? 'Wave Runner' : 'Car' };
  }

  // --- Saves ------------------------------------------------------------------
  save() {
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        jobIdx: this.jobIdx, money: this.money, respect: this.respect,
        health: this.health, armour: this.armour,
      }));
    } catch (e) { /* storage unavailable: play on without saving */ }
  }

  load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      this.jobIdx = clamp(s.jobIdx | 0, 0, 7);
      this.money = s.money | 0;
      this.respect = s.respect | 0;
      this.health = s.health ?? 100;
      this.armour = s.armour ?? 60;
    } catch (e) { /* corrupt save: start fresh */ }
  }

  // --- Jobs ---------------------------------------------------------------------
  currentJob() { return JOBS[this.jobIdx]; }
  currentStage() { return JOBS[this.jobIdx].stages[this.stageIdx]; }

  setStage(jobIdx, stageIdx) {
    this.jobIdx = jobIdx;
    this.stageIdx = stageIdx;
    const job = this.currentJob();
    const stage = this.currentStage();
    this.stageTimer = job.title === 'HARBOR LIGHTS' && stageIdx === 0 ? 5 * 60 : null;
    this.holdTimer = stage.holdSeconds || 0;
    this.setDialogue(job.crew, stage.dialogue);
    this.city.roadblock.visible = job.title === 'HARBOR LIGHTS' && stageIdx === 0;
  }

  setDialogue(crew, text) {
    this.dialogue = { crew, text };
    this.dialogueUntil = this.time + 7;
  }

  completeStage() {
    const job = this.currentJob();
    if (this.stageIdx + 1 < job.stages.length) {
      this.setStage(this.jobIdx, this.stageIdx + 1);
      return;
    }
    // Job complete
    this.money += job.reward;
    this.respect = Math.min(100, this.respect + 6);
    this.audio.cash();
    this.hud.showToast(`JOB COMPLETE — ${job.title} · +$${job.reward.toLocaleString('en-US')}`);
    this.save();
    if (this.jobIdx + 1 < JOBS.length) {
      this.setStage(this.jobIdx + 1, 0);
    } else {
      this.setDialogue('UNCLE SOL', 'The Cay is ours. Every job done, every tide ours.');
      this.hud.showToast('ALL 8 JOBS COMPLETE — VERDE CAY IS YOURS');
    }
  }

  addWanted(n, reason) {
    if (this.wanted >= 5) return;
    this.wanted = Math.min(5, this.wanted + n);
    this.wantedTimer = 0;
    if (reason === 'steal') this.setDialogue('KIKI', 'VCPD saw that. Keep moving.');
  }

  // --- Police ---------------------------------------------------------------------
  spawnPolice() {
    const want = Math.min(this.wanted, 4);
    while (this.police.length < want) {
      const a = this.rng.range(0, Math.PI * 2);
      const x = clamp(this.player.x + Math.sin(a) * 70, -180, 190);
      const z = clamp(this.player.z + Math.cos(a) * 70, -180, 190);
      const mesh = makeCarMesh(0x1c2f4a, { police: true });
      this.scene.add(mesh);
      const unit = { mesh, x, z, heading: 0, speed: 0, tactic: ['Pursuit', 'Flanking', 'Ramming', 'Roadblock'][this.police.length % 4] };
      this.police.push(unit);
    }
    if (this.wanted >= WANTED.heliAt && !this.heli) {
      this.heli = makeHeliMesh();
      this.heli.position.set(this.player.x + 30, 42, this.player.z - 30);
      this.scene.add(this.heli);
    }
    if (this.heli && this.wanted < WANTED.heliAt) {
      this.scene.remove(this.heli);
      this.heli = null;
    }
    const onWater = this.player.vehicle && this.player.vehicle.kind === 'boat';
    this.marineBoats.forEach((b, i) => {
      b.mesh.visible = onWater && this.wanted >= WANTED.boatsAt;
      if (b.mesh.visible && b.x > 400) {
        b.x = this.player.x + 60 + i * 25;
        b.z = this.player.z + 40;
      }
    });
  }

  updatePolice(dt) {
    this.spawnPolice();
    for (const u of this.police) {
      const dx = this.player.x - u.x;
      const dz = this.player.z - u.z;
      const dist = Math.hypot(dx, dz);
      const want = Math.atan2(dx, dz);
      u.heading = angleLerp(u.heading, want, dt * 1.8);
      const targetSpeed = this.player.onFoot ? 13 : 17 + this.wanted * 1.5;
      u.speed += (targetSpeed - u.speed) * dt * 0.7;
      u.x += Math.sin(u.heading) * u.speed * dt;
      u.z += Math.cos(u.heading) * u.speed * dt;
      u.mesh.position.set(u.x, 0, u.z);
      u.mesh.rotation.y = u.heading;
      // Ram: contact damages the player
      if (dist < 3.2) {
        this.damagePlayer(6 * dt * 10, 'ram');
        u.x -= Math.sin(u.heading) * 2.5;
        u.z -= Math.cos(u.heading) * 2.5;
        u.speed *= 0.4;
      }
      u.dist = dist;
    }
    // Despawn police when the heat is off
    if (this.wanted === 0) {
      for (const u of this.police) this.scene.remove(u.mesh);
      this.police = [];
      if (this.heli) {
        this.scene.remove(this.heli);
        this.heli = null;
      }
    }
    if (this.heli) {
      this.heliAngle += dt * 0.5;
      const hx = this.player.x + Math.sin(this.heliAngle) * 18;
      const hz = this.player.z + Math.cos(this.heliAngle) * 18;
      this.heli.position.set(hx, 42 + Math.sin(this.time * 0.8) * 1.5, hz);
      this.heli.rotation.y = Math.atan2(this.player.x - hx, this.player.z - hz);
      this.heli.userData.rotor.rotation.y += dt * 22;
      this.heli.userData.spot.target.position.set(this.player.x - hx, -40, this.player.z - hz);
    }
    for (const b of this.marineBoats) {
      if (!b.mesh.visible) continue;
      const dx = this.player.x - b.x;
      const dz = this.player.z - b.z;
      const dist = Math.hypot(dx, dz);
      b.heading = angleLerp(b.heading, Math.atan2(dx, dz), dt * 1.2);
      b.x += Math.sin(b.heading) * 16 * dt;
      b.z += Math.cos(b.heading) * 16 * dt;
      b.mesh.position.set(b.x, 0.1 + Math.sin(this.time * 1.3 + b.x) * 0.12, b.z);
      b.mesh.rotation.y = b.heading;
    }
  }

  damagePlayer(amount, kind) {
    if (this.armour > 0) {
      const absorbed = Math.min(this.armour, amount * 0.6);
      this.armour -= absorbed;
      this.health -= (amount - absorbed);
    } else {
      this.health -= amount;
    }
    if (this.health <= 0) {
      this.health = 100;
      this.armour = 40;
      this.wanted = Math.max(0, this.wanted - 2);
      this.player.x = CITY.spawn.x;
      this.player.z = CITY.spawn.z;
      this.player.onFoot = true;
      this.player.vehicle = null;
      this.playerMesh.visible = true;
      this.setDialogue('ANA', 'VCPD booked you and let you walk. The Cay waits.');
      this.hud.showToast('BUSTED — VCPD let you walk. The Cay waits.');
    }
  }

  // --- Collision: push out of building AABBs --------------------------------------
  collide(x, z, r) {
    for (const c of this.city.colliders) {
      if (x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r) {
        const dxl = x - (c.x0 - r);
        const dxr = (c.x1 + r) - x;
        const dzl = z - (c.z0 - r);
        const dzr = (c.z1 + r) - z;
        const m = Math.min(dxl, dxr, dzl, dzr);
        if (m === dxl) x = c.x0 - r;
        else if (m === dxr) x = c.x1 + r;
        else if (m === dzl) z = c.z0 - r;
        else z = c.z1 + r;
      }
    }
    return [x, z];
  }

  nearestStealable(maxDist) {
    const cands = [this.heroCar, this.bankVan, this.jammerVan];
    for (const t of this.traffic) if (!t.stolen) cands.push(t.car ? { mesh: t.mesh, x: t.car.pos.x, z: t.car.pos.z, heading: t.car.heading, kind: 'traffic', ref: t } : null);
    let best = null;
    let bestD = maxDist;
    for (const c of cands) {
      if (!c) continue;
      const d = Math.hypot(c.x - this.player.x, c.z - this.player.z);
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  }

  enterVehicle(v) {
    if (v.kind === 'traffic' && v.ref) v.ref.stolen = true;
    this.player.onFoot = false;
    this.player.vehicle = v;
    this.playerMesh.visible = false;
    this.player.heading = v.heading;
    this.player.x = v.x;
    this.player.z = v.z;
    this.vehicleName = v.name || (v.kind === 'boat' ? 'Wave Runner' : 'Sedan');
    if (v !== this.heroCar && v.kind !== 'boat') this.addWanted(WANTED.steal, 'steal');
    if (v.kind === 'boat') this.addWanted(1, 'steal');
    this.audio.ensure();
  }

  exitVehicle() {
    const v = this.player.vehicle;
    if (!v) return;
    this.player.onFoot = true;
    this.player.vehicle = null;
    this.player.x = v.x + Math.sin(v.heading + Math.PI / 2) * 2.4;
    this.player.z = v.z + Math.cos(v.heading + Math.PI / 2) * 2.4;
    this.player.speed = 0;
    this.playerMesh.visible = true;
    this.vehicleName = 'ON FOOT';
  }

  fire() {
    if (this.fireCooldown > 0) return;
    const w = WEAPONS[this.weaponIdx];
    this.fireCooldown = w.rate;
    this.audio.ensure();
    this.audio.gunshot();
    this.addWanted(1, 'shoot');
    // Hitscan: nearest police or ped within range and a 25-degree cone
    const px = this.player.x;
    const pz = this.player.z;
    const fx = Math.sin(this.player.heading);
    const fz = Math.cos(this.player.heading);
    let best = null;
    let bestD = w.range;
    for (const u of this.police) {
      const dx = u.x - px;
      const dz = u.z - pz;
      const d = Math.hypot(dx, dz);
      if (d < bestD && (dx * fx + dz * fz) / Math.max(d, 0.001) > 0.9) { best = u; bestD = d; }
    }
    const from = new THREE.Vector3(px, 1.5, pz);
    const to = new THREE.Vector3(px + fx * (best ? bestD : w.range), 1.4, pz + fz * (best ? bestD : w.range));
    this.tracer.geometry.setFromPoints([from, to]);
    this.tracer.material.opacity = 0.9;
    this.tracerTimer = 0.09;
    if (best) {
      best.x += fx * 2;
      best.z += fz * 2;
      if (this.rng.chance(0.4)) {
        this.scene.remove(best.mesh);
        this.police.splice(this.police.indexOf(best), 1);
        this.addWanted(1, 'kill');
        this.respect = Math.min(100, this.respect + 1);
      }
    }
  }

  checkStage(dt) {
    const stage = this.currentStage();
    const p = this.player;
    const d = (t) => Math.hypot(t.x - p.x, t.z - p.z);
    if (this.stageTimer != null) {
      this.stageTimer -= dt;
      if (this.stageTimer <= 0) {
        this.stageTimer = null;
        this.setStage(this.jobIdx, 0);
        this.hud.showToast('JOB FAILED — the moment passed. Try again.');
        return;
      }
    }
    if (stage.kind === 'reach') {
      if (d(stage.target) < 7) this.completeStage();
    } else if (stage.kind === 'steal') {
      // Completed by enterVehicle when the right car is taken; the prompt
      // guides the player. Any steal while on this stage completes it.
      if (!p.onFoot && p.vehicle && p.vehicle.kind !== 'boat') this.completeStage();
    } else if (stage.kind === 'stealBoat') {
      if (!p.onFoot && p.vehicle && p.vehicle.kind === 'boat') this.completeStage();
    } else if (stage.kind === 'roadblock') {
      const rb = this.city.roadblock.position;
      if (Math.abs(p.x - rb.x) < 10 && Math.abs(p.z - rb.z) < 8 && Math.abs(p.speed) > 12) {
        this.explosion.position.set(rb.x, 2, rb.z - 8);
        this.explosion.visible = true;
        this.explosionTimer = 1.6;
        this.city.roadblock.visible = false;
        this.addWanted(2, 'shoot');
        this.completeStage();
      }
    } else if (stage.kind === 'hold') {
      if (d(stage.target) < 9) {
        this.holdTimer -= dt;
        if (this.holdTimer <= 0) this.completeStage();
      } else {
        this.holdTimer = stage.holdSeconds;
      }
    } else if (stage.kind === 'openWater') {
      if (p.x > 300) this.completeStage();
    }
  }

  updatePrompt() {
    const p = this.player;
    const stage = this.currentStage();
    if (p.onFoot) {
      const near = this.nearestStealable(5);
      if (near) {
        this.prompt = near.kind === 'boat' ? 'E — STEAL THE WAVE RUNNER' : `E — STEAL THE ${near.name || 'CAR'}`;
        return;
      }
      const boat = this.marinaBoat;
      if (Math.hypot(boat.x - p.x, boat.z - p.z) < 5) {
        this.prompt = 'E — STEAL THE WAVE RUNNER';
        return;
      }
      this.prompt = stage.kind === 'steal' ? 'Get to the car — E to steal it' : '';
    } else {
      this.prompt = 'E — EXIT VEHICLE';
    }
  }

  // --- Main update ------------------------------------------------------------------
  update(dt, input) {
    this.time += dt;
    this.clockMinutes += dt / 1.5;
    if (this.mode !== 'play' || this.frozen) return;
    const p = this.player;

    // Traffic and pedestrians always move
    for (const t of this.traffic) if (!t.stolen) t.car.update(dt, this.rng);
    for (const ped of this.peds) ped.update(dt);
    this.updatePolice(dt);

    // Wanted decay: out of sight, out of mind
    if (this.wanted > 0) {
      this.wantedTimer += dt;
      const nearest = this.police.reduce((m, u) => Math.min(m, u.dist ?? 999), 999);
      if (this.wantedTimer > WANTED.decaySeconds && nearest > 60) {
        this.wanted -= 1;
        this.wantedTimer = 0;
      }
    }

    // Timers
    this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    if (this.tracerTimer > 0) {
      this.tracerTimer -= dt;
      if (this.tracerTimer <= 0) this.tracer.material.opacity = 0;
    }
    if (this.explosionTimer > 0) {
      this.explosionTimer -= dt;
      const s = 1 + (1.6 - Math.max(this.explosionTimer, 0)) * 1.4;
      this.explosion.scale.setScalar(s);
      if (this.explosionTimer <= 0) this.explosion.visible = false;
    }
    if (this.dialogue && this.time > this.dialogueUntil) this.dialogue = null;

    // --- Movement ---------------------------------------------------------------------
    if (p.onFoot) {
      const run = input.down('ShiftLeft', 'ShiftRight');
      const speed = run ? 8 : 4.5;
      let mx = 0;
      let mz = 0;
      if (input.down('KeyW', 'ArrowUp')) { mx += Math.sin(p.heading); mz += Math.cos(p.heading); }
      if (input.down('KeyS', 'ArrowDown')) { mx -= Math.sin(p.heading); mz -= Math.cos(p.heading); }
      if (input.down('KeyA', 'ArrowLeft')) p.heading += 2.6 * dt;
      if (input.down('KeyD', 'ArrowRight')) p.heading -= 2.6 * dt;
      const len = Math.hypot(mx, mz);
      if (len > 0) {
        p.x += (mx / len) * speed * dt;
        p.z += (mz / len) * speed * dt;
        p.speed = speed;
      } else {
        p.speed = 0;
      }
      [p.x, p.z] = this.collide(p.x, p.z, 0.6);
      p.x = clamp(p.x, -185, 300);
      p.z = clamp(p.z, -195, 195);
      this.playerMesh.position.set(p.x, 0, p.z);
      this.playerMesh.rotation.y = p.heading;
      this.playerMesh.position.y = len > 0 ? Math.abs(Math.sin(this.time * (run ? 11 : 7))) * 0.07 : 0;
    } else {
      const v = p.vehicle;
      const isBoat = v.kind === 'boat';
      const maxSpeed = isBoat ? 26 : 55;
      const accel = isBoat ? 9 : 16;
      if (input.down('KeyW', 'ArrowUp')) p.speed += accel * dt;
      if (input.down('KeyS', 'ArrowDown')) p.speed -= (p.speed > 0.5 ? 22 : 8) * dt;
      if (input.down('Space')) p.speed -= Math.sign(p.speed) * 26 * dt;
      p.speed -= p.speed * (isBoat ? 0.35 : 0.12) * dt; // drag
      p.speed = clamp(p.speed, isBoat ? -6 : -10, maxSpeed);
      const steer = (input.down('KeyA', 'ArrowLeft') ? 1 : 0) - (input.down('KeyD', 'ArrowRight') ? 1 : 0);
      const steerAuthority = clamp(Math.abs(p.speed) / 12, 0, 1);
      p.heading += steer * 1.5 * steerAuthority * dt * Math.sign(p.speed || 1);
      p.x += Math.sin(p.heading) * p.speed * dt;
      p.z += Math.cos(p.heading) * p.speed * dt;
      if (!isBoat) {
        [p.x, p.z] = this.collide(p.x, p.z, 1.4);
        p.x = clamp(p.x, -185, 228);
        p.z = clamp(p.z, -195, 195);
        if (Math.abs(p.speed) > 14) {
          // Speeding past the VCPD draws heat
          const near = this.police.some((u) => (u.dist ?? 999) < 25);
          if (near && this.rng.chance(dt * 0.2)) this.addWanted(0, 'speed');
        }
      } else {
        p.x = clamp(p.x, 226, 480);
        p.z = clamp(p.z, -195, 195);
        if (p.x < 232 && p.speed > 0) p.speed *= 0.9; // beaching drag
      }
      v.x = p.x;
      v.z = p.z;
      v.heading = p.heading;
      v.speed = p.speed;
      v.mesh.position.set(p.x, isBoat ? 0.1 + Math.sin(this.time * 1.3) * 0.12 : 0, p.z);
      v.mesh.rotation.y = p.heading;
      v.mesh.rotation.z = -steer * clamp(Math.abs(p.speed) / 55, 0, 1) * 0.06;
      this.audio.setEngine(Math.abs(p.speed) * 3.6, true);
    }

    // --- Actions ----------------------------------------------------------------------
    if (input.justPressed('KeyE')) {
      if (p.onFoot) {
        const near = this.nearestStealable(5);
        const boat = this.marinaBoat;
        if (near) this.enterVehicle(near);
        else if (Math.hypot(boat.x - p.x, boat.z - p.z) < 5) this.enterVehicle(boat);
      } else {
        this.exitVehicle();
      }
    }
    if (input.justPressed('KeyF')) this.fire();
    if (input.justPressed('Digit1')) this.weaponIdx = 0;
    if (input.justPressed('Digit2')) this.weaponIdx = 1;
    if (input.justPressed('Digit3')) this.weaponIdx = 2;
    if (input.justPressed('KeyQ')) {
      this.audio.ensure();
      this.audio.nextStation();
    }
    if (input.justPressed('KeyM')) {
      this.mode = 'map';
      this.hud.showMap(true, this.getMapState());
    }

    this.audio.setSiren(this.wanted >= 3);
    this.checkStage(dt);
    this.updatePrompt();
    this.hud.update(this.getHUDState());
  }

  // --- HUD / map state ------------------------------------------------------------------
  getHUDState() {
    const job = this.currentJob();
    const stage = this.currentStage();
    const p = this.player;
    const isBoat = !p.onFoot && p.vehicle && p.vehicle.kind === 'boat';
    const speedKmh = this.stagedSpeedKmh != null ? this.stagedSpeedKmh : Math.abs(p.speed) * 3.6;
    const speedKnots = this.stagedSpeedKnots != null ? this.stagedSpeedKnots : Math.abs(p.speed) * 1.94;
    const hours = Math.floor(this.clockMinutes / 60) % 24;
    const mins = Math.floor(this.clockMinutes % 60);
    const dispatch = this.police.slice(0, 6).map((u, i) => ({
      unit: `VCPD-10${i + 1}`,
      dist: u.dist ?? 40,
      tactic: u.tactic.toUpperCase(),
    }));
    if (this.heli) {
      dispatch.unshift({ unit: 'AIR-1', dist: 42, tactic: 'SPOTLIGHT' });
    }
    let timer = null;
    if (this.stageTimer != null) {
      const t = Math.max(0, Math.ceil(this.stageTimer));
      timer = `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`;
    } else if (stage.kind === 'hold') {
      timer = `${Math.ceil(this.holdTimer)}s`;
    }
    const near = this.player.onFoot ? this.nearestStealable(5) : null;
    const prompt = near ? `E — STEAL THE ${near.name.toUpperCase()}` : null;
    return {
      jobIdx: this.jobIdx,
      jobTitle: job.title,
      crew: job.crew,
      stageIdx: this.stageIdx,
      stageCount: job.stages.length,
      objective: stage.objective,
      timer,
      wanted: this.wanted,
      money: this.money,
      clock: `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')} · SAT`,
      health: Math.max(0, Math.round(this.health)),
      armour: Math.max(0, Math.round(this.armour)),
      respect: Math.round(this.respect),
      dialogue: this.dialogue ? this.dialogue.text : '',
      dialogueCrew: this.dialogue ? this.dialogue.crew : '',
      speedKmh,
      speedKnots,
      inBoat: !!isBoat,
      vehicleName: this.vehicleName,
      condition: this.player.condition,
      weaponIdx: this.weaponIdx,
      radio: `${this.audio.currentStation().name} ${this.audio.currentStation().freq}`,
      prompt,
      dispatch,
      target: stage.target || null,
      policeDots: this.police.map((u) => ({ x: u.x, z: u.z })),
      pos: { x: p.x, z: p.z },
      headingX: Math.sin(p.heading),
      headingZ: Math.cos(p.heading),
      crewList: CREW,
    };
  }

  getMapState() {
    const s = this.getHUDState();
    return s;
  }
}
