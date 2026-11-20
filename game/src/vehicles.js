// Every vehicle and person in Verde Cay is built from boxes, cylinders and
// spheres in code — no model files, no borrowed art. Cars, the speedboat, the
// police helicopter, pedestrians and the player all come from these builders.
// Paint is glossy clearcoat-style standard material; glass is dark and shiny.
import * as THREE from 'three';

function mat(color, rough, metal, emissive, intensity) {
  return new THREE.MeshStandardMaterial({
    color, roughness: rough ?? 0.6, metalness: metal ?? 0.25,
    emissive: emissive ?? 0x000000, emissiveIntensity: intensity ?? 0,
  });
}
function part(w, h, d, material, x, y, z, rx = 0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z);
  if (rx) mesh.rotation.x = rx;
  mesh.castShadow = true;
  return mesh;
}
const glassMat = mat(0x10161f, 0.08, 0.9);
const chromeMat = mat(0xd8dee6, 0.15, 1);
const tyreMat = mat(0x14161a, 0.95, 0);
const hubMat = mat(0xc8ccd4, 0.25, 0.95);

function makeWheel(x, z) {
  const g = new THREE.Group();
  const tyre = new THREE.Mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.32, 16), tyreMat);
  tyre.rotation.z = Math.PI / 2;
  tyre.castShadow = true;
  g.add(tyre);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.34, 10), hubMat);
  hub.rotation.z = Math.PI / 2;
  g.add(hub);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.36, 8), mat(0xe8481f, 0.4, 0.6));
  cap.rotation.z = Math.PI / 2;
  g.add(cap);
  g.position.set(x, 0.44, z);
  g.userData.tyre = tyre;
  return g;
}

// A detailed sports car: sculpted body, glass cabin, chrome grille and trim,
// mirrors, spoiler, rims, glowing headlights and taillights, exhausts.
export function makeCarMesh(color, isPolice) {
  const group = new THREE.Group();
  const bodyMat = mat(color, 0.22, 0.65);
  // Lower body, sloped hood and trunk so the silhouette is not a slab.
  group.add(part(2.0, 0.5, 4.4, bodyMat, 0, 0.55, 0));
  group.add(part(1.96, 0.22, 1.1, bodyMat, 0, 0.72, 1.75, -0.16));
  group.add(part(1.96, 0.22, 0.9, bodyMat, 0, 0.72, -1.85, 0.14));
  // Side skirts and bumpers.
  group.add(part(2.06, 0.22, 4.0, mat(0x1a1d22, 0.6, 0.3), 0, 0.32, 0));
  group.add(part(2.0, 0.28, 0.28, chromeMat, 0, 0.5, 2.24));
  group.add(part(2.0, 0.28, 0.28, chromeMat, 0, 0.5, -2.24));
  // Glass cabin with a chrome window frame and a roof panel.
  group.add(part(1.72, 0.5, 2.1, glassMat, 0, 1.02, -0.25));
  group.add(part(1.6, 0.1, 1.9, bodyMat, 0, 1.3, -0.25));
  // Windshield and rear glass, angled.
  group.add(part(1.66, 0.08, 0.7, glassMat, 0, 1.12, 0.86, 0.5));
  group.add(part(1.66, 0.08, 0.6, glassMat, 0, 1.12, -1.32, -0.45));
  // Grille, mirrors, spoiler, exhausts.
  group.add(part(1.3, 0.2, 0.08, mat(0x0d0f12, 0.5, 0.6), 0, 0.55, 2.26));
  group.add(part(0.34, 0.1, 0.5, bodyMat, 0, 0.32, 2.28));
  group.add(part(0.18, 0.12, 0.3, bodyMat, -1.06, 1.0, 0.5));
  group.add(part(0.18, 0.12, 0.3, bodyMat, 1.06, 1.0, 0.5));
  group.add(part(1.7, 0.07, 0.5, mat(0x1a1d22, 0.4, 0.7), 0, 1.02, -2.05));
  group.add(part(0.08, 0.3, 0.08, chromeMat, -1.0, 0.86, -2.0));
  group.add(part(0.08, 0.3, 0.08, chromeMat, 1.0, 0.86, -2.0));
  for (const sx of [-0.5, 0.5]) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.3, 8), chromeMat);
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(sx, 0.38, -2.28);
    group.add(pipe);
  }
  const wheels = [];
  for (const [wx, wz] of [[-0.98, 1.42], [0.98, 1.42], [-0.98, -1.42], [0.98, -1.42]]) {
    const w = makeWheel(wx, wz);
    wheels.push(w);
    group.add(w);
  }
  const lightMat = mat(0xffffff, 0.15, 0.1, 0xfff2b0, 1.6);
  group.add(part(0.42, 0.16, 0.08, lightMat, -0.62, 0.66, 2.26));
  group.add(part(0.42, 0.16, 0.08, lightMat, 0.62, 0.66, 2.26));
  group.add(part(0.52, 0.14, 0.08, mat(0xff2a1a, 0.3, 0.1, 0xff2a1a, 1.0), -0.62, 0.66, -2.26));
  group.add(part(0.52, 0.14, 0.08, mat(0xff2a1a, 0.3, 0.1, 0xff2a1a, 1.0), 0.62, 0.66, -2.26));
  if (isPolice) {
    group.add(part(1.9, 0.22, 3.6, mat(0xf2f2ee, 0.45, 0.2), 0, 0.84, 0));
    group.add(part(2.02, 0.16, 0.5, mat(0x1a2f4a, 0.4, 0.4), 0, 0.84, -1.2));
    const bar = part(1.2, 0.16, 0.5, mat(0x223344, 0.4, 0.3), 0, 1.38, -0.2);
    group.add(bar);
    const red = part(0.5, 0.18, 0.52, mat(0xff2222, 0.3, 0.1, 0xff2222, 2.2), -0.32, 1.4, -0.2);
    const blue = part(0.5, 0.18, 0.52, mat(0x2266ff, 0.3, 0.1, 0x2266ff, 2.2), 0.32, 1.4, -0.2);
    group.add(red); group.add(blue);
    group.userData.lightBar = red;
    // VCPD door badge.
    group.add(part(0.02, 0.5, 0.9, mat(0xffffff, 0.5, 0.2, 0xffffff, 0.25), -1.02, 0.62, 0));
    group.add(part(0.02, 0.5, 0.9, mat(0xffffff, 0.5, 0.2, 0xffffff, 0.25), 1.02, 0.62, 0));
  }
  group.userData.wheels = wheels;
  return group;
}

