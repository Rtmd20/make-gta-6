// Verde Cay's renderer: Three.js scene, sunset sky shader, animated sea,
// soft shadows, ACES tone mapping and the chase camera that widens its field
// of view as the car goes faster.
import * as THREE from 'three';
import { CITY, SUNSET } from './config.js';

export class Renderer {
  constructor(canvas, textures) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.25;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.Fog(new THREE.Color(SUNSET.fog), 180, 620);

    this.camera = new THREE.PerspectiveCamera(62, 16 / 9, 0.1, 1200);
    this.camera.position.set(150, 12, 60);

    // --- Sunset sky: gradient sphere with a sun disc -------------------------
    const skyGeo = new THREE.SphereGeometry(900, 24, 16);
    const skyMat = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        top: { value: new THREE.Color(SUNSET.skyTop) },
        mid: { value: new THREE.Color(SUNSET.skyMid) },
        low: { value: new THREE.Color(SUNSET.skyLow) },
        sunDir: { value: new THREE.Vector3(0.62, 0.24, -0.35).normalize() },
        sunCol: { value: new THREE.Color(SUNSET.sun) },
      },
      vertexShader: `
        varying vec3 vDir;
        void main() {
          vDir = normalize(position);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }`,
      fragmentShader: `
        uniform vec3 top; uniform vec3 mid; uniform vec3 low;
        uniform vec3 sunDir; uniform vec3 sunCol;
        varying vec3 vDir;
        void main() {
          float h = clamp(vDir.y, -0.12, 1.0);
          vec3 col = mix(low, mid, smoothstep(0.0, 0.32, h));
          col = mix(col, top, smoothstep(0.3, 0.85, h));
          float s = max(dot(normalize(vDir), sunDir), 0.0);
          col += sunCol * (pow(s, 220.0) * 1.4 + pow(s, 18.0) * 0.45);
          // a few soft cloud bands
          float cl = sin(vDir.x * 14.0 + vDir.y * 30.0) * sin(vDir.z * 11.0 - vDir.y * 18.0);
          col += vec3(0.10, 0.06, 0.10) * smoothstep(0.55, 0.95, cl) * smoothstep(0.05, 0.35, vDir.y);
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    this.sky = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(this.sky);

    // --- Lights ----------------------------------------------------------------
    const sun = new THREE.DirectionalLight(0xffb37a, 2.6);
    sun.position.set(180, 90, -120);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -160;
    sun.shadow.camera.right = 160;
    sun.shadow.camera.top = 160;
    sun.shadow.camera.bottom = -160;
    sun.shadow.camera.far = 600;
    sun.shadow.bias = -0.0006;
    this.scene.add(sun);
    this.sun = sun;
    // Warm bounce fill from the south-east so the rears of northbound cars
    // (and the player) are not black against the sunset.
    const fill = new THREE.DirectionalLight(0xffd9a0, 1.35);
    fill.position.set(60, 40, 220);
    this.scene.add(fill);
    const hemi = new THREE.HemisphereLight(0xd98cff, 0x3a2a1a, 1.0);
    this.scene.add(hemi);

    // --- Sea: animated plane east of the beach -----------------------------------
    const seaGeo = new THREE.PlaneGeometry(480, 900, 40, 40);
    seaGeo.rotateX(-Math.PI / 2);
    this.seaMat = new THREE.MeshStandardMaterial({
      map: textures.water, roughness: 0.32, metalness: 0.25,
    });
    this.sea = new THREE.Mesh(seaGeo, this.seaMat);
    this.sea.position.set(CITY.seaX0 + 240, 0.1, 0);
    this.sea.receiveShadow = true;
    this.scene.add(this.sea);
    this.seaBase = seaGeo.attributes.position.array.slice();

    // --- Foam strip where the sea meets the sand ----------------------------------
    const foamGeo = new THREE.PlaneGeometry(10, 900);
    foamGeo.rotateX(-Math.PI / 2);
    this.foam = new THREE.Mesh(foamGeo, new THREE.MeshBasicMaterial({
      color: 0xeaf7f6, transparent: true, opacity: 0.35,
    }));
    this.foam.position.set(CITY.seaX0 - 2, 0.22, 0);
    this.scene.add(this.foam);

    this.time = 0;
    this.camPos = new THREE.Vector3(150, 12, 60);
    this.camLook = new THREE.Vector3(150, 1, 30);
  }

  resize(w, h) {
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
  }

  // Chase camera: low and close behind the vehicle, lower and closer in a
  // staged shot, FOV widening with speed. In a staged shot the camera snaps
  // straight to its pose: at screenshot time only a few frames have run, so
  // a lerp would still be travelling and the hero car would be out of frame.
  // A staged shot is framed as a three-quarter rear view: pulled back a
  // little and offset to the car's right flank, so the rear quarter shows
  // taillights, spoiler and roof instead of a flat top-down rear.
  updateCamera(target, heading, speedKmh, dt, staged) {
    const speedF = Math.min(speedKmh / 180, 1);
    const dist = staged ? 5.8 : 8.5 + speedF * 3.5;
    const height = staged ? 2.5 : 3.4 + speedF * 1.2;
    const back = new THREE.Vector3(-Math.sin(heading), 0, -Math.cos(heading));
    // Right flank of the car, for the three-quarter rear angle in staged shots.
    const right = new THREE.Vector3(-Math.cos(heading), 0, Math.sin(heading));
    const sideOff = staged ? 2.6 : 0;
    const want = new THREE.Vector3(
      target.x + back.x * dist + right.x * sideOff,
      height,
      target.z + back.z * dist + right.z * sideOff,
    );
    const k = staged ? 1 : 1 - Math.exp(-dt * 5.5);
    this.camPos.lerp(want, k);
    // In a staged shot, pan the look point a little toward the car's flank
    // so the offset camera keeps the hero car near the centre of the frame.
    const lookSide = staged ? 1.5 : 0;
    const look = new THREE.Vector3(
      target.x + Math.sin(heading) * 9 + right.x * lookSide,
      1.6,
      target.z + Math.cos(heading) * 9 + right.z * lookSide,
    );
    this.camLook.lerp(look, staged ? 1 : 1 - Math.exp(-dt * 7));
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
    const fov = 62 + speedF * 14;
    if (Math.abs(this.camera.fov - fov) > 0.1) {
      this.camera.fov = fov;
      this.camera.updateProjectionMatrix();
    }
  }

  updateOnFootCamera(target, heading, dt, staged) {
    const back = new THREE.Vector3(-Math.sin(heading), 0, -Math.cos(heading));
    const want = new THREE.Vector3(target.x + back.x * 6.5, 3.1, target.z + back.z * 6.5);
    const k = staged ? 1 : 1 - Math.exp(-dt * 6);
    this.camPos.lerp(want, k);
    const look = new THREE.Vector3(target.x + Math.sin(heading) * 6, 1.4, target.z + Math.cos(heading) * 6);
    this.camLook.lerp(look, staged ? 1 : 1 - Math.exp(-dt * 8));
    this.camera.position.copy(this.camPos);
    this.camera.lookAt(this.camLook);
    if (Math.abs(this.camera.fov - 60) > 0.1) {
      this.camera.fov = 60;
      this.camera.updateProjectionMatrix();
    }
  }

  // Animate the sea swell and the foam line.
  updateSea(dt) {
    this.time += dt;
    const pos = this.sea.geometry.attributes.position;
    const base = this.seaBase;
    for (let i = 0; i < pos.count; i++) {
      const x = base[i * 3];
      const z = base[i * 3 + 2];
      pos.array[i * 3 + 1] = Math.sin(x * 0.08 + this.time * 1.1) * 0.35
        + Math.cos(z * 0.05 + this.time * 0.7) * 0.3;
    }
    pos.needsUpdate = true;
    // Normals are the expensive part: recompute every 3rd frame, the swell
    // is slow enough that nobody sees the difference.
    this.seaFrame = (this.seaFrame || 0) + 1;
    if (this.seaFrame % 3 === 0) this.sea.geometry.computeVertexNormals();
    this.foam.material.opacity = 0.28 + Math.sin(this.time * 0.9) * 0.1;
    this.foam.position.x = CITY.seaX0 - 2 + Math.sin(this.time * 0.5) * 1.2;
  }

  render() {
    this.renderer.render(this.scene, this.camera);
  }
}
