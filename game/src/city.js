// Verde Cay — the city itself: ground, roads, buildings, palms, lighthouse,
// marina, street furniture, the animated sea and the sunset sky.
import * as THREE from 'three';
import { WORLD, STREETS } from './config.js';
import {
  asphaltTexture, sandTexture, grassTexture, facadeTextures, woodTexture,
  waterNormalTexture, palmBarkTexture, palmLeafTexture, neonSignTexture,
  crosswalkTexture,
} from './textures.js';

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SUN_DIR = new THREE.Vector3(-0.55, 0.28, -0.35).normalize();

function skyMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: { sunDir: { value: SUN_DIR } },
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      varying vec3 vDir;
      uniform vec3 sunDir;
      float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main() {
        float h = clamp(vDir.y, -0.05, 1.0);
        vec3 top = vec3(0.16, 0.10, 0.34);
        vec3 mid = vec3(0.85, 0.38, 0.42);
        vec3 low = vec3(1.0, 0.62, 0.28);
        vec3 col = mix(low, mid, smoothstep(0.0, 0.22, h));
        col = mix(col, top, smoothstep(0.18, 0.65, h));
        float sunAmt = max(dot(normalize(vDir), sunDir), 0.0);
        col += vec3(1.0, 0.75, 0.4) * pow(sunAmt, 220.0) * 3.0;
        col += vec3(1.0, 0.55, 0.25) * pow(sunAmt, 8.0) * 0.55;
        // Slow cloud bands, pink-lit.
        float cl = sin(vDir.x * 9.0 + vDir.y * 22.0) * sin(vDir.z * 7.0 - vDir.y * 14.0);
        float band = smoothstep(0.55, 0.95, cl) * smoothstep(0.02, 0.18, vDir.y);
        col = mix(col, vec3(1.0, 0.62, 0.55), band * 0.45);
        float grain = hash(gl_FragCoord.xy * 0.7) * 0.03;
        gl_FragColor = vec4(col + grain, 1.0);
      }`,
  });
}

export function buildCity(scene) {
  const rng = mulberry32(20261122);
  const colliders = [];
  const palms = [];

  // --- Lights ---------------------------------------------------------------
  const sun = new THREE.DirectionalLight(0xffb36b, 2.4);
  sun.position.copy(SUN_DIR).multiplyScalar(220);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -240; sun.shadow.camera.right = 240;
  sun.shadow.camera.top = 240; sun.shadow.camera.bottom = -240;
  sun.shadow.camera.far = 600;
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xff9a7a, 0x2a1a2e, 1.15));
  scene.add(new THREE.AmbientLight(0x604050, 0.5));
  // Warm fill from the south-east (the chase camera's side) so the hero car's
  // rear and the road read instead of falling black against the sunset.
  const fill = new THREE.DirectionalLight(0xffc490, 1.0);
  fill.position.set(60, 45, 140);
  scene.add(fill);
  scene.fog = new THREE.Fog(0xdd7a4a, 160, 560);

  // --- Sky dome --------------------------------------------------------------
  const sky = new THREE.Mesh(new THREE.SphereGeometry(880, 24, 16), skyMaterial());
  scene.add(sky);

  // --- Ground: grass city floor, sand beach, sea ----------------------------
  const grass = new THREE.Mesh(
    new THREE.PlaneGeometry(700, 700),
    new THREE.MeshStandardMaterial({ map: grassTexture(), roughness: 1 }),
  );
  grass.rotation.x = -Math.PI / 2; grass.position.set(60, -0.05, 0);
  grass.receiveShadow = true;
  scene.add(grass);

  const sand = new THREE.Mesh(
    new THREE.PlaneGeometry(46, 460),
    new THREE.MeshStandardMaterial({ map: sandTexture(), roughness: 1 }),
  );
  sand.rotation.x = -Math.PI / 2; sand.position.set(WORLD.beachX + 8, 0.0, 0);
  sand.receiveShadow = true;
  scene.add(sand);

  // Sea: a wide animated plane east of the beach.
  const seaGeo = new THREE.PlaneGeometry(420, 560, 42, 42);
  seaGeo.rotateX(-Math.PI / 2);
  const seaBase = seaGeo.attributes.position.array.slice();
  const sea = new THREE.Mesh(
    seaGeo,
    new THREE.MeshStandardMaterial({
      color: 0x1d6f8f, map: waterNormalTexture(), roughness: 0.32, metalness: 0.25,
      transparent: true, opacity: 0.94,
    }),
  );
  sea.position.set(WORLD.seaX + 190, 0.15, 0);
  sea.receiveShadow = true;
  scene.add(sea);

  // Foam line where the sea meets the sand.
  const foam = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 460),
    new THREE.MeshBasicMaterial({ color: 0xf5efe0, transparent: true, opacity: 0.5 }),
  );
  foam.rotation.x = -Math.PI / 2; foam.position.set(WORLD.seaX - 2, 0.22, 0);
  scene.add(foam);

  // --- Roads ------------------------------------------------------------------
  const asphalt = asphaltTexture();
  const roadMat = new THREE.MeshStandardMaterial({ map: asphalt, roughness: 0.95 });
  const walkMat = new THREE.MeshStandardMaterial({ color: 0x9a8f80, roughness: 1 });
  function road(x, z, w, l) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, l), roadMat);
    m.rotation.x = -Math.PI / 2; m.position.set(x, 0.02, z);
    m.receiveShadow = true;
    scene.add(m);
  }
  for (const ax of STREETS.avenues) road(ax, 0, 14, 460);
  for (const cz of STREETS.cross) road(0, cz, 460, 14);
  // Sidewalks along the boulevard.
  for (const sx of [WORLD.boulevardX - 9.5, WORLD.boulevardX + 9.5]) {
    const sw = new THREE.Mesh(new THREE.PlaneGeometry(4, 460), walkMat);
    sw.rotation.x = -Math.PI / 2; sw.position.set(sx, 0.03, 0);
    sw.receiveShadow = true;
    scene.add(sw);
  }
  // Crosswalks at the boulevard's two busiest crossings.
  const crossTex = crosswalkTexture();
  for (const cz of [-30, 90]) {
    const cw = new THREE.Mesh(new THREE.PlaneGeometry(14, 12),
      new THREE.MeshStandardMaterial({ map: crossTex, roughness: 0.9 }));
    cw.rotation.x = -Math.PI / 2; cw.position.set(WORLD.boulevardX, 0.04, cz);
    scene.add(cw);
  }

  // --- Buildings ---------------------------------------------------------------
  const facades = facadeTextures();
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x3a3230, roughness: 1 });
  const neonDefs = [
    { text: 'CAFÉ SOL', colour: '#ff5d8f' }, { text: 'TIDES', colour: '#38bdf8' },
    { text: 'PALM MART', colour: '#facc15' }, { text: 'NEON GRILL', colour: '#4ade80' },
    { text: 'SURF SHOP', colour: '#fb923c' }, { text: 'HOTEL MAR', colour: '#c084fc' },
  ];
  let neonIdx = 0;
  const blockXs = [-96, -48, 0, 48, 96];
  const blockZs = [-150, -90, -30, 30, 90, 150];
  for (const bx of blockXs) {
    for (const bz of blockZs) {
      // Leave the marina corner and the boulevard frontage open.
      if (bx === 96 && bz >= 90) continue;
      if (rng() < 0.18) continue; // occasional plaza / car park
      const w = 22 + rng() * 10, d = 20 + rng() * 10, h = 14 + rng() * 34;
      const cx = bx + (rng() - 0.5) * 8, cz = bz + (rng() - 0.5) * 8;
      const tex = facades[(rng() * facades.length) | 0];
      const mats = [0, 1, 2, 3].map(() => new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 }));
      mats.push(roofMat); mats.push(roofMat);
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mats);
      b.position.set(cx, h / 2, cz);
      b.castShadow = true; b.receiveShadow = true;
      scene.add(b);
      colliders.push({ minX: cx - w / 2, maxX: cx + w / 2, minZ: cz - d / 2, maxZ: cz + d / 2 });
      // Parapet, AC box and water tank on the roof.
      const par = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 1.1, d + 0.6), roofMat);
      par.position.set(cx, h + 0.5, cz); scene.add(par);
      if (rng() < 0.7) {
        const ac = new THREE.Mesh(new THREE.BoxGeometry(3, 1.4, 2.4),
          new THREE.MeshStandardMaterial({ color: 0x8a8f96, roughness: 0.8, metalness: 0.4 }));
        ac.position.set(cx + (rng() - 0.5) * (w - 6), h + 1.6, cz + (rng() - 0.5) * (d - 5));
        ac.castShadow = true; scene.add(ac);
      }
      if (rng() < 0.45) {
        const tank = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 4, 10),
          new THREE.MeshStandardMaterial({ color: 0x7a6a55, roughness: 0.9 }));
        tank.position.set(cx + w / 4, h + 2.6, cz - d / 4);
        tank.castShadow = true; scene.add(tank);
      }
      // Neon sign on boulevard-facing buildings.
      if (bx === 96 && neonIdx < neonDefs.length && rng() < 0.85) {
        const nd = neonDefs[neonIdx++];
        const sign = new THREE.Mesh(new THREE.PlaneGeometry(16, 4),
          new THREE.MeshBasicMaterial({ map: neonSignTexture(nd.text, nd.colour) }));
        sign.position.set(cx + w / 2 + 0.3, Math.min(h - 3, 22), cz);
        sign.rotation.y = Math.PI / 2;
        scene.add(sign);
      }
    }
  }

  // --- Palms ------------------------------------------------------------------
  const barkMat = new THREE.MeshStandardMaterial({ map: palmBarkTexture(), roughness: 1 });
  const leafTex = palmLeafTexture();
  const leafMat = new THREE.MeshStandardMaterial({
    map: leafTex, transparent: true, side: THREE.DoubleSide, roughness: 0.9, alphaTest: 0.05,
  });
  function palm(x, z, lean = 0.12) {
    const g = new THREE.Group();
    const segs = 5;
    let px = 0, py = 0;
    for (let i = 0; i < segs; i++) {
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.32 - i * 0.03, 0.38 - i * 0.03, 2.2, 7), barkMat);
      px += lean; py += 2.1;
      seg.position.set(px, py - 1.05, 0);
      seg.rotation.z = -lean * 0.9;
      seg.castShadow = true;
      g.add(seg);
    }
    const crown = new THREE.Group();
    crown.position.set(px + 0.4, py + 0.4, 0);
    for (let i = 0; i < 7; i++) {
      const leaf = new THREE.Mesh(new THREE.PlaneGeometry(5.4, 2.6), leafMat);
      leaf.rotation.y = (i / 7) * Math.PI * 2;
      leaf.rotation.x = -0.5 - (i % 2) * 0.25;
      leaf.position.y = 0.4;
      crown.add(leaf);
    }
    g.add(crown);
    const coconuts = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0x6b4a2f, roughness: 1 }));
    coconuts.position.set(px + 0.4, py - 0.2, 0.3);
    g.add(coconuts);
    g.position.set(x, 0, z);
    g.rotation.y = rng() * Math.PI * 2;
    scene.add(g);
    palms.push(g);
    return g;
  }
  for (let z = -210; z <= 210; z += 28) {
    palm(WORLD.boulevardX - 13, z + (rng() - 0.5) * 6);
    if (rng() < 0.7) palm(WORLD.boulevardX + 13.5, z + 14 + (rng() - 0.5) * 6);
  }
  for (let z = -190; z <= 200; z += 34) palm(WORLD.beachX + 14 + rng() * 8, z);

  // --- Lighthouse ----------------------------------------------------------------
  const lh = new THREE.Group();
  const stripeCols = [0xf5efe0, 0xd43d2a];
  for (let i = 0; i < 6; i++) {
    const seg = new THREE.Mesh(new THREE.CylinderGeometry(4.6 - i * 0.28, 5.0 - i * 0.28, 6, 14),
      new THREE.MeshStandardMaterial({ color: stripeCols[i % 2], roughness: 0.85 }));
    seg.position.y = 3 + i * 6;
    seg.castShadow = true;
    lh.add(seg);
  }
  const lampRoom = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 4, 12),
    new THREE.MeshStandardMaterial({ color: 0x222222, roughness: 0.4, metalness: 0.6 }));
  lampRoom.position.y = 41; lh.add(lampRoom);
  const beaconBulb = new THREE.Mesh(new THREE.SphereGeometry(1.6, 12, 10),
    new THREE.MeshBasicMaterial({ color: 0xffe9a8 }));
  beaconBulb.position.y = 41; lh.add(beaconBulb);
  const beacon = new THREE.SpotLight(0xffe9a8, 900, 320, 0.32, 0.5, 1.2);
  beacon.position.set(0, 41, 0);
  lh.add(beacon);
  const beaconTarget = new THREE.Object3D();
  beaconTarget.position.set(60, 0, 60);
  lh.add(beaconTarget);
  beacon.target = beaconTarget;
  const lhBase = new THREE.Mesh(new THREE.CylinderGeometry(7, 8, 3, 14),
    new THREE.MeshStandardMaterial({ color: 0x8a7a66, roughness: 1 }));
  lhBase.position.y = 1.2; lh.add(lhBase);
  lh.position.set(178, 0, -185);
  scene.add(lh);
  colliders.push({ minX: 170, maxX: 186, minZ: -193, maxZ: -177 });

  // --- Marina --------------------------------------------------------------------
  const wood = woodTexture();
  const woodMat = new THREE.MeshStandardMaterial({ map: wood, roughness: 0.9 });
  const dockSpots = [];
  for (let d = 0; d < 3; d++) {
    const dock = new THREE.Mesh(new THREE.BoxGeometry(26, 1.1, 5), woodMat);
    dock.position.set(196, 0.6, 118 + d * 26);
    dock.castShadow = true; dock.receiveShadow = true;
    scene.add(dock);
    for (let p = 0; p < 4; p++) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 2.6, 8), woodMat);
      post.position.set(184 + p * 8, 1.2, 118 + d * 26 - 2.4);
      scene.add(post);
    }
    dockSpots.push({ x: 196, z: 118 + d * 26 });
  }
  // Breakwater rocks at the harbour mouth.
  const rockMat = new THREE.MeshStandardMaterial({ color: 0x5a564e, roughness: 1 });
  for (let i = 0; i < 12; i++) {
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(2.2 + rng() * 2.4, 0), rockMat);
    rock.position.set(228 + rng() * 14, 0.6, -20 + i * 12);
    rock.rotation.set(rng() * 3, rng() * 3, rng() * 3);
    rock.castShadow = true;
    scene.add(rock);
  }

  // --- Street lights and traffic lights -------------------------------------------
  const poleMat = new THREE.MeshStandardMaterial({ color: 0x2c2f36, roughness: 0.6, metalness: 0.5 });
  const lampMat = new THREE.MeshBasicMaterial({ color: 0xffe2a8 });
  function streetLight(x, z) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 7, 8), poleMat);
    pole.position.y = 3.5; pole.castShadow = true; g.add(pole);
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 2.6, 6), poleMat);
    arm.rotation.z = Math.PI / 2; arm.position.set(1.2, 6.9, 0); g.add(arm);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.32, 10, 8), lampMat);
    lamp.position.set(2.4, 6.8, 0); g.add(lamp);
    g.position.set(x, 0, z);
    scene.add(g);
  }
  for (let z = -196; z <= 196; z += 28) streetLight(WORLD.boulevardX - 10.5, z);
  for (const ax of [-48, 0, 48]) for (let z = -140; z <= 140; z += 70) streetLight(ax - 8, z);
  function trafficLight(x, z, ry) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 6.4, 8), poleMat);
    pole.position.y = 3.2; g.add(pole);
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.7, 2.0, 0.7),
      new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5 }));
    box.position.y = 6.4; g.add(box);
    const cols = [0xff3b30, 0xffcc00, 0x34c759];
    cols.forEach((c, i) => {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8),
        new THREE.MeshBasicMaterial({ color: c }));
      lamp.position.set(0, 7.0 - i * 0.6, 0.38);
      g.add(lamp);
    });
    g.position.set(x, 0, z); g.rotation.y = ry;
    scene.add(g);
  }
  trafficLight(WORLD.boulevardX - 8, -30, Math.PI / 2);
  trafficLight(WORLD.boulevardX - 8, 90, Math.PI / 2);
  trafficLight(0, -30, 0);

  // --- Roadblock props for the Harbor Lights chase ---------------------------------
  const barrierMat = new THREE.MeshStandardMaterial({ color: 0xff7a1a, roughness: 0.7 });
  const stripeMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f0, roughness: 0.7 });
  const roadblocks = [];
  for (let i = 0; i < 3; i++) {
    const rb = new THREE.Group();
    const bar = new THREE.Mesh(new THREE.BoxGeometry(5.4, 0.9, 0.5), i % 2 ? stripeMat : barrierMat);
    bar.position.y = 1.0; bar.castShadow = true; rb.add(bar);
    for (const lx of [-2.4, 2.4]) {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.4, 1.1, 1.4), poleMat);
      leg.position.set(lx, 0.55, 0); rb.add(leg);
    }
    rb.position.set(WORLD.boulevardX - 4 + i * 4.5, 0, 40);
    rb.rotation.y = (i - 1) * 0.22;
    scene.add(rb);
    roadblocks.push(rb);
  }

  return {
    colliders, roadblocks, beacon, beaconTarget, lighthousePos: new THREE.Vector3(178, 0, -185),
    marinaPos: new THREE.Vector3(196, 0, 144), dockSpots,
    updateSea(t) {
      const pos = sea.geometry.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const bx = seaBase[i * 3], bz = seaBase[i * 3 + 2];
        pos.array[i * 3 + 1] = Math.sin(bx * 0.08 + t * 1.1) * 0.35
          + Math.cos(bz * 0.06 + t * 0.8) * 0.3
          + Math.sin((bx + bz) * 0.05 + t * 1.7) * 0.18;
      }
      pos.needsUpdate = true;
      sea.geometry.computeVertexNormals();
      sea.material.map.offset.set(t * 0.008, t * 0.004);
      foam.material.opacity = 0.38 + Math.sin(t * 1.3) * 0.14;
    },
  };
}

// A roadblock explosion: an unlit orange shell, a hot core and a soft smoke
// capsule that rises and fades. Returns the group; call tickExplosion to animate.
export function makeExplosion(scene, x, z) {
  const g = new THREE.Group();
  const shell = new THREE.Mesh(new THREE.SphereGeometry(2.7, 14, 12),
    new THREE.MeshBasicMaterial({ color: 0xff5a00, transparent: true, opacity: 0.92 }));
  shell.scale.y = 0.75; shell.position.y = 1.8;
  const core = new THREE.Mesh(new THREE.SphereGeometry(1.15, 12, 10),
    new THREE.MeshBasicMaterial({ color: 0xffd23e }));
  core.position.y = 1.6;
  const smoke = new THREE.Mesh(new THREE.CapsuleGeometry(1.1, 2.2, 6, 10),
    new THREE.MeshStandardMaterial({ color: 0x5a5148, transparent: true, opacity: 0.3, roughness: 1 }));
  smoke.position.y = 5.0;
  smoke.rotation.z = 0.5;
  const glow = new THREE.PointLight(0xff7a1a, 320, 60, 1.6);
  glow.position.y = 3;
  g.add(shell, core, smoke, glow);
  g.position.set(x, 0, z);
  scene.add(g);
  return { group: g, shell, core, smoke, glow, age: 0 };
}

export function tickExplosion(e, dt) {
  e.age += dt;
  const s = 1 + Math.sin(Math.min(e.age * 3, Math.PI)) * 0.25;
  e.shell.scale.set(s, s * 0.8, s);
  e.shell.material.opacity = Math.max(0, 0.9 - e.age * 0.35);
  e.core.material.opacity = Math.max(0, 1 - e.age * 0.5);
  e.smoke.position.y = 5.0 + e.age * 1.4;
  e.smoke.material.opacity = Math.max(0, 0.3 - e.age * 0.1);
  e.glow.intensity = Math.max(0, 320 - e.age * 130);
}
