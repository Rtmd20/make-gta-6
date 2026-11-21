// Verde Cay's city: a sun-soaked 3D island with procedural facades, neon,
// palms, street props and a striped lighthouse. Everything is built from
// code and canvas textures — no model files, no borrowed art.
import * as THREE from 'three';
import { CITY, GOLDEN } from './config.js';
import {
  asphaltTexture, facadeTextures, sandTexture, woodTexture,
  waterNormalTexture, palmFrondTexture, palmBarkTexture, neonSignTexture,
} from './textures.js';

// Shared geometry/materials — reused across the whole city.
const unitBox = new THREE.BoxGeometry(1, 1, 1);
const palmTrunkGeo = new THREE.CylinderGeometry(0.22, 0.42, 2.6, 7);
const frondGeo = new THREE.PlaneGeometry(1.1, 4.4);
let frondMat = null;
let barkMat = null;

function std(params) { return new THREE.MeshStandardMaterial(params); }

function boxMesh(w, h, d, material, x, y, z) {
  const mesh = new THREE.Mesh(unitBox, material);
  mesh.scale.set(w, h, d);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function makePalm(rng) {
  const group = new THREE.Group();
  if (!frondMat) {
    frondMat = new THREE.MeshStandardMaterial({
      map: palmFrondTexture(), transparent: true, alphaTest: 0.15,
      side: THREE.DoubleSide, roughness: 0.9, color: 0xffffff,
      emissive: 0x2a6a35, emissiveIntensity: 0.45,
    });
    barkMat = new THREE.MeshStandardMaterial({ map: palmBarkTexture(), roughness: 1 });
  }
  // Curved trunk: three segments leaning a little further each time.
  let x = 0; let lean = rng.range(-0.12, 0.12);
  for (let i = 0; i < 3; i += 1) {
    const seg = new THREE.Mesh(palmTrunkGeo, barkMat);
    seg.position.set(x, 1.3 + i * 2.45, 0);
    seg.rotation.z = lean * (i + 1);
    seg.castShadow = true;
    group.add(seg);
    x += Math.sin(lean * (i + 1)) * 2.4;
  }
  const topX = x; const topY = 7.4;
  const frondCount = 8;
  for (let i = 0; i < frondCount; i += 1) {
    const a = (i / frondCount) * Math.PI * 2 + rng.range(0, 0.4);
    const frond = new THREE.Mesh(frondGeo, frondMat);
    frond.position.set(topX + Math.cos(a) * 1.1, topY - 0.4, Math.sin(a) * 1.1);
    frond.rotation.set(0.5 + rng.range(0, 0.35), a + Math.PI / 2, 0, 'YXZ');
    frond.rotation.y = a;
    frond.rotation.x = -1.05 - rng.range(0, 0.3);
    frond.rotation.z = 0;
    // Orient the frond outward and drooping: rotate about its local X after yaw.
    frond.rotation.order = 'YXZ';
    frond.rotation.y = a + Math.PI;
    frond.rotation.x = 0.75 + rng.range(0, 0.25);
    frond.castShadow = true;
    group.add(frond);
  }
  const nuts = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 8, 6),
    std({ color: 0x6b4a22, roughness: 1 }),
  );
  nuts.position.set(topX, topY - 0.7, 0);
  group.add(nuts);
  return group;
}

const FACADE_VARIANTS = [
  { base: '#f2c98a', trim: '#b3541e' },
  { base: '#e8a0a0', trim: '#7a2a3a' },
  { base: '#a8c8e8', trim: '#2a4a6b' },
  { base: '#efe3c2', trim: '#5a7a3a' },
  { base: '#d9b8e8', trim: '#4a2a5a' },
];

