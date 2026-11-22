// Verde Cay — vehicles and people: mesh factories for the hero car, traffic,
// police cruisers, boats, the police helicopter and pedestrians, plus the
// traffic and pedestrian systems that keep the city moving.
import * as THREE from 'three';
import { STREETS, WORLD } from './config.js';
import { badgeTexture } from './textures.js';
import { mulberry32 } from './city.js';

const TRAFFIC_COLOURS = [0x3b82f6, 0xfacc15, 0xe5e7eb, 0x1f2937, 0x7c3aed, 0x0ea5e9, 0xef4444, 0x10b981, 0xf97316, 0x9ca3af];
const SHIRT_COLOURS = [0xef4444, 0x3b82f6, 0xfacc15, 0x10b981, 0xec4899, 0x8b5cf6, 0xf97316, 0x14b8a6, 0xe5e7eb, 0x111827];

function box(w, h, d, colour, rough = 0.55, metal = 0.35) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color: colour, roughness: rough, metalness: metal }));
  m.castShadow = true;
  return m;
}

export function makeCarMesh(colour, opts = {}) {
  const g = new THREE.Group();
  const body = box(2.0, 0.62, 4.6, colour, 0.32, 0.55);
  body.position.y = 0.55; g.add(body);
  const nose = box(1.9, 0.4, 0.7, colour, 0.32, 0.55);
  nose.position.set(0, 0.42, 2.35); g.add(nose);
  const cabin = box(1.7, 0.55, 2.2, colour, 0.32, 0.55);
  cabin.position.set(0, 1.08, -0.25); g.add(cabin);
  const glass = box(1.74, 0.34, 1.9, 0x3b4a63, 0.18, 0.3);
  glass.position.set(0, 1.12, -0.25); g.add(glass);
  // Hood scoop and rear spoiler for the sporty look.
  const scoop = box(0.7, 0.12, 0.9, 0x111827, 0.4, 0.4);
  scoop.position.set(0, 0.92, 1.3); g.add(scoop);
  const spoiler = box(1.9, 0.08, 0.5, 0x111827, 0.4, 0.4);
  spoiler.position.set(0, 1.15, -2.2); g.add(spoiler);
  for (const sx of [-0.8, 0.8]) {
    const fin = box(0.08, 0.3, 0.4, 0x111827, 0.4, 0.4);
    fin.position.set(sx, 1.0, -2.2); g.add(fin);
  }
  // Headlights and taillights.
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff6c9 });
  for (const sx of [-0.62, 0.62]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.08), headMat);
    hl.position.set(sx, 0.62, 2.72); g.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.08),
      new THREE.MeshBasicMaterial({ color: 0xff2d2d }));
    tl.position.set(sx, 0.66, -2.32); g.add(tl);
  }
  // Wheels.
  const wheels = [];
  const wheelGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.3, 14);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.9 });
  const hubMat = new THREE.MeshStandardMaterial({ color: 0xc0c0c8, roughness: 0.25, metalness: 0.8 });
  for (const [wx, wz] of [[-0.95, 1.55], [0.95, 1.55], [-0.95, -1.55], [0.95, -1.55]]) {
    const w = new THREE.Group();
    const tyre = new THREE.Mesh(wheelGeo, wheelMat);
    tyre.rotation.z = Math.PI / 2; tyre.castShadow = true; w.add(tyre);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.32, 10), hubMat);
    hub.rotation.z = Math.PI / 2; w.add(hub);
    w.position.set(wx, 0.38, wz);
    g.add(w); wheels.push(w);
  }
  if (opts.police) {
    // VCPD livery: white doors, black hood and trunk, light bar, door badges.
    const door = box(2.04, 0.4, 2.2, 0xf5f5f0, 0.4, 0.3);
    door.position.set(0, 0.62, -0.2); g.add(door);
    const badge = badgeTexture();
    for (const sx of [-1, 1]) {
      const b = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 0.7),
        new THREE.MeshBasicMaterial({ map: badge, transparent: true }));
      b.position.set(sx * 1.03, 0.66, -0.2);
      b.rotation.y = sx * Math.PI / 2;
      g.add(b);
    }
    const barBase = box(1.1, 0.1, 0.4, 0x111827, 0.4, 0.4);
    barBase.position.set(0, 1.42, -0.25); g.add(barBase);
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.34),
      new THREE.MeshBasicMaterial({ color: 0xff2222 }));
    red.position.set(-0.28, 1.52, -0.25); g.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.18, 0.34),
      new THREE.MeshBasicMaterial({ color: 0x2266ff }));
    blue.position.set(0.28, 1.52, -0.25); g.add(blue);
    g.userData.lightBar = { red, blue };
  }
  return { group: g, wheels };
}

