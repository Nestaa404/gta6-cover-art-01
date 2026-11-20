// Neon Coast Cover Studio — the entrypoint for make.fun bounty
// gta6-cover-art-01.
//
// Hand the app in: mirror this directory's app/ (the static, offline
// cover maker) and screenshots/ into the output directory and write
// /output/dossier.json there with the vendored make.fun library, which is
// the summary the judge reads.
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// With MAKEFUN_OUTPUT_DIR unset the grader's /output is used. Node 22+,
// standard library only. Two runs into two directories come out
// byte-identical: the mirror is a plain file copy in a fixed walk order
// and the dossier is canonical JSON of the same tree.
//
// The output directory itself is never removed or recreated here. On the
// grader /output is a volume mount, so deleting it (or trying to recreate
// it after deleting it) fails on a read-only mount and kills the run.
// This entrypoint only creates the directory when it is missing and then
// fills it — exactly like the starter kit does.

import { copyFile, mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const OUT = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Copy a tree one entry at a time, in sorted order, so the walk is
// deterministic. Files land with copyFile; directories are created and
// walked into. Anything that is neither (symlinks, sockets) is skipped
// rather than followed — the app tree holds plain files only.
async function mirror(src, dst) {
  await mkdir(dst, { recursive: true });
  const entries = await readdir(src, { withFileTypes: true });
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const entry of entries) {
    const from = join(src, entry.name);
    const to = join(dst, entry.name);
    if (entry.isDirectory()) await mirror(from, to);
    else if (entry.isFile()) await copyFile(from, to);
  }
}

async function tally(dir) {
  let files = 0;
  let bytes = 0;
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = await tally(path);
      files += sub.files;
      bytes += sub.bytes;
    } else if (entry.isFile()) {
      files += 1;
      bytes += (await stat(path)).size;
    }
  }
  return { files, bytes };
}

async function handIn() {
  const appSrc = join(HERE, 'app');
  const shotsSrc = join(HERE, 'screenshots');
  if ((await stat(appSrc).catch(() => null))?.isDirectory() !== true) {
    throw new Error(`app/ is missing next to main.ts (${appSrc})`);
  }

  // Make sure the output directory exists, then fill it. Never delete it:
  // on the grader it is a mounted volume, and removing a mount point (or
  // recreating it afterwards) fails. If the path exists but is a plain
  // file instead of a directory, fail loudly rather than copying nowhere.
  const outStat = await stat(OUT).catch(() => null);
  if (outStat && !outStat.isDirectory()) {
    throw new Error(`output path ${OUT} exists and is not a directory`);
  }
  await mkdir(OUT, { recursive: true });
  await mirror(appSrc, join(OUT, 'app'));
  if ((await stat(shotsSrc).catch(() => null))?.isDirectory()) {
    await mirror(shotsSrc, join(OUT, 'screenshots'));
  }

  // The scorer's caps for this bounty: at most 4 screenshots, each at most
  // 256 KiB; app/ at most 993 files and 48 MiB in all, no path over 1000
  // bytes. buildDossier refuses anything over those caps instead of
  // silently handing in an entry the scorer would reject.
  const dossier = buildDossier(OUT, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  });
  await writeFile(join(OUT, 'dossier.json'), dossier);

  // Read the dossier back and make sure it parses: a hand-in the judge
  // cannot read is worse than a loud failure here.
  const written = await readFile(join(OUT, 'dossier.json'), 'utf8');
  JSON.parse(written);

  // A short summary on stdout, so a run's log shows what was handed in
  // without opening the output tree.
  const app = await tally(appSrc);
  const shots = (await stat(shotsSrc).catch(() => null))?.isDirectory()
    ? (await readdir(shotsSrc)).length
    : 0;
  const dossierBytes = (await stat(join(OUT, 'dossier.json'))).size;
  console.log(
    `Neon Coast Cover Studio handed in to ${OUT}: ` +
      `${app.files} app files (${app.bytes} bytes), ${shots} screenshots, ` +
      `dossier.json ${dossierBytes} bytes`,
  );
}

await handIn();
