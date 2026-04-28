import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';

const root = resolve(process.cwd(), 'dist');
const host = process.env.PLAYWRIGHT_PREVIEW_HOST || '127.0.0.1';
const port = Number(process.env.PLAYWRIGHT_PREVIEW_PORT || process.argv[2] || 3100);

const mimeTypes = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
  ['.woff', 'font/woff'],
  ['.woff2', 'font/woff2'],
]);

function resolveFilePath(urlPath) {
  const decodedPath = decodeURIComponent(urlPath.split('?')[0] || '/');
  const normalizedPath = normalize(decodedPath).replace(/^(\.\.[/\\])+/, '');
  const requestedPath = resolve(join(root, normalizedPath));

  if (!requestedPath.startsWith(`${root}${sep}`) && requestedPath !== root) {
    return null;
  }

  if (existsSync(requestedPath) && statSync(requestedPath).isFile()) {
    return requestedPath;
  }

  const indexPath = resolve(join(root, 'index.html'));
  return existsSync(indexPath) ? indexPath : null;
}

const server = createServer((request, response) => {
  const filePath = resolveFilePath(request.url || '/');

  if (!filePath) {
    response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('Not found');
    return;
  }

  response.writeHead(200, {
    'cache-control': 'no-store',
    'content-type': mimeTypes.get(extname(filePath)) || 'application/octet-stream',
  });
  createReadStream(filePath).pipe(response);
});

server.listen(port, host, () => {
  console.log(`BookedAI dist preview listening at http://${host}:${port}/`);
});

server.on('error', (error) => {
  console.error(error);
  process.exit(1);
});

const keepAlive = setInterval(() => {}, 60_000);

function shutdown() {
  clearInterval(keepAlive);
  server.close(() => process.exit(0));
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
