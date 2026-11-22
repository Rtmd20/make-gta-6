// VERDE CAY — entrypoint for the make.fun "Make GTA 6" bounty (gta6-01).
// Node 22, standard library only. It hands the game in: the static files under
// game/ and the four screenshots go to the output directory, and the dossier
// the judge reads is written there with the vendored make.fun library.
//
// Run it locally with an output folder of your own:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

function copyGame() {
  mkdirSync(outDir, { recursive: true });
  cpSync(join(repoRoot, 'game'), join(outDir, 'game'), { recursive: true });
  const shotsOut = join(outDir, 'screenshots');
  mkdirSync(shotsOut, { recursive: true });
  const shotsIn = join(repoRoot, 'screenshots');
  if (existsSync(shotsIn)) cpSync(shotsIn, shotsOut, { recursive: true });
}

function writeDossier() {
  // The scorer's caps, from the kit's gate reference: the dossier text is
  // capped at 160 KiB, screenshots at 4 files of 256 KiB, game/ at 993 files
  // and 48 MiB. An entry over any of them is refused, so the check refuses
  // here first rather than at the gate.
  const dossier = buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  });
  writeFileSync(join(outDir, 'dossier.json'), dossier);
}

copyGame();
writeDossier();
