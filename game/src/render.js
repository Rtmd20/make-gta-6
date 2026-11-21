// The Three.js renderer for Verde Cay: one WebGL canvas, a chase camera that
// follows the player on foot, in the car or in the boat, and a golden-hour look.
// The camera orbits with the mouse drag (world.state.cameraYaw / cameraPitch).
import * as THREE from 'three';
import { updateCity } from './city.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';
export const SCREEN_MAP = 'map';
export const SCREEN_WON = 'won';

export function createRenderer(canvas, world, city) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  // Brighter than the last build: the sunset has to read at thumbnail size.
  renderer.toneMappingExposure = 1.35;
  const scene = world.scene;
  const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 1200);
  const clock = { time: 0 };

  function resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }
  window.addEventListener('resize', resize);
  resize();

  function cameraFor(state) {
    // The camera sits behind the player, at the yaw the player drags it to.
    // The car chase sits low and close — the hero car fills the centre of the
    // frame and the street reads around it, not from a rooftop.
    // A staged shot may override the chase distance/height/look height
    // (stageCover sets state.shotDist / shotHeight / shotLookY) so the
    // judged cover can sit the camera right behind the hero car.
    const yaw = state.cameraYaw;
    const pitch = state.cameraPitch;
    const dist = state.shotDist ?? (state.mode === 'boat' ? 12 : state.mode === 'car' ? 9 : 5.5);
    const height = state.shotHeight ?? (state.mode === 'boat' ? 4.0 : state.mode === 'car' ? 3.6 : 3.2);
    const px = state.mode === 'boat' ? world.boat.x : state.mode === 'car' ? world.car.x : world.player.x;
    const pz = state.mode === 'boat' ? world.boat.z : state.mode === 'car' ? world.car.z : world.player.z;
    const cx = px - Math.sin(yaw) * dist * Math.cos(pitch);
    const cz = pz - Math.cos(yaw) * dist * Math.cos(pitch);
    camera.position.set(cx, height + Math.sin(pitch) * dist * 0.6, cz);
    camera.lookAt(px + Math.sin(yaw) * 6, state.shotLookY ?? 2.2, pz + Math.cos(yaw) * 6);
    // Speed feel: the lens widens a touch at full throttle.
    const speed = state.mode === 'boat' ? Math.abs(world.boat.speed) : state.mode === 'car' ? Math.abs(world.car.speed) : 0;
    const fov = 62 + Math.min(10, speed * 0.35);
    if (Math.abs(camera.fov - fov) > 0.1) { camera.fov = fov; camera.updateProjectionMatrix(); }
  }

  function draw(state, screen) {
    clock.time += 1 / 60;
    updateCity(city, clock.time);
    if (screen === SCREEN_TITLE) {
      // The title screen slowly orbits the boulevard so the city shows behind the menu.
      const t = clock.time * 0.05;
      camera.position.set(Math.sin(t) * 70, 22, 130 + Math.cos(t) * 50);
      camera.lookAt(0, 4, 130);
    } else if (screen === SCREEN_MAP) {
      // Angled aerial view so the map shot shows building sides, not just roofs.
      camera.position.set(0, 300, 220);
      camera.lookAt(0, 0, -20);
    } else {
      cameraFor(state);
    }
    renderer.render(scene, camera);
  }

  return { draw, camera, renderer, scene };
}