// La Marea, the speedboat: a shaped hull with a flared bow, teak-look deck,
// glass windshield, centre console, seats, chrome rails and an outboard with
// a wake that trails behind her. Pass a hull colour for the VCPD marine boats.
export function makeBoatMesh(hullColor) {
  const group = new THREE.Group();
  const hullMat = mat(hullColor ?? 0xf5f2e8, 0.3, 0.25);
  // Hull: a tapered box (narrower at the bow) plus a flared nose cone.
  const hullGeo = new THREE.BoxGeometry(2.6, 1.1, 7.2);
  const hullPos = hullGeo.attributes.position;
  for (let i = 0; i < hullPos.count; i += 1) {
    const z = hullPos.getZ(i);
    if (z > 1.5) { const t = (z - 1.5) / 2.1; hullPos.setX(i, hullPos.getX(i) * (1 - t * 0.55)); }
  }
  hullGeo.computeVertexNormals();
  const hull = new THREE.Mesh(hullGeo, hullMat);
  hull.position.y = 0.75;
  hull.castShadow = true;
  group.add(hull);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(1.15, 2.0, 4), hullMat);
  nose.rotation.x = -Math.PI / 2;
  nose.rotation.y = Math.PI / 4;
  nose.scale.set(1, 1, 0.5);
  nose.position.set(0, 0.75, 4.5);
  nose.castShadow = true;
  group.add(nose);
  // Coral stripe and waterline stripe.
  group.add(part(2.62, 0.24, 6.9, mat(0xe8481f, 0.35, 0.3), 0, 1.24, -0.1));
  group.add(part(2.64, 0.18, 7.0, mat(0x1e6f8e, 0.4, 0.3), 0, 0.32, -0.1));
  // Deck, windshield, console, seats.
  group.add(part(2.3, 0.14, 6.4, mat(0x8a6b45, 0.85, 0.05), 0, 1.32, -0.2));
  group.add(part(1.9, 0.75, 0.12, glassMat, 0, 1.85, 0.9, -0.35));
  group.add(part(1.7, 0.9, 0.9, mat(0x222831, 0.5, 0.4), 0, 1.8, 0.1));
  group.add(part(0.9, 0.55, 0.9, mat(0xd94a3a, 0.7, 0.05), -0.55, 1.6, -1.1));
  group.add(part(0.9, 0.55, 0.9, mat(0xd94a3a, 0.7, 0.05), 0.55, 1.6, -1.1));
  group.add(part(1.9, 0.5, 0.7, mat(0xf2ede2, 0.7, 0.05), 0, 1.55, -2.2));
  // Chrome bow rail.
  for (const sx of [-1.05, 1.05]) {
    const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.6, 6), chromeMat);
    rail.rotation.x = Math.PI / 2;
    rail.position.set(sx, 1.7, 2.6);
    group.add(rail);
  }
  // Outboard motor and prop.
  group.add(part(0.55, 1.05, 0.65, mat(0x222831, 0.5, 0.4), 0, 0.7, -3.85));
  const prop = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.08, 8), chromeMat);
  prop.rotation.x = Math.PI / 2;
  prop.position.set(0, 0.25, -4.2);
  group.add(prop);
  // Wake: two thin foam streaks trailing the stern, scaled by speed in the world.
  const wakeMat = new THREE.MeshBasicMaterial({ color: 0xeaf6f2, transparent: true, opacity: 0.0, side: THREE.DoubleSide, depthWrite: false });
  const wake = new THREE.Group();
  for (const sx of [-0.85, 0.85]) {
    const streak = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 7), wakeMat);
    streak.rotation.x = -Math.PI / 2;
    streak.position.set(sx, 0.05, -7.0);
    wake.add(streak);
  }
  wake.position.y = 0;
  group.add(wake);
  group.userData.wake = wake;
  group.userData.wakeMat = wakeMat;
  return group;
}