function makeBuilding(rng, x, z, w, d, facades) {
  const h = rng.rangeInt(12, 46);
  const group = new THREE.Group();
  const variant = rng.pick(facades);
  const roofMat = std({ color: 0x4a3f35, roughness: 1 });
  const sideMat = new THREE.MeshStandardMaterial({
    map: variant.map, emissiveMap: variant.emissiveMap, emissive: 0xffb060,
    emissiveIntensity: 0.75, roughness: 0.85, metalness: 0.05,
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), [sideMat, sideMat, roofMat, roofMat, sideMat, sideMat]);
  body.position.y = h / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);
  // Parapet and roof clutter: AC boxes, a tank on tall towers, a setback floor.
  const parapet = boxMesh(w + 0.4, 0.9, d + 0.4, std({ color: 0x3a3230, roughness: 1 }), 0, h + 0.45, 0);
  group.add(parapet);
  if (h > 24) {
    const setback = boxMesh(w * 0.55, 3.5, d * 0.55, sideMat, rng.range(-2, 2), h + 2.2, rng.range(-2, 2));
    group.add(setback);
  }
  if (rng.chance(0.55)) {
    const ac = boxMesh(2.2, 1.1, 1.6, std({ color: 0x8a8f98, roughness: 0.7, metalness: 0.4 }), rng.range(-w / 4, w / 4), h + 1.4, rng.range(-d / 4, d / 4));
    group.add(ac);
  }
  if (h > 28 && rng.chance(0.5)) {
    const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 3.2, 10), std({ color: 0x6e5a40, roughness: 1 }));
    tank.position.set(w * 0.2, h + 2.6, 0);
    tank.castShadow = true;
    group.add(tank);
  }
  group.position.set(x, 0, z);
  return { group, height: h, x, z, w, d };
}

