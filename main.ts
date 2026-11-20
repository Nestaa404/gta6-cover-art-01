// Neon Coast Cover Studio — the entrypoint for make.fun bounty
// gta6-cover-art-01.
//
// Run it to hand the app in: it copies this directory's app/ (the static,
// offline cover maker) and screenshots/ into the output directory and
// writes /output/dossier.json there with the vendored make.fun library,
// which is the summary the judge reads.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Inside the grader MAKEFUN_OUTPUT_DIR is unset and /output is used.
// Node 22+, standard library only. Run it twice and the output is
// byte-identical: the copy is a plain file copy and the dossier is
// canonical JSON of the same tree.
//
// The output directory itself is never removed or recreated here. In the
// grader /output is a volume mount, so deleting it (or trying to recreate
// it after deleting it) fails on a read-only mount and kills the run.
// This entrypoint only creates the directory if it is missing and then
// fills it — exactly like the starter kit does.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const appDir = join(here, 'app');
const shotsDir = join(here, 'screenshots');
if (!existsSync(appDir)) {
  throw new Error(`app/ is missing next to main.ts (${appDir})`);
}

// Make sure the output directory exists, then fill it. Never delete it:
// on the grader it is a mounted volume, and removing a mount point (or
// recreating it afterwards) fails. If the path exists but is a plain file
// instead of a directory, fail loudly rather than copying into nowhere.
if (existsSync(outDir) && !statSync(outDir).isDirectory()) {
  throw new Error(`output path ${outDir} exists and is not a directory`);
}
mkdirSync(outDir, { recursive: true });
cpSync(appDir, join(outDir, 'app'), { recursive: true });
if (existsSync(shotsDir)) {
  cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });
}

// The scorer's caps for this bounty: at most 4 screenshots, each at most
// 256 KiB; app/ at most 993 files and 48 MiB in all, no path over 1000
// bytes. buildDossier refuses anything over those caps instead of
// silently handing in an entry the scorer would reject.
const dossier = buildDossier(outDir, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
});
writeFileSync(join(outDir, 'dossier.json'), dossier);

// A short summary on stdout, so a run's log shows what was handed in
// without opening the output tree.
function countFiles(dir: string): number {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    total += entry.isDirectory() ? countFiles(join(dir, entry.name)) : 1;
  }
  return total;
}
const shotCount = existsSync(shotsDir) ? readdirSync(shotsDir).length : 0;
console.log(
  `Neon Coast Cover Studio handed in to ${outDir}: ` +
    `${countFiles(appDir)} app files, ${shotCount} screenshots, ` +
    `dossier.json ${statSync(join(outDir, 'dossier.json')).size} bytes`,
);