// The VCPD helicopter: navy body with a white stripe, glass nose, tail boom
// and fin, tail rotor, skids, a spinning main rotor with a blur disc, and a
// visible searchlight cone under the nose.
export function makeHeliMesh() {
  const group = new THREE.Group();
  const bodyMat = mat(0x1a2f4a, 0.35, 0.45);
  const body = new THREE.Mesh(new THREE.SphereGeometry(1.6, 16, 12), bodyMat);
  body.scale.set(1, 0.85, 1.7);
  body.castShadow = true;
  group.add(body);
  group.add(part(3.24, 0.5, 1.6, mat(0xf2f2ee, 0.4, 0.3), 0, 0.15, 0.4));
  const glass = new THREE.Mesh(new THREE.SphereGeometry(1.1, 12, 10), mat(0x9fd8ff, 0.08, 0.8, 0x88bbdd, 0.3));
  glass.position.set(0, 0.3, 1.4);
  glass.scale.set(0.9, 0.7, 0.8);
  group.add(glass);
  group.add(part(0.5, 0.5, 4.5, bodyMat, 0, 0.3, -3.2));
  group.add(part(0.2, 1.7, 0.9, bodyMat, 0, 0.7, -5.2));
  const tailRotor = new THREE.Group();
  tailRotor.add(part(0.08, 2.2, 0.12, mat(0x222831, 0.5, 0.4), 0, 0, 0));
  tailRotor.add(part(0.08, 0.12, 2.2, mat(0x222831, 0.5, 0.4), 0, 0, 0));
  tailRotor.position.set(0.18, 0.7, -5.4);
  group.add(tailRotor);
  group.userData.tailRotor = tailRotor;
  const rotor = new THREE.Group();
  rotor.add(part(7.5, 0.08, 0.35, mat(0x222831, 0.5, 0.4), 0, 0, 0));
  rotor.add(part(0.35, 0.08, 7.5, mat(0x222831, 0.5, 0.4), 0, 0, 0));
  const blur = new THREE.Mesh(
    new THREE.CircleGeometry(3.8, 24),
    new THREE.MeshBasicMaterial({ color: 0xaaaaaa, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false }),
  );
  blur.rotation.x = -Math.PI / 2;
  rotor.add(blur);
  rotor.position.y = 1.6;
  group.add(rotor);
  group.userData.rotor = rotor;
  for (const sx of [-1.1, 1.1]) {
    group.add(part(0.15, 0.15, 3.4, mat(0x333a44, 0.5, 0.4), sx, -1.3, 0));
    group.add(part(0.12, 0.9, 0.12, mat(0x333a44, 0.5, 0.4), sx, -0.85, 1.1));
    group.add(part(0.12, 0.9, 0.12, mat(0x333a44, 0.5, 0.4), sx, -0.85, -1.1));
  }
  // Searchlight: a cone of light under the nose, plus the spot itself.
  const cone = new THREE.Mesh(
    new THREE.ConeGeometry(3.2, 22, 16, 1, true),
    new THREE.MeshBasicMaterial({ color: 0xfff2b0, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false }),
  );
  cone.rotation.x = Math.PI;
  cone.position.set(0, -12, 1.5);
  group.add(cone);
  const spot = new THREE.SpotLight(0xfff2b0, 80, 70, 0.35, 0.5);
  spot.position.set(0, -1, 1);
  group.add(spot);
  group.userData.spot = spot;
  return group;
}

