import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const outputRoot = path.resolve(__dirname, 'dist-electron');
const serverModulePath = path.join(outputRoot, 'server', 'index.mjs');
const serverModule = await import(pathToFileURL(serverModulePath).href);
const fetchHandler = serverModule.default.fetch.bind(serverModule.default);
const publicRoot = path.join(outputRoot, 'public');

async function serveAsset(request) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return null;
  const pathname = new URL(request.url || '/', 'http://127.0.0.1').pathname;
  if (pathname.includes('..')) return null;
  if (pathname.startsWith('/src/') || pathname.startsWith('/@')) return null;
  const candidateRoots = [publicRoot, outputRoot];
  const assetCandidates = [];
  if (pathname !== '/') {
    const relativePath = pathname.replace(/^\/+/, '');
    for (const candidateRoot of candidateRoots) {
      const candidate = path.resolve(candidateRoot, relativePath);
      const safeBase = path.resolve(candidateRoot);
      if (candidate.startsWith(safeBase) && candidate !== safeBase) {
        assetCandidates.push(candidate);
      }
    }
  }
  for (const assetPath of assetCandidates) {
    try {
      const asset = await fs.readFile(assetPath);
      const extension = path.extname(assetPath).toLowerCase();
      const contentTypes = {
        '.css': 'text/css; charset=utf-8',
        '.html': 'text/html; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8',
        '.mjs': 'text/javascript; charset=utf-8',
        '.ts': 'text/javascript; charset=utf-8',
        '.tsx': 'text/javascript; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.map': 'application/json; charset=utf-8',
        '.png': 'image/png',
        '.svg': 'image/svg+xml',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2',
      };
      return new Response(asset, {
        status: 200,
        headers: {
          'content-type': contentTypes[extension] || 'application/octet-stream',
          'cache-control': 'no-cache',
        },
      });
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
  return null;
}

const env = {
  ASSETS: {
    async fetch(request) {
      return serveAsset(request);
    },
  },
};

const server = http.createServer(async (request, response) => {
  try {
    const assetResponse = await serveAsset(request);
    if (assetResponse) {
      response.writeHead(assetResponse.status, Object.fromEntries(assetResponse.headers));
      response.end(Buffer.from(await assetResponse.arrayBuffer()));
      return;
    }
    const host = request.headers.host || '127.0.0.1';
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;
    const headers = new Headers();
    for (const [name, value] of Object.entries(request.headers)) {
      if (value) headers.set(name, Array.isArray(value) ? value.join(', ') : value);
    }
    const webResponse = await fetchHandler(
      new Request(`http://${host}${request.url}`, {
        method: request.method,
        headers,
        body: request.method === 'GET' || request.method === 'HEAD' ? undefined : body,
      }),
      env,
      { waitUntil() {} },
    );
    response.writeHead(webResponse.status, Object.fromEntries(webResponse.headers));
    response.end(Buffer.from(await webResponse.arrayBuffer()));
  } catch (error) {
    console.error(error);
    response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' });
    response.end('error');
  }
});

server.listen(0, '127.0.0.1', async () => {
  const port = server.address().port;
  console.log('PORT', port);
  const res = await fetch(`http://127.0.0.1:${port}/`);
  console.log('STATUS', res.status, res.headers.get('content-type'));
  const text = await res.text();
  console.log(text.slice(0, 800));
  server.close();
});
