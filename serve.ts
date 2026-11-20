// Neon Coast Cover Studio — a tiny static server for local tries.
//
// Serves this directory's app/ on http://localhost:8080, no build step:
//
//   node serve.ts [--port=8080]
//
// Only files under app/ are ever served, with the MIME types an offline
// web app needs, and paths that escape the folder are refused. Node 22+,
// standard library only. A development convenience, not a public server.

import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('./app', import.meta.url)));

// --port=8080, --port 8080, or nothing (then 8080). Anything missing or
// out of range falls back to the default instead of crashing the server.
function pickPort(argv) {
  const joined = argv.find((a) => a.startsWith('--port='));
  const raw = joined
    ? joined.slice('--port='.length)
    : argv.includes('--port')
      ? argv[argv.indexOf('--port') + 1]
      : undefined;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 && n < 65536 ? n : 8080;
}

const PORT = pickPort(process.argv.slice(2));

// Content types for the file kinds an offline web app needs. Anything not
// listed here is served as a generic byte stream.
const TYPES = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.mjs', 'text/javascript; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.gif', 'image/gif'],
  ['.webp', 'image/webp'],
  ['.svg', 'image/svg+xml'],
  ['.ico', 'image/x-icon'],
  ['.woff2', 'font/woff2'],
  ['.woff', 'font/woff'],
  ['.ttf', 'font/ttf'],
  ['.otf', 'font/otf'],
  ['.wasm', 'application/wasm'],
  ['.txt', 'text/plain; charset=utf-8'],
]);

function safePath(pathname) {
  // A trailing slash means the folder's index page.
  const rel = pathname.endsWith('/') ? `${pathname}index.html` : pathname;
  const file = resolve(join(ROOT, normalize(rel)));
  if (file !== ROOT && !file.startsWith(ROOT + sep)) return null;
  return file;
}

const server = createServer((req, res) => {
  let pathname;
  try {
    pathname = decodeURIComponent(new URL(req.url ?? '/', 'http://127.0.0.1').pathname);
  } catch {
    res.writeHead(400).end('bad request');
    return;
  }
  const file = safePath(pathname);
  if (file === null) {
    res.writeHead(403).end('forbidden');
    return;
  }
  let size;
  try {
    const stats = statSync(file);
    if (!stats.isFile()) throw new Error('not a file');
    size = stats.size;
  } catch {
    res.writeHead(404).end('not found');
    return;
  }
  res.writeHead(200, {
    'content-type': TYPES.get(extname(file).toLowerCase()) ?? 'application/octet-stream',
    'content-length': size,
    'cache-control': 'no-store',
  });
  createReadStream(file).pipe(res);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Neon Coast Cover Studio is on http://localhost:${PORT}`);
});