const SKINS = [0xd9a066, 0x8a5a34, 0xe8b88a, 0x6b4423, 0xc98a5a];
const SHIRTS = [0xf2e6b8, 0x9fc5e8, 0xe88ca0, 0x8fd0a0, 0xd9b48a, 0xc9a0dc, 0x3a7bd5, 0xe8481f];
const PANTS = [0x2c2f36, 0x2c4a6b, 0x5a4632, 0x3a3a44];

// A pedestrian: varied skin, shirt and trousers, arms, and a hat or hair on
// some — so the crowd does not read as clones.
export function makePedMesh(color, rng) {
  const group = new THREE.Group();
  const skin = SKINS[Math.floor((rng ? rng.next() : 0.5) * SKINS.length)];
  const shirt = color ?? SHIRTS[Math.floor((rng ? rng.next() : 0.5) * SHIRTS.length)];
  const pants = PANTS[Math.floor((rng ? rng.next() : 0.5) * PANTS.length)];
  const tall = 0.92 + (rng ? rng.next() : 0.5) * 0.16;
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.9, 4, 8), mat(shirt, 0.9, 0));
  body.position.y = 1.15;
  body.castShadow = true;
  group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), mat(skin, 0.75, 0));
  head.position.y = 2.15;
  head.castShadow = true;
  group.add(head);
  if (rng && rng.chance(0.4)) {
    const hat = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.38, 0.12, 10), mat(0xf2b705, 0.85, 0));
    hat.position.y = 2.42;
    group.add(hat);
  } else {
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.33, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55), mat(0x1a1210, 0.95, 0));
    hair.position.y = 2.18;
    group.add(hair);
  }
  const legMat = mat(pants, 0.9, 0);
  const legL = part(0.22, 0.8, 0.22, legMat, -0.18, 0.4, 0);
  const legR = part(0.22, 0.8, 0.22, legMat, 0.18, 0.4, 0);
  group.add(legL);
  group.add(legR);
  const armMat = mat(shirt, 0.9, 0);
  const armL = part(0.18, 0.75, 0.18, armMat, -0.55, 1.3, 0);
  const armR = part(0.18, 0.75, 0.18, armMat, 0.55, 1.3, 0);
  group.add(armL);
  group.add(armR);
  group.scale.setScalar(tall);
  group.userData.legs = [legL, legR];
  group.userData.arms = [armL, armR];
  return group;
}

// The player on foot: coral jacket, jeans, cap, both arms, so the on-foot
// shot reads clearly from behind.
export function makePlayerMesh() {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.45, 0.95, 4, 8), mat(0xe8481f, 0.75, 0.05));
  body.position.y = 1.2;
  body.castShadow = true;
  group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.33, 12, 10), mat(0xd9a066, 0.75, 0));
  head.position.y = 2.2;
  head.castShadow = true;
  group.add(head);
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.36, 0.36, 0.12, 10), mat(0x1a2f4a, 0.8, 0));
  cap.position.y = 2.45;
  group.add(cap);
  const brim = part(0.4, 0.05, 0.3, mat(0x1a2f4a, 0.8, 0), 0, 2.42, 0.42);
  group.add(brim);
  const legMat = mat(0x2c4a6b, 0.9, 0);
  const legL = part(0.24, 0.85, 0.24, legMat, -0.2, 0.42, 0);
  const legR = part(0.24, 0.85, 0.24, legMat, 0.2, 0.42, 0);
  group.add(legL);
  group.add(legR);
  const armL = part(0.22, 0.8, 0.22, mat(0xe8481f, 0.8, 0), -0.58, 1.35, 0);
  const armR = part(0.22, 0.8, 0.22, mat(0xe8481f, 0.8, 0), 0.58, 1.35, 0);
  group.add(armL);
  group.add(armR);
  group.userData.legs = [legL, legR];
  group.userData.arms = [armL, armR];
  return group;
}

// A glowing mission marker: a floating diamond and a ring on the ground.
export function makeMarkerMesh() {
  const group = new THREE.Group();
  const diamond = new THREE.Mesh(
    new THREE.OctahedronGeometry(1.1),
    new THREE.MeshStandardMaterial({ color: 0xffd23f, emissive: 0xffb300, emissiveIntensity: 1.4 }),
  );
  diamond.position.y = 4;
  group.add(diamond);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.2, 3.0, 24),
    new THREE.MeshBasicMaterial({ color: 0xffd23f, side: THREE.DoubleSide, transparent: true, opacity: 0.8 }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.15;
  group.add(ring);
  group.userData.diamond = diamond;
  return group;
}
