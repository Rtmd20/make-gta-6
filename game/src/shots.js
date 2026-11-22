// Staged screenshots: ?shot=cover|foot|map|menu&seed=1 puts the game into a
// fixed, deterministic pose — the same seed always frames the same shot —
// then freezes the simulation so the frame the browser captures is the one
// staged here. The HUD shows the staged numbers (165 km/h on the cover)
// because the car is posed, not driven, for the photograph.
import { makeCarMesh, makeHeliMesh } from './vehicles.js';

function placeCruiser(world, x, z, heading, tactic) {
  const mesh = makeCarMesh(0x1c2f4a, { police: true });
  world.scene.add(mesh);
  const unit = { mesh, x, z, heading, speed: 0, tactic, dist: 0 };
  mesh.position.set(x, 0, z);
  mesh.rotation.y = heading;
  world.police.push(unit);
  return unit;
}

export function applyShot(world, hud) {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (!shot) return null;
  const seed = parseInt(params.get('seed') || '1', 10);

  if (shot === 'cover') {
    // Job 4 "Harbor Lights", stage 1 of 2: the sunset boulevard chase.
    world.setStage(3, 0);
    world.money = 6420;
    world.respect = 48;
    world.clockMinutes = 18 * 60 + 47;
    world.stageTimer = 4 * 60 + 19;
    world.wanted = 3;
    // Hero car posed on the boulevard, heading north into the roadblock.
    const p = world.player;
    p.onFoot = false;
    p.vehicle = world.heroCar;
    p.x = 176;
    p.z = 24;
    p.heading = Math.PI;
    p.speed = 45.8; // 165 km/h
    world.heroCar.x = p.x;
    world.heroCar.z = p.z;
    world.heroCar.heading = p.heading;
    world.heroCar.mesh.position.set(p.x, 0, p.z);
    world.heroCar.mesh.rotation.y = p.heading;
    world.playerMesh.visible = false;
    world.vehicleName = 'Coral Comet RS';
    world.player.condition = 82;
    world.stagedSpeedKmh = 165;
    // VCPD: two cruisers in the chase ahead, one flanking from a side street.
    world.police = [];
    const c1 = placeCruiser(world, 168, -6, Math.PI, 'Flanking');
    const c2 = placeCruiser(world, 184, -2, Math.PI, 'Pursuit');
    const c3 = placeCruiser(world, 150, -20, Math.PI / 2, 'Roadblock');
    c1.dist = 29; c2.dist = 34; c3.dist = 13;
    // Air-1 low and ahead-right, fully inside the cover frame with body and
    // rotor visible, searchlight cone down on the boulevard.
    if (!world.heli) {
      world.heli = makeHeliMesh();
      world.heli.position.set(184, 14, -12);
      world.heli.rotation.y = Math.PI;
      world.scene.add(world.heli);
    }
    // Roadblock ahead with the blast frozen mid-burst, sitting on the road.
    world.city.roadblock.visible = true;
    world.explosion.position.set(176, 1.0, -30);
    world.explosion.scale.setScalar(1.5);
    world.explosion.visible = true;
    // Two traffic cars for depth, both ahead of the camera.
    if (world.traffic.length >= 2) {
      world.traffic[0].mesh.position.set(168, 0, -64);
      world.traffic[0].mesh.rotation.y = Math.PI;
      world.traffic[1].mesh.position.set(186, 0, -12);
      world.traffic[1].mesh.rotation.y = Math.PI;
    }
    world.frozen = true;
    world.mode = 'play';
    hud.update(world.getHUDState());
    return 'cover';
  }

  if (shot === 'foot') {
    // Job 1 "First Light", stage 2 of 2: on foot, about to steal the Comet.
    world.setStage(0, 1);
    world.money = 1250;
    world.respect = 12;
    world.clockMinutes = 18 * 60 + 31;
    world.wanted = 0;
    const p = world.player;
    p.onFoot = true;
    p.vehicle = null;
    p.x = 176;
    p.z = 32;
    p.heading = Math.PI;
    p.speed = 0;
    world.heroCar.x = 176;
    world.heroCar.z = 28;
    world.heroCar.heading = Math.PI;
    world.heroCar.mesh.position.set(176, 0, 28);
    world.heroCar.mesh.rotation.y = Math.PI;
    world.playerMesh.position.set(p.x, 0, p.z);
    world.playerMesh.rotation.y = p.heading;
    world.playerMesh.visible = true;
    world.vehicleName = 'ON FOOT';
    world.frozen = true;
    world.mode = 'play';
    hud.update(world.getHUDState());
    return 'foot';
  }

  if (shot === 'map') {
    // The city map with Job 4 in progress.
    world.setStage(3, 1);
    world.money = 6420;
    world.respect = 48;
    world.clockMinutes = 18 * 60 + 47;
    world.wanted = 2;
    world.vehicleName = 'Coral Comet RS';
    world.mode = 'map';
    world.frozen = true;
    hud.showMap(true, world.getMapState());
    return 'map';
  }

  if (shot === 'menu') {
    world.mode = 'menu';
    world.frozen = true;
    return 'menu';
  }

  return null;
}
