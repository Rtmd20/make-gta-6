// Verde Cay's city: a 6x6 block grid west of a palm boulevard, beach and sea
// to the east, a marina in the south-east and a striped lighthouse on the
// north-east point. Everything is built from boxes, cylinders and the
// procedural textures — no imported models.
import * as THREE from 'three';
import { CITY } from './config.js';
import { RNG } from './random.js';

const PITCH = CITY.block + CITY.street; // 58

export function roadLines() {
  const lines = [];
  for (let i = 0; i <= CITY.cols; i++) lines.push(-CITY.cols / 2 * PITCH + i * PITCH);
  return lines; // -174, -116, -58, 0, 58, 116, 174
}

export function blockCenters() {
  const centers = [];
  for (let i = 0; i < CITY.cols; i++) centers.push(-CITY.cols / 2 * PITCH + PITCH / 2 + i * PITCH);
  return centers; // -145, -87, -29, 29, 87, 145
}

export function buildCity(scene, textures) {
  const rng = new RNG(77001);
  const colliders = [];
  const group = new THREE.Group();
  group.name = 'city';
  scene.add(group);

  // --- Ground: asphalt base -------------------------------------------------
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(560, 560),
    new THREE.MeshStandardMaterial({ map: textures.asphalt, roughness: 0.95 }),
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(20, 0, 0);
  ground.receiveShadow = true;
  group.add(ground);

  // --- Beach sand strip ------------------------------------------------------
  const beach = new THREE.Mesh(
    new THREE.PlaneGeometry(44, 560),
    new THREE.MeshStandardMaterial({ map: textures.sand, roughness: 1 }),
  );
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(CITY.beachX0 + 18, 0.15, 0);
  beach.receiveShadow = true;
  group.add(beach);

  // --- Block pads + buildings -------------------------------------------------
  const centers = blockCenters();
  const neonMats = [0, 1, 2, 3, 4].map((i) => new THREE.MeshBasicMaterial({ map: textures['neon' + i] }));
  let neonIdx = 0;
  for (const cx of centers) {
    for (const cz of centers) {
      // Skip the marina block (south-east corner block is the marina yard).
      if (cx === 145 && cz === 145) continue;
      const pad = new THREE.Mesh(
        new THREE.BoxGeometry(CITY.block, 0.5, CITY.block),
        new THREE.MeshStandardMaterial({ map: textures.sidewalk, roughness: 0.9 }),
      );
      pad.position.set(cx, 0.25, cz);
      pad.receiveShadow = true;
      group.add(pad);

      const nBuild = rng.int(1, 3);
      for (let b = 0; b < nBuild; b++) {
        const w = rng.range(12, 20);
        const d = rng.range(12, 20);
        const h = rng.range(11, 38);
        const bx = cx + rng.range(-9, 9);
        const bz = cz + rng.range(-9, 9);
        const facade = textures['facade' + rng.int(0, 4)];
        const mat = new THREE.MeshStandardMaterial({ map: facade, roughness: 0.85 });
        const building = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
        building.position.set(bx, h / 2 + 0.5, bz);
        building.castShadow = true;
        building.receiveShadow = true;
        group.add(building);
        colliders.push({ x0: bx - w / 2, x1: bx + w / 2, z0: bz - d / 2, z1: bz + d / 2 });
        // Parapet rim
        const rim = new THREE.Mesh(
          new THREE.BoxGeometry(w + 0.6, 0.9, d + 0.6),
          new THREE.MeshStandardMaterial({ color: 0x2c2c30, roughness: 0.9 }),
        );
        rim.position.set(bx, h + 0.9, bz);
        group.add(rim);
        // Roof clutter: AC box and sometimes a water tank
        const ac = new THREE.Mesh(
          new THREE.BoxGeometry(2.4, 1.4, 1.8),
          new THREE.MeshStandardMaterial({ color: 0x77777f, roughness: 0.8 }),
        );
        ac.position.set(bx + rng.range(-w / 4, w / 4), h + 1.9, bz + rng.range(-d / 4, d / 4));
        group.add(ac);
        if (rng.chance(0.45)) {
          const tank = new THREE.Mesh(
            new THREE.CylinderGeometry(1.6, 1.6, 3.2, 10),
            new THREE.MeshStandardMaterial({ color: 0x9aa4a8, roughness: 0.6, metalness: 0.3 }),
          );
          tank.position.set(bx + w / 4, h + 2.6, bz - d / 4);
          group.add(tank);
        }
        // Neon sign on some tall buildings, facing the nearest road
        if (h > 20 && rng.chance(0.5)) {
          const sign = new THREE.Mesh(
            new THREE.PlaneGeometry(10, 2.5),
            neonMats[neonIdx++ % neonMats.length],
          );
          sign.position.set(bx, h * 0.72, bz + d / 2 + 0.15);
          group.add(sign);
        }
      }
    }
  }

  // --- Crosswalks at the main intersections -----------------------------------
  const lines = roadLines();
  for (const lx of lines) {
    for (const lz of lines) {
      if (Math.abs(lx) > 180 || Math.abs(lz) > 180) continue;
      if (rng.chance(0.5)) continue;
      const cw = new THREE.Mesh(
        new THREE.PlaneGeometry(12, 12),
        new THREE.MeshStandardMaterial({ map: textures.crosswalk, roughness: 0.9, transparent: true }),
      );
      cw.rotation.x = -Math.PI / 2;
      cw.position.set(lx, 0.06, lz);
      group.add(cw);
    }
  }

  // --- Street lights along every road ------------------------------------------
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2a2a2e, roughness: 0.6, metalness: 0.5 });
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffe9a8 });
  for (const lz of lines) {
    for (let x = -170; x <= 170; x += 58) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.22, 7, 8), poleMat);
      pole.position.set(x + 8, 3.5, lz + 7.5);
      group.add(pole);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.42, 8, 8), lampMat);
      lamp.position.set(x + 8, 7.1, lz + 7.5);
      group.add(lamp);
    }
  }

  // --- Traffic lights at the boulevard intersections ---------------------------
  for (const lz of [-116, -58, 0, 58, 116]) {
    const housing = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 2.2, 0.7),
      new THREE.MeshStandardMaterial({ color: 0x1c1c20, roughness: 0.7 }),
    );
    housing.position.set(170, 3.4, lz + 8);
    group.add(housing);
    for (let i = 0; i < 3; i++) {
      const lamp = new THREE.Mesh(
        new THREE.CircleGeometry(0.24, 10),
        new THREE.MeshBasicMaterial({ color: i === 0 ? '#ff3b30' : i === 1 ? '#ffcc00' : '#34c759' }),
      );
      lamp.position.set(170, 4.2 - i * 0.7, lz + 8.36);
      group.add(lamp);
    }
  }

  // --- Palms along the boulevard ----------------------------------------------
  const palms = [];
  const palmMat = new THREE.MeshStandardMaterial({ map: textures.palmBark, roughness: 1 });
  const leafMat = new THREE.MeshStandardMaterial({
    map: textures.palmLeaf, transparent: true, side: THREE.DoubleSide, roughness: 1, alphaTest: 0.15,
  });
  function makePalm(x, z, scale = 1) {
    const palm = new THREE.Group();
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28 * scale, 0.42 * scale, 7 * scale, 7), palmMat);
    trunk.position.y = 3.5 * scale;
    trunk.rotation.z = rng.range(-0.09, 0.09);
    trunk.castShadow = true;
    palm.add(trunk);
    for (let i = 0; i < 2; i++) {
      const leaves = new THREE.Mesh(new THREE.PlaneGeometry(5.4 * scale, 5.4 * scale), leafMat);
      leaves.position.y = 7.1 * scale;
      leaves.rotation.x = -Math.PI / 2 + rng.range(-0.2, 0.2);
      leaves.rotation.z = i * Math.PI / 2 + rng.range(0, 0.6);
      palm.add(leaves);
    }
    palm.position.set(x, 0, z);
    group.add(palm);
    palms.push(palm);
    return palm;
  }
  for (let z = -168; z <= 168; z += 24) {
    makePalm(CITY.boulevardX - 9 + rng.range(-1.5, 1.5), z + rng.range(-3, 3), rng.range(0.9, 1.25));
    if (rng.chance(0.7)) makePalm(CITY.boulevardX + 10 + rng.range(-1.5, 1.5), z + 12 + rng.range(-3, 3), rng.range(0.85, 1.15));
  }
  // A few palms on blocks and at the marina
  for (let i = 0; i < 14; i++) {
    makePalm(rng.range(-160, 160), rng.range(-160, 160), rng.range(0.8, 1.1));
  }

  // --- Marina: wooden deck, finger piers, moored boats -------------------------
  const marina = new THREE.Group();
  marina.name = 'marina';
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(40, 1, 56),
    new THREE.MeshStandardMaterial({ map: textures.wood, roughness: 0.9 }),
  );
  deck.position.set(212, 0.5, 148);
  deck.receiveShadow = true;
  marina.add(deck);
  for (let i = 0; i < 3; i++) {
    const pier = new THREE.Mesh(
      new THREE.BoxGeometry(26, 0.8, 5),
      new THREE.MeshStandardMaterial({ map: textures.wood, roughness: 0.9 }),
    );
    pier.position.set(244, 0.5, 128 + i * 20);
    marina.add(pier);
  }
  group.add(marina);
  colliders.push({ x0: 192, x1: 232, z0: 120, z1: 176 });

  // --- Lighthouse on the north-east point ---------------------------------------
  const lh = new THREE.Group();
  lh.name = 'lighthouse';
  const tower = new THREE.Mesh(
    new THREE.CylinderGeometry(3.2, 4.4, 34, 14),
    new THREE.MeshStandardMaterial({ map: textures.lighthouse, roughness: 0.8 }),
  );
  tower.position.y = 17;
  tower.castShadow = true;
  lh.add(tower);
  const gallery = new THREE.Mesh(
    new THREE.CylinderGeometry(4.6, 4.6, 1.2, 14),
    new THREE.MeshStandardMaterial({ color: 0x222226, roughness: 0.7 }),
  );
  gallery.position.y = 34.6;
  lh.add(gallery);
  const lampRoom = new THREE.Mesh(
    new THREE.CylinderGeometry(2.6, 2.6, 3.4, 12),
    new THREE.MeshStandardMaterial({ color: 0xffe9a8, emissive: 0xffd27a, emissiveIntensity: 1.4 }),
  );
  lampRoom.position.y = 36.8;
  lh.add(lampRoom);
  const cap = new THREE.Mesh(
    new THREE.ConeGeometry(3.4, 2.6, 12),
    new THREE.MeshStandardMaterial({ color: 0x8c2f22, roughness: 0.7 }),
  );
  cap.position.y = 39.4;
  lh.add(cap);
  // Searchlight cone (rotates in render.js)
  const coneGeo = new THREE.ConeGeometry(7, 46, 16, 1, true);
  coneGeo.translate(0, -23, 0);
  coneGeo.rotateX(-Math.PI / 2);
  const coneMat = new THREE.MeshBasicMaterial({
    color: 0xfff2c0, transparent: true, opacity: 0.16, side: THREE.DoubleSide, depthWrite: false,
  });
  const cone = new THREE.Mesh(coneGeo, coneMat);
  cone.position.y = 37;
  lh.add(cone);
  const beacon = new THREE.SpotLight(0xffe9a8, 220, 220, 0.32, 0.5, 1.2);
  beacon.position.set(0, 37, 0);
  lh.add(beacon);
  lh.add(beacon.target);
  lh.position.set(CITY.lighthouse.x, 0, CITY.lighthouse.z);
  group.add(lh);
  colliders.push({
    x0: CITY.lighthouse.x - 5, x1: CITY.lighthouse.x + 5,
    z0: CITY.lighthouse.z - 5, z1: CITY.lighthouse.z + 5,
  });

  // --- Job 4 roadblock props on the boulevard (barriers + cones) -----------------
  const roadblock = new THREE.Group();
  roadblock.name = 'roadblock';
  const barrierMat = new THREE.MeshStandardMaterial({ color: 0xe8622c, roughness: 0.7 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xf5f0e6, roughness: 0.7 });
  for (const dx of [-7, 0, 7]) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(5.4, 1.1, 0.5), barrierMat);
    bar.position.set(dx, 0.9, 0);
    roadblock.add(bar);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.35, 0.54), stripeMat);
    stripe.position.set(dx, 0.9, 0);
    roadblock.add(stripe);
    for (const leg of [-2.2, 2.2]) {
      const legMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.9, 0.8), barrierMat);
      legMesh.position.set(dx + leg, 0.45, 0);
      roadblock.add(legMesh);
    }
  }
  roadblock.position.set(CITY.boulevardX, 0, -40);
  roadblock.visible = false; // shown when Job 4 starts
  group.add(roadblock);

  // --- Traffic loops: rectangles around blocks -----------------------------------
  const loops = [];
  for (const cx of centers) {
    for (const cz of centers) {
      if (cx === 145 && cz === 145) continue;
      const half = PITCH / 2;
      loops.push([
        { x: cx - half, z: cz - half },
        { x: cx + half, z: cz - half },
        { x: cx + half, z: cz + half },
        { x: cx - half, z: cz + half },
      ]);
    }
  }

  return {
    group, colliders, palms, loops,
    lighthouse: { group: lh, cone, beacon },
    roadblock,
    beachX0: CITY.beachX0,
    seaX0: CITY.seaX0,
  };
}