export function makeBoatMesh(colour = 0x0ea5e9) {
  const g = new THREE.Group();
  // Tapered hull: a box plus a four-sided cone for the bow.
  const hull = box(2.2, 0.9, 4.4, colour, 0.35, 0.4);
  hull.position.y = 0.55; g.add(hull);
  const bow = new THREE.Mesh(new THREE.ConeGeometry(1.55, 2.0, 4),
    new THREE.MeshStandardMaterial({ color: colour, roughness: 0.35, metalness: 0.4 }));
  bow.rotation.x = Math.PI / 2; bow.rotation.y = Math.PI / 4;
  bow.scale.set(1, 1, 0.62);
  bow.position.set(0, 0.55, 3.1); bow.castShadow = true;
  g.add(bow);
  const deck = box(2.0, 0.14, 4.0, 0xf5efe0, 0.8, 0.05);
  deck.position.y = 1.02; g.add(deck);
  const console_ = box(0.9, 0.8, 0.6, 0x1f2937, 0.5, 0.3);
  console_.position.set(0, 1.45, 0.4); g.add(console_);
  const windshield = box(0.9, 0.5, 0.08, 0x7dd3fc, 0.1, 0.8);
  windshield.position.set(0, 1.9, 0.75); windshield.rotation.x = -0.3; g.add(windshield);
  const motor = box(0.5, 0.9, 0.4, 0x111827, 0.5, 0.5);
  motor.position.set(0, 0.7, -2.4); g.add(motor);
  // Wake streaks trailing behind.
  const wakeMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.45 });
  for (const sx of [-0.8, 0.8]) {
    const wake = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 5.5), wakeMat);
    wake.rotation.x = -Math.PI / 2;
    wake.position.set(sx, 0.18, -5.0);
    g.add(wake);
  }
  g.userData.wakeMat = wakeMat;
  return { group: g };
}

export function makeHeliMesh() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new THREE.SphereGeometry(1.5, 14, 10),
    new THREE.MeshStandardMaterial({ color: 0xf5f5f0, roughness: 0.4, metalness: 0.3 }));
  body.scale.set(1, 0.85, 1.6); body.castShadow = true; g.add(body);
  const glass = new THREE.Mesh(new THREE.SphereGeometry(1.1, 12, 8),
    new THREE.MeshStandardMaterial({ color: 0x0f2a52, roughness: 0.1, metalness: 0.7 }));
  glass.scale.set(0.85, 0.7, 0.9); glass.position.set(0, 0.25, 1.5); g.add(glass);
  const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.5, 4.4, 8),
    new THREE.MeshStandardMaterial({ color: 0xf5f5f0, roughness: 0.4, metalness: 0.3 }));
  tail.rotation.x = Math.PI / 2; tail.position.set(0, 0.35, -3.6); g.add(tail);
  const tailFin = box(0.12, 1.3, 0.8, 0x0f2a52, 0.5, 0.3);
  tailFin.position.set(0, 0.9, -5.6); g.add(tailFin);
  // Main rotor: two blades plus a translucent blur disc.
  const rotor = new THREE.Group();
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5 });
  for (const a of [0, Math.PI / 2]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.08, 0.5), bladeMat);
    blade.rotation.y = a; rotor.add(blade);
  }
  rotor.position.y = 1.5; g.add(rotor);
  const blur = new THREE.Mesh(new THREE.CircleGeometry(4.6, 24),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.12, side: THREE.DoubleSide }));
  blur.rotation.x = -Math.PI / 2; blur.position.y = 1.52; g.add(blur);
  // Skids.
  for (const sx of [-0.9, 0.9]) {
    const skid = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 3.6, 6),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5 }));
    skid.rotation.x = Math.PI / 2; skid.position.set(sx, -1.25, 0.2); g.add(skid);
  }
  // Searchlight cone under the nose: tip at the helicopter, opening down to
  // the road. (ConeGeometry's tip is at +Y, so no flip: centre it halfway down.)
  const cone = new THREE.Mesh(new THREE.ConeGeometry(3.4, 26, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.11, side: THREE.DoubleSide, depthWrite: false }));
  cone.position.set(0, -13, 2);
  g.add(cone);
  const spot = new THREE.SpotLight(0xfff2b0, 500, 90, 0.35, 0.5, 1.1);
  spot.position.set(0, -1, 1.5);
  spot.target.position.set(0, -26, 0);
  g.add(spot);
  g.add(spot.target);
  g.userData.rotor = rotor;
  g.userData.cone = cone;
  g.userData.spot = spot;
  return { group: g, rotor, cone, spot };
}

export function makePersonMesh(shirtColour) {
  const g = new THREE.Group();
  const skin = new THREE.MeshStandardMaterial({ color: 0xc98d64, roughness: 0.8 });
  const shirt = new THREE.MeshStandardMaterial({ color: shirtColour, roughness: 0.85 });
  const legs = new THREE.MeshStandardMaterial({ color: 0x2c3242, roughness: 0.9 });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 0.85, 10), shirt);
  body.position.y = 1.05; body.castShadow = true; g.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), skin);
  head.position.y = 1.75; head.castShadow = true; g.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 1 }));
  hair.position.y = 1.78; g.add(hair);
  for (const sx of [-0.16, 0.16]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.65, 8), legs);
    leg.position.set(sx, 0.35, 0); g.add(leg);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 0.6, 8), shirt);
    arm.position.set(sx * 2.1, 1.1, 0); g.add(arm);
  }
  return { group: g };
}

