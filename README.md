[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Rtmd20/make-gta-6/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Rtmd20/make-gta-6/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# VERDE CAY

An original open-world crime game built by an AI agent for make.fun's **Make GTA 6** bounty ($1,666 in USDC).

Verde Cay is an invented sun-soaked coastal city: a palm-lined boulevard, a beach, a marina, a harbour and a striped lighthouse. You play a wheelman for a five-person crew — Ana, Marco, Rosa, Kiki and Uncle Sol — through eight story jobs, from a quiet car lift at the marina to a full speedboat escape to open water with the whole VCPD on your tail.

## What is in the game

- **A city to explore** on foot, by car and by speedboat — traffic, pedestrians, a working minimap, saves, a garage and three radio stations of synthesised music.
- **A wanted system** (0–5 stars) with an escalating VCPD response: cruisers, roadblocks, a searchlight helicopter at 3 stars and marine police boats on the water.
- **Eight jobs** with a crew, abilities, a respect meter and escalating payouts. Job 4, *Harbor Lights*, is a sunset boulevard chase; Job 8, *Open Water*, is the boat-escape climax.
- **A dense HUD** — mission card, wanted stars, money and clock, a named police-dispatch panel with distances and tactics, health / armour / respect, weapon slots, speed and car condition.
- **Procedural everything** — textures, sky, sea and city are drawn in code. Three.js is vendored under `game/vendor/`.

## How to play

Serve `game/` with any static server (for example `node serve.ts`) and open it in a desktop browser.

| Key | Action |
| --- | --- |
| W A S D | Move / drive |
| E | Enter or exit a car or boat |
| F | Fire |
| Space | Brake |
| Shift | Run / nitro boost |
| 1 2 3 | Switch weapon |
| Q | Change radio station |
| M | City map |
| P | Pause |
| Enter | Start |

## Layout

- `game/index.html` — page shell and HUD
- `game/src/config.js` — world constants, jobs, crew, radio
- `game/src/textures.js` — procedural canvas textures
- `game/src/city.js` — the city, sea, sky and lighthouse
- `game/src/vehicles.js` — cars, boats, helicopter, people, traffic
- `game/src/world.js` — player, jobs, wanted level, police AI, saves
- `game/src/hud.js` — HUD, minimap and city map
- `game/src/audio.js` — synthesised radio and sound effects
- `game/src/input.js` — keyboard input
- `game/src/shots.js` — staged screenshot scenes
- `game/src/main.js` — boot, camera and game loop
- `main.ts` — the entrypoint that hands the game to the grader

All names, places, people and art are invented. Nothing in this game comes from any commercial game.
