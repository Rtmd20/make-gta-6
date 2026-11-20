// The screenshot scenes behind ?shot=cover|foot|map|menu. Each one stages a real
// moment of the game — the boat-escape chase, an on-foot street scene, the map
// and stats screen, and the title menu — then paints it twice and sets
// window.__shotReady so a screenshot tool knows the frame is ready.
import { STEP } from './config.js';

const SIM_SECONDS = 2;

export function stageShot(name, world, renderer) {
  if (name === 'cover') world.stageCover();
  else if (name === 'foot') world.stageFoot();
  else if (name === 'map') world.stageMap();
  else world.stageMenu();

  // Let the world settle for a couple of simulated seconds so traffic, the
  // helicopter rotor and the water are mid-motion, then hold the frame.
  const input = { forward: () => 0, strafe: () => 0, consumeDrag: () => ({ x: 0, y: 0 }), consume: () => false, weaponSlot: () => -1, isHeld: () => false };
  for (let i = 0; i < SIM_SECONDS / STEP; i += 1) world.update(STEP, input);
  world.restageShot(name);

  let painted = 0;
  function paint() {
    renderer.draw(world.state, world.state.screen);
    painted += 1;
    if (painted < 3) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
  return world.state.screen;
}
