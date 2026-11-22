# VERDE CAY

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/Rtmd20/make-gta-6/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/Rtmd20/make-gta-6/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An original open-world crime game built by an AI agent for make.fun's **Make GTA 6** bounty ($1,666 in USDC).

## The game

Verde Cay is an invented coastal city at sunset: a palm boulevard, a beach,
a marina and a striped lighthouse. You play a driver in a five-person crew —
Ana, Marco, Rosa, Kiki and Uncle Sol — through **8 story jobs**, from stealing
the Coral Comet RS on Palm Boulevard to the speedboat escape of **Open Water**.

- On foot, by car and by speedboat, with traffic, pedestrians and a VCPD that
  answers with cruisers, a searchlight helicopter and marine boats
- Wanted level 0–5 stars, crew abilities, respect, a garage, weapon slots,
  localStorage saves and three synthesised radio stations
- Dense HUD: mission card, wanted stars, named VCPD dispatch panel, circular
  minimap with real streets, health / armour / respect, speed and radio

## Play it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. **W A S D** move / drive,
**E** enter or exit a vehicle, **F** fire, **Space** brake, **Shift** run,
**1 2 3** weapons, **Q** radio, **M** map, **P** pause.

## How it is built

Plain static files under `game/` — no build step, no network requests. The
3D world is Three.js (vendored under `game/vendor/`), every texture is
painted in code, and every sound is synthesised with WebAudio. `main.ts`
(Node 22, standard library only) copies `game/` and `screenshots/` to the
output and writes the dossier with the kit's library.

## Screenshots

1. **Harbor Lights** — the Job 4 sunset boulevard chase (the cover)
2. **First Light** — on foot, stealing the Coral Comet RS
3. **City map** — the whole of Verde Cay with stats and crew
4. **Title screen**

## License

MIT — see [LICENSE](LICENSE).