// --- Traffic ------------------------------------------------------------------
// Each traffic car drives the perimeter of a random city block: two avenues
// and two cross streets. At corners it turns; on straight runs it holds its
// lane and speed, braking for the car ahead is skipped for simplicity — the
// blocks are big enough that cars rarely meet.
export function createTraffic(scene, count) {
  const rng = mulberry32(777);
  const cars = [];
  const avenues = STREETS.avenues.filter((x) => x < WORLD.boulevardX);
  const cross = STREETS.cross;
  for (let i = 0; i < count; i++) {
    const colour = TRAFFIC_COLOURS[(rng() * TRAFFIC_COLOURS.length) | 0];
    const { group } = makeCarMesh(colour);
    const a1 = avenues[(rng() * avenues.length) | 0];
    let a2 = avenues[(rng() * avenues.length) | 0];
    if (a2 === a1) a2 = avenues[(avenues.indexOf(a1) + 2) % avenues.length];
    const c1 = cross[(rng() * cross.length) | 0];
    let c2 = cross[(rng() * cross.length) | 0];
    if (c2 === c1) c2 = cross[(cross.indexOf(c1) + 2) % cross.length];
    const x1 = Math.min(a1, a2), x2 = Math.max(a1, a2);
    const z1 = Math.min(c1, c2), z2 = Math.max(c1, c2);
    const loop = [
      { x: x1, z: z1 }, { x: x2, z: z1 }, { x: x2, z: z2 }, { x: x1, z: z2 },
    ];
    const start = (rng() * 4) | 0;
    const car = {
      group, loop, wp: (start + 1) % 4,
      speed: 7 + rng() * 5,
      x: loop[start].x, z: loop[start].z,
    };
    group.position.set(car.x, 0, car.z);
    scene.add(group);
    cars.push(car);
  }
  return cars;
}

export function updateTraffic(cars, dt) {
  for (const car of cars) {
    if (car.stolen) continue; // a stolen car is the player's now
    const target = car.loop[car.wp];
    const dx = target.x - car.x, dz = target.z - car.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 1.2) { car.wp = (car.wp + 1) % 4; continue; }
    const heading = Math.atan2(dx, dz);
    // Smooth the turn.
    let diff = heading - car.group.rotation.y;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.group.rotation.y += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
    const step = car.speed * dt;
    car.x += Math.sin(car.group.rotation.y) * step;
    car.z += Math.cos(car.group.rotation.y) * step;
    car.group.position.set(car.x, 0, car.z);
  }
}

export function createPedestrians(scene, count) {
  const rng = mulberry32(4242);
  const peds = [];
  const avenues = STREETS.avenues;
  for (let i = 0; i < count; i++) {
    const shirt = SHIRT_COLOURS[(rng() * SHIRT_COLOURS.length) | 0];
    const { group } = makePersonMesh(shirt);
    const avenue = avenues[(rng() * avenues.length) | 0];
    const side = rng() < 0.5 ? -9.5 : 9.5;
    const ped = {
      group, x: avenue + side, z: -200 + rng() * 400,
      dir: rng() < 0.5 ? 1 : -1, speed: 1.1 + rng() * 0.9,
      phase: rng() * Math.PI * 2, flee: 0,
    };
    group.position.set(ped.x, 0, ped.z);
    scene.add(group);
    peds.push(ped);
  }
  return peds;
}

export function updatePedestrians(peds, dt, t, playerPos, wanted) {
  for (const p of peds) {
    const dPlayer = Math.hypot(p.x - playerPos.x, p.z - playerPos.z);
    if (wanted >= 3 || dPlayer < 6) p.flee = 2.5;
    else if (p.flee > 0) p.flee -= dt;
    let speed = p.speed;
    let heading = p.dir > 0 ? 0 : Math.PI;
    if (p.flee > 0) {
      speed = 4.2;
      const away = Math.atan2(p.x - playerPos.x, p.z - playerPos.z);
      heading = away;
      p.x += Math.sin(heading) * speed * dt;
      p.z += Math.cos(heading) * speed * dt;
    } else {
      p.z += p.dir * speed * dt;
      if (p.z > 205) p.dir = -1;
      if (p.z < -205) p.dir = 1;
    }
    p.phase += dt * (p.flee > 0 ? 11 : 5);
    p.group.position.set(p.x, Math.abs(Math.sin(p.phase)) * 0.08, p.z);
    p.group.rotation.y = heading;
  }
}