export function buildCity(scene, rng) {
  const colliders = [];
  const buildings = [];
  const palms = [];

  const facades = FACADE_VARIANTS.map((v, i) => facadeTextures(v.base, v.trim, 100 + i * 17));
  const asphalt = asphaltTexture();
  const sand = sandTexture();
  const wood = woodTexture();

  // Sky: gradient dome with a glowing sun disc and drifting clouds in the
  // shader, so the sunset reads even where no geometry is. The sun sits low
  // in the east, straight ahead of the boulevard chase, so the cover shot
  // drives into the sunset: pink-orange at the horizon, purple above.
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: {
      top: { value: new THREE.Color(0x5546a0) },
      mid: { value: new THREE.Color(0xff6a5e) },
      bot: { value: new THREE.Color(0x6e2f4a) },
      sunDir: { value: new THREE.Vector3(0.82, 0.16, 0.35).normalize() },
      sunColor: { value: new THREE.Color(0xffd9a0) },
    },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `
      varying vec3 vP; uniform vec3 top; uniform vec3 mid; uniform vec3 bot;
      uniform vec3 sunDir; uniform vec3 sunColor;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); f = f*f*(3.0-2.0*f);
        return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
      void main(){
        vec3 d = normalize(vP);
        float h = d.y;
        vec3 c = h > 0.0 ? mix(mid, top, pow(h, 0.5)) : mix(mid, bot, pow(-h, 0.45));
        float sunAmt = max(dot(d, sunDir), 0.0);
        c += sunColor * (pow(sunAmt, 220.0) * 1.6 + pow(sunAmt, 24.0) * 0.55 + pow(sunAmt, 6.0) * 0.22);
        // Thin sunset clouds, only near the horizon.
        if (h > 0.02 && h < 0.5) {
          float n = noise(d.xz / max(d.y, 0.08) * 1.4 + vec2(0.7, 0.2));
          float cloud = smoothstep(0.55, 0.8, n) * smoothstep(0.5, 0.12, h) * 0.38;
          c = mix(c, vec3(1.0, 0.74, 0.58), cloud);
        }
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const skyDome = new THREE.Mesh(new THREE.SphereGeometry(850, 32, 20), skyMat);
  scene.add(skyDome);
  scene.fog = new THREE.Fog(GOLDEN.fog, 200, 850);
  const hemi = new THREE.HemisphereLight(0xffc4a0, 0x2a3a55, 1.45);
  scene.add(hemi);
  // Fill light from the west so the facades the chase camera faces — the
  // west sides, away from the low eastern sun — still read in colour.
  const fill = new THREE.DirectionalLight(0x7a9cc8, 0.85);
  fill.position.set(-220, 140, 60);
  scene.add(fill);
  // The sun hangs low in the east, ahead of the boulevard chase, so the long
  // shadows fall back toward the camera and the facades catch the warm light.
  const sun = new THREE.DirectionalLight(GOLDEN.sun, 3.4);
  sun.position.set(260, 90, 180);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -260; sun.shadow.camera.right = 260;
  sun.shadow.camera.top = 260; sun.shadow.camera.bottom = -260;
  sun.shadow.camera.far = 900;
  sun.shadow.bias = -0.0006;
  scene.add(sun);
  scene.add(sun.target);

  // City ground: plain warm pavement (the sand texture stays on the beach).
  const landMat = std({ color: 0xa89a80, roughness: 1 });
  const land = new THREE.Mesh(new THREE.PlaneGeometry(700, 520), landMat);
  land.rotation.x = -Math.PI / 2;
  land.position.set(0, 0, -110);
  land.receiveShadow = true;
  scene.add(land);
  const beach = new THREE.Mesh(new THREE.PlaneGeometry(700, 46), std({ map: sand, roughness: 0.95, color: 0xf2d9a0 }));
  beach.rotation.x = -Math.PI / 2;
  beach.position.set(0, 0.06, 128);
  beach.receiveShadow = true;
  scene.add(beach);
  const wetSand = new THREE.Mesh(
    new THREE.PlaneGeometry(700, 10),
    std({ color: 0x9a7a52, roughness: 0.45, metalness: 0.1 }),
  );
  wetSand.rotation.x = -Math.PI / 2;
  wetSand.position.set(0, 0.09, 152);
  wetSand.receiveShadow = true;
  scene.add(wetSand);

  // Sea: segmented plane with a scrolling normal map and warm sunset sparkle.
  // Brighter and warmer than the last build — the old flat teal read as mud.
  const waterGeo = new THREE.PlaneGeometry(900, 340, 48, 18);
  const waterNormal = waterNormalTexture();
  const waterMat = new THREE.MeshStandardMaterial({
    color: 0x2a8aa8, roughness: 0.12, metalness: 0.7,
    normalMap: waterNormal, normalScale: new THREE.Vector2(1.1, 1.1),
    transparent: true, opacity: 0.97, emissive: 0x2a3a4a, emissiveIntensity: 0.5,
  });
  const water = new THREE.Mesh(waterGeo, waterMat);
  water.rotation.x = -Math.PI / 2;
  water.position.set(0, -0.4, 320);
  scene.add(water);
  const waterBase = waterGeo.attributes.position.array.slice();

  // Foam where the sea meets the sand, and a foam ring at the pier posts.
  const foamMat = std({ color: 0xeef6f2, roughness: 0.9, transparent: true, opacity: 0.55 });
  const foam = new THREE.Mesh(new THREE.PlaneGeometry(700, 6), foamMat);
  foam.rotation.x = -Math.PI / 2;
  foam.position.set(0, 0.12, 154);
  scene.add(foam);

  // Roads: textured asphalt strips, sidewalks, centre dashes and crosswalks.
  const roadMat = std({ map: asphalt, roughness: 0.55, metalness: 0.08, color: 0xffffff });
  const sidewalkMat = std({ color: 0xb8a88e, roughness: 0.95 });
  function flat(w, d, material, x, y, z) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), material);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, y, z);
    m.receiveShadow = true;
    scene.add(m);
    return m;
  }
  function road(x, z, w, d) {
    flat(w, d, roadMat, x, 0.08, z);
    flat(w + 4, d + 4, sidewalkMat, x, 0.05, z);
    flat(w, d, roadMat, x, 0.08, z);
  }
  for (let gx = -256; gx <= 256; gx += CITY.block) road(gx, -85, CITY.roadWidth, 640);
  for (let gz = -256; gz <= 128; gz += CITY.block) road(0, gz, 640, CITY.roadWidth);
  road(0, CITY.boulevardZ, 660, 20);
  const dashMat = std({ color: 0xf2e6b8, roughness: 0.8, emissive: 0x554411, emissiveIntensity: 0.3 });
  for (let x = -320; x < 320; x += 16) {
    flat(6, 0.7, dashMat, x, 0.12, CITY.boulevardZ);
  }
  // Crosswalks across the boulevard.
  for (const cx of [-192, -64, 64, 192]) {
    for (let dz = -8; dz <= 8; dz += 2.4) flat(3.2, 1.4, std({ color: 0xe8e2d2, roughness: 0.9 }), cx, 0.12, CITY.boulevardZ + dz);
  }

  // Buildings fill every block that is not a road.
  for (let bx = -288; bx <= 288; bx += CITY.block) {
    for (let bz = -288; bz <= 96; bz += CITY.block) {
      if (Math.abs(bx % CITY.block) < 1) continue;
      const cx = bx + CITY.block / 2 + rng.range(-6, 6);
      const cz = bz + CITY.block / 2 + rng.range(-6, 6);
      if (Math.abs(cx) < 30 && cz > 60) continue; // keep the pier approach clear
      const b = makeBuilding(rng, cx, cz, rng.range(18, 30), rng.range(18, 30), facades);
      scene.add(b.group);
      buildings.push(b);
      colliders.push({ x: cx, z: cz, hw: b.w / 2 + 1, hd: b.d / 2 + 1 });
    }
  }

  // Neon signs on a few boulevard-facing buildings.
  const signs = [
    { text: 'SOLMAR', fg: '#ffd23f', bg: '#1a1210' },
    { text: 'NEON TIDE', fg: '#ff5a8a', bg: '#140a18' },
    { text: 'HOTEL CAY', fg: '#7ab8ff', bg: '#0a1420' },
    { text: 'CASINO', fg: '#7be495', bg: '#0a1a10' },
  ];
  const signTargets = buildings.filter((b) => b.z > 60 && b.z < 130 && Math.abs(b.x) < 280);
  signs.forEach((s, i) => {
    const b = signTargets[i * 3] || signTargets[i];
    if (!b) return;
    const tex = neonSignTexture(s.text, s.fg, s.bg);
    const signMat = new THREE.MeshStandardMaterial({
      map: tex.map, emissiveMap: tex.emissiveMap, emissive: 0xffffff, emissiveIntensity: 1.1, roughness: 0.5,
    });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(14, 3.5), signMat);
    sign.position.set(b.x, Math.min(b.height - 2, 16), b.z + b.d / 2 + 0.15);
    scene.add(sign);
  });

  // Palms line the boulevard and the beach.
  for (let x = -310; x <= 310; x += 26) {
    const palm = makePalm(rng);
    palm.position.set(x + rng.range(-3, 3), 0, CITY.boulevardZ + 15 + rng.range(0, 4));
    scene.add(palm);
    palms.push(palm);
    const palm2 = makePalm(rng);
    palm2.position.set(x + 13, 0, CITY.boulevardZ - 15);
    scene.add(palm2);
    palms.push(palm2);
  }

  // Street lamps along the boulevard, traffic lights at the main crossings,
  // and a few benches — small props that sell the street at a glance.
  const lampPoleMat = std({ color: 0x22262c, roughness: 0.5, metalness: 0.7 });
  const lampHeadMat = std({ color: 0xfff2c0, emissive: 0xffd27a, emissiveIntensity: 2.2, roughness: 0.3 });
  for (let x = -300; x <= 300; x += 44) {
    for (const side of [CITY.boulevardZ - 11, CITY.boulevardZ + 11]) {
      const g = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 6.5, 6), lampPoleMat);
      pole.position.y = 3.25; pole.castShadow = true; g.add(pole);
      const arm = boxMesh(2.2, 0.14, 0.14, lampPoleMat, side < CITY.boulevardZ ? 1 : -1, 6.4, 0);
      g.add(arm);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), lampHeadMat);
      head.position.set(side < CITY.boulevardZ ? 2 : -2, 6.3, 0);
      g.add(head);
      g.position.set(x, 0, side);
      scene.add(g);
    }
  }
  for (const tx of [-128, 0, 128]) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 5.5, 6), lampPoleMat);
    pole.position.y = 2.75; g.add(pole);
    const housing = boxMesh(0.7, 1.8, 0.7, std({ color: 0x1a1a1a, roughness: 0.6 }), 0, 5.6, 0);
    g.add(housing);
    for (let i = 0; i < 3; i += 1) {
      const lamp = new THREE.Mesh(
        new THREE.CircleGeometry(0.22, 10),
        std({ color: i === 2 ? 0x37c978 : 0x333333, emissive: i === 2 ? 0x37c978 : 0x000000, emissiveIntensity: i === 2 ? 1.6 : 0 }),
      );
      lamp.position.set(0, 6.1 - i * 0.55, 0.36);
      g.add(lamp);
    }
    g.position.set(tx + 9, 0, CITY.boulevardZ - 9);
    scene.add(g);
  }

  // The pier: wood-plank deck, rails, posts and lamps, running out to La Marea.
  const pierGroup = new THREE.Group();
  const plankMat = std({ map: wood, roughness: 0.9 });
  for (let z = 150; z <= 250; z += 4) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(10, 0.5, 3.6), plankMat);
    plank.position.set(0, 1.2, z);
    plank.castShadow = true; plank.receiveShadow = true;
    pierGroup.add(plank);
  }
  for (const side of [-5.4, 5.4]) {
    const rail = boxMesh(0.3, 1.1, 104, std({ color: 0x6e5638, roughness: 1 }), side, 2, 200);
    pierGroup.add(rail);
  }
  for (const px of [-4, 4]) {
    for (let z = 158; z <= 246; z += 22) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 4, 8), plankMat);
      post.position.set(px, 0, z);
      pierGroup.add(post);
    }
  }
  for (let z = 165; z <= 245; z += 27) {
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), lampHeadMat);
    lamp.position.set(-5.4, 3.4, z);
    pierGroup.add(lamp);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 3, 6), lampPoleMat);
    post.position.set(-5.4, 1.8, z);
    pierGroup.add(post);
  }
  scene.add(pierGroup);

  // Landmark towers: the Solmar Casino and the striped Verde Cay lighthouse.
  const casino = makeBuilding(rng, -192, 96, 46, 30, facades);
  casino.group.children[0].material = new THREE.MeshStandardMaterial({
    color: 0xd4a017, roughness: 0.5, metalness: 0.35, emissive: 0x664400, emissiveIntensity: 0.5,
  });
  scene.add(casino.group);
  buildings.push(casino);
  // Striped lighthouse: alternating red/white bands, gallery and lamp room.
  const lightGroup = new THREE.Group();
  const bands = [0xf2ede2, 0xd94a3a, 0xf2ede2, 0xd94a3a, 0xf2ede2];
  bands.forEach((c, i) => {
    const seg = new THREE.Mesh(
      new THREE.CylinderGeometry(3.4 - i * 0.28, 3.7 - i * 0.28, 5.4, 12),
      std({ color: c, roughness: 0.75 }),
    );
    seg.position.y = 2.7 + i * 5.4;
    seg.castShadow = true;
    lightGroup.add(seg);
  });
  const gallery = new THREE.Mesh(new THREE.CylinderGeometry(3.6, 3.6, 0.7, 12), std({ color: 0x22262c, roughness: 0.6, metalness: 0.5 }));
  gallery.position.y = 30;
  lightGroup.add(gallery);
  const lampRoom = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 2.2, 3.4, 10),
    std({ color: 0xffe9a8, emissive: 0xffd27a, emissiveIntensity: 2.4, roughness: 0.2, metalness: 0.3 }),
  );
  lampRoom.position.y = 32;
  lightGroup.add(lampRoom);
  const cap = new THREE.Mesh(new THREE.ConeGeometry(2.6, 2.2, 10), std({ color: 0x22262c, roughness: 0.6 }));
  cap.position.y = 34.8;
  lightGroup.add(cap);
  const beacon = new THREE.PointLight(0xffd27a, 180, 120, 1.8);
  beacon.position.y = 32;
  lightGroup.add(beacon);
  lightGroup.position.set(14, 0, 252);
  scene.add(lightGroup);

  return { colliders, buildings, palms, water, waterMat, waterGeo, waterBase, waterNormal, foam, sun, lightGroup };
}

export function updateCity(city, time) {
  // Rolling swell: displace the sea's vertices and scroll its normal map so
  // the water reads as alive in the boat shot, plus foam breathing at the shore.
  const pos = city.waterGeo.attributes.position;
  const base = city.waterBase;
  for (let i = 0; i < pos.count; i += 1) {
    const bx = base[i * 3]; const by = base[i * 3 + 1];
    pos.array[i * 3 + 2] = Math.sin(bx * 0.045 + time * 1.1) * 0.55
      + Math.cos(by * 0.06 + time * 0.8) * 0.45
      + Math.sin((bx + by) * 0.03 + time * 0.5) * 0.3;
  }
  pos.needsUpdate = true;
  city.waterGeo.computeVertexNormals();
  city.waterNormal.offset.set(time * 0.008, time * 0.012);
  city.foam.material.opacity = 0.42 + Math.sin(time * 0.9) * 0.14;
  city.water.position.y = -0.4 + Math.sin(time * 0.8) * 0.12;
}
