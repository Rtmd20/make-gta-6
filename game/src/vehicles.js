// Vehicles and people of Verde Cay: the hero car, traffic, VCPD cruisers,
// the searchlight helicopter, marina boats and pedestrians. All built from
// boxes and cylinders, with a simple waypoint traffic loop for the cars.
import * as THREE from 'three';
import { RNG } from './random.js';

function box(w, h, d, color, roughness = 0.55, metalness = 0.35) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness, metalness }),
  );
  m.castShadow = true;
  return m;
}

export function makeCarMesh(color, opts = {}) {
  const g = new THREE.Group();
  const body = box(2.0, 0.62, 4.4, color, 0.32, 0.6);
  body.position.y = 0.62;
  g.add(body);
  const cabin = box(1.7, 0.45, 2.2, 0x3a2028, 0.15, 0.7);
  cabin.position.set(0, 1.16, -0.2);
  g.add(cabin);
  // Painted roof panel in the body colour over the dark glass cabin, so the
  // roof reads as the car's colour from behind and above, not black.
  const roof = box(1.7, 0.08, 2.2, color, 0.32, 0.6);
  roof.position.set(0, 1.42, -0.2);
  g.add(roof);
  const spoiler = box(1.8, 0.08, 0.5, 0x14141a, 0.4, 0.5);
  spoiler.position.set(0, 1.05, -2.05);
  g.add(spoiler);
  // Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.28, 12);
  const wheelMat = new THREE.MeshStandardMaterial({ color: 0x0d0d10, roughness: 0.9 });
  for (const [x, z] of [[-0.95, 1.45], [0.95, 1.45], [-0.95, -1.45], [0.95, -1.45]]) {
    const w = new THREE.Mesh(wheelGeo, wheelMat);
    w.rotation.z = Math.PI / 2;
    w.position.set(x, 0.36, z);
    w.castShadow = true;
    g.add(w);
  }
  // Headlights + taillights
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff6c8 });
  for (const x of [-0.7, 0.7]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.16, 0.08), headMat);
    h.position.set(x, 0.66, 2.22);
    g.add(h);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.08), new THREE.MeshBasicMaterial({ color: 0xff2d2d }));
    t.position.set(x, 0.66, -2.22);
    g.add(t);
  }
  if (opts.police) {
    const bar = box(1.1, 0.16, 0.5, 0x111118, 0.4, 0.4);
    bar.position.set(0, 1.52, -0.2);
    g.add(bar);
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.46), new THREE.MeshBasicMaterial({ color: 0xff2d2d }));
    red.position.set(-0.28, 1.6, -0.2);
    g.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.46), new THREE.MeshBasicMaterial({ color: 0x2d6bff }));
    blue.position.set(0.28, 1.6, -0.2);
    g.add(blue);
    // VCPD badge on the doors: a white star disc
    const badgeGeo = new THREE.CircleGeometry(0.34, 12);
    const badgeMat = new THREE.MeshBasicMaterial({ color: 0xf5f0e6 });
    for (const x of [-1.02, 1.02]) {
      const badge = new THREE.Mesh(badgeGeo, badgeMat);
      badge.position.set(x, 0.72, 0.1);
      badge.rotation.y = x > 0 ? Math.PI / 2 : -Math.PI / 2;
      g.add(badge);
    }
  }
  if (opts.taxi) {
    const sign = box(0.7, 0.22, 0.4, 0xffc93c, 0.5, 0.2);
    sign.position.set(0, 1.55, -0.2);
    g.add(sign);
  }
  g.userData.wheels = [];
  return g;
}

export function makeBoatMesh(color) {
  const g = new THREE.Group();
  const hull = new THREE.Mesh(
    new THREE.CylinderGeometry(0.9, 1.5, 6.4, 4, 1),
    new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.5 }),
  );
  hull.rotation.x = Math.PI / 2;
  hull.rotation.y = Math.PI / 4;
  hull.scale.set(1, 1, 0.62);
  hull.position.y = 0.55;
  hull.castShadow = true;
  g.add(hull);
  const deck = box(1.5, 0.3, 4.2, 0xf5f0e6, 0.6, 0.1);
  deck.position.y = 0.95;
  g.add(deck);
  const cabin = box(1.2, 0.7, 1.8, 0x1a2028, 0.15, 0.6);
  cabin.position.set(0, 1.4, -0.6);
  g.add(cabin);
  const motor = box(0.5, 0.8, 0.4, 0x222226, 0.5, 0.5);
  motor.position.set(0, 0.7, -3.2);
  g.add(motor);
  // Wake streaks
  const wakeMat = new THREE.MeshBasicMaterial({ color: 0xdff4f6, transparent: true, opacity: 0.5 });
  for (const x of [-0.9, 0.9]) {
    const wake = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 7), wakeMat);
    wake.rotation.x = -Math.PI / 2;
    wake.position.set(x, 0.08, -4.5);
    g.add(wake);
  }
  return g;
}

export function makeHeliMesh() {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(1.5, 12, 10),
    new THREE.MeshStandardMaterial({ color: 0x2e4a68, roughness: 0.4, metalness: 0.5 }),
  );
  body.scale.set(1, 0.8, 1.6);
  body.castShadow = true;
  g.add(body);
  const glass = new THREE.Mesh(
    new THREE.SphereGeometry(1.1, 10, 8),
    new THREE.MeshStandardMaterial({ color: 0x9fd8e8, roughness: 0.1, metalness: 0.6 }),
  );
  glass.scale.set(0.9, 0.7, 0.9);
  glass.position.set(0, 0.1, 1.1);
  g.add(glass);
  const tail = box(0.5, 0.5, 4.4, 0x2e4a68, 0.4, 0.5);
  tail.position.set(0, 0.3, -3.4);
  g.add(tail);
  const fin = box(0.18, 1.4, 0.9, 0xe8452c, 0.5, 0.4);
  fin.position.set(0, 0.9, -5.4);
  g.add(fin);
  // Rotor (blurred disc + blades)
  const rotor = new THREE.Group();
  const disc = new THREE.Mesh(
    new THREE.CircleGeometry(4.6, 24),
    new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.28, side: THREE.DoubleSide }),
  );
  disc.rotation.x = -Math.PI / 2;
  rotor.add(disc);
  for (let i = 0; i < 2; i++) {
    const blade = box(0.34, 0.06, 9.0, 0x222226, 0.5, 0.4);
    blade.rotation.y = i * Math.PI / 2;
    rotor.add(blade);
  }
  rotor.position.y = 1.5;
  g.add(rotor);
  g.userData.rotor = rotor;
  // Searchlight cone under the nose
  const coneGeo = new THREE.ConeGeometry(9, 42, 16, 1, true);
  coneGeo.translate(0, -21, 0);
  const cone = new THREE.Mesh(coneGeo, new THREE.MeshBasicMaterial({
    color: 0xfff2c0, transparent: true, opacity: 0.13, side: THREE.DoubleSide, depthWrite: false,
  }));
  cone.position.set(0, -0.6, 1.4);
  cone.rotation.x = 0.35;
  g.add(cone);
  const spot = new THREE.SpotLight(0xfff2c0, 260, 120, 0.3, 0.55, 1.1);
  spot.position.set(0, -0.6, 1.4);
  g.add(spot);
  g.add(spot.target);
  spot.target.position.set(0, -30, 16);
  g.userData.spot = spot;
  return g;
}

export function makePedMesh(rng) {
  const g = new THREE.Group();
  const skin = [0xc98d64, 0x8c5a3b, 0xe8b48c, 0x6d4530][rng.int(0, 3)];
  const shirt = [0xe8452c, 0x2d6bff, 0xffc93c, 0x34c759, 0xb57fa8, 0xf5f0e6][rng.int(0, 5)];
  const pants = [0x2a2a30, 0x3a4a5a, 0x5a3a2a][rng.int(0, 2)];
  const legs = box(0.52, 0.8, 0.3, pants, 0.9, 0);
  legs.position.y = 0.4;
  g.add(legs);
  const torso = box(0.56, 0.62, 0.32, shirt, 0.9, 0);
  torso.position.y = 1.1;
  g.add(torso);
  const head = new THREE.Mesh(
    new THREE.SphereGeometry(0.26, 10, 8),
    new THREE.MeshStandardMaterial({ color: skin, roughness: 0.8 }),
  );
  head.position.y = 1.68;
  head.castShadow = true;
  g.add(head);
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.27, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2),
    new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.95 }),
  );
  hair.position.y = 1.72;
  g.add(hair);
  g.userData.walkPhase = rng.range(0, Math.PI * 2);
  return g;
}

// --- Traffic: cars follow rectangular loops around blocks --------------------
export class TrafficCar {
  constructor(mesh, loop, speed, rng) {
    this.mesh = mesh;
    this.loop = loop;
    this.wp = rng.int(0, 3);
    this.speed = speed; // m/s
    this.pos = new THREE.Vector3(loop[this.wp].x, 0, loop[this.wp].z);
    this.heading = 0;
    this.paused = 0;
  }
  update(dt, rng) {
    if (this.paused > 0) {
      this.paused -= dt;
      return;
    }
    const target = this.loop[(this.wp + 1) % this.loop.length];
    const dx = target.x - this.pos.x;
    const dz = target.z - this.pos.z;
    const dist = Math.hypot(dx, dz);
    const want = Math.atan2(dx, dz);
    let diff = want - this.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    this.heading += THREE.MathUtils.clamp(diff, -2.4 * dt, 2.4 * dt);
    const step = this.speed * dt;
    if (dist < step + 0.5) {
      this.wp = (this.wp + 1) % this.loop.length;
      if (rng.chance(0.12)) this.paused = rng.range(1, 3.5);
    } else {
      this.pos.x += Math.sin(this.heading) * step;
      this.pos.z += Math.cos(this.heading) * step;
    }
    this.mesh.position.set(this.pos.x, 0, this.pos.z);
    this.mesh.rotation.y = this.heading;
  }
}

export class Pedestrian {
  constructor(mesh, home, rng) {
    this.mesh = mesh;
    this.home = home;
    this.pos = new THREE.Vector3(home.x + rng.range(-6, 6), 0, home.z + rng.range(-6, 6));
    this.heading = rng.range(0, Math.PI * 2);
    this.speed = rng.range(1.1, 2.0);
    this.retarget = 0;
    this.rng = rng;
  }
  update(dt) {
    this.retarget -= dt;
    if (this.retarget <= 0) {
      this.retarget = this.rng.range(2, 6);
      const tx = this.home.x + this.rng.range(-18, 18);
      const tz = this.home.z + this.rng.range(-18, 18);
      this.heading = Math.atan2(tx - this.pos.x, tz - this.pos.z);
    }
    this.pos.x += Math.sin(this.heading) * this.speed * dt;
    this.pos.z += Math.cos(this.heading) * this.speed * dt;
    // Keep on the block: wander back if too far
    if (Math.abs(this.pos.x - this.home.x) > 20 || Math.abs(this.pos.z - this.home.z) > 20) {
      this.heading = Math.atan2(this.home.x - this.pos.x, this.home.z - this.pos.z);
    }
    this.mesh.position.set(this.pos.x, 0, this.pos.z);
    this.mesh.rotation.y = this.heading;
    this.mesh.userData.walkPhase += dt * 7;
    this.mesh.position.y = Math.abs(Math.sin(this.mesh.userData.walkPhase)) * 0.05;
  }
}
