const http = require('http');
const fs = require('fs/promises');
const path = require('path');
const { pathToFileURL } = require('url');
const { chromium } = require('playwright');
(async () => {
  const outputRoot = process.cwd();
  const serverModule = await import(pathToFileURL(path.join(outputRoot, '.output', 'server', 'index.mjs')).href);
  const fetchHandler = serverModule.default.fetch.bind(serverModule.default);
  const publicRoot = path.join(outputRoot, '.output', 'public');
  async function serveAsset(request) {
    const pathname = new URL(request.url || '/', 'http://127.0.0.1').pathname;
    if (pathname === '/' || pathname.includes('..')) return null;
    const assetPath = path.resolve(publicRoot, `.${pathname}`);
    if (assetPath !== publicRoot && !assetPath.startsWith(`${publicRoot}${path.sep}`)) return null;
    try {
      const asset = await fs.readFile(assetPath);
      const extension = path.extname(assetPath).toLowerCase();
      const contentTypes = {'css':'text/css; charset=utf-8','html':'text/html; charset=utf-8','js':'text/javascript; charset=utf-8','json':'application/json; charset=utf-8','map':'application/json; charset=utf-8','png':'image/png','svg':'image/svg+xml','woff':'font/woff','woff2':'font/woff2'};
      return new Response(asset, { status: 200, headers: { 'content-type': contentTypes[extension] || 'application/octet-stream', 'cache-control': 'no-cache' } });
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      return null;
    }
  }
  const env = { ASSETS: { async fetch(request) { return serveAsset(request); } } };
  const server = http.createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url || '/', 'http://127.0.0.1').pathname;
      if (pathname !== '/' && pathname.includes('..')) {
        response.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' }); response.end('Invalid asset request.'); return;
      }
      const assetResponse = await serveAsset(request);
      if (assetResponse) {
        response.writeHead(assetResponse.status, Object.fromEntries(assetResponse.headers));
        response.end(Buffer.from(await assetResponse.arrayBuffer()));
        return;
      }
      const host = request.headers.host || '127.0.0.1';
      const chunks = []; for await (const chunk of request) chunks.push(chunk);
      const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined;
      const headers = new Headers();
      for (const [name, value] of Object.entries(request.headers)) {
        if (value) headers.set(name, Array.isArray(value) ? value.join(', ') : value);
      }
      const webResponse = await fetchHandler(new Request(`http://${host}${request.url}`, { method: request.method, headers, body: request.method === 'GET' || request.method === 'HEAD' ? undefined : body }), env, { waitUntil() {} });
      response.writeHead(webResponse.status, Object.fromEntries(webResponse.headers));
      response.end(Buffer.from(await webResponse.arrayBuffer()));
    } catch (error) { console.error(error); response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' }); response.end('Server failure'); }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  console.log('PORT', port);
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  page.on('console', msg => console.log('[console]', msg.type(), msg.text()));
  page.on('pageerror', err => console.log('[pageerror]', err.toString()));
  page.on('requestfailed', req => console.log('[requestfailed]', req.url(), req.failure() && req.failure().errorText));
  const res = await page.goto(`http://127.0.0.1:${port}/`, { waitUntil: 'domcontentloaded', timeout: 30000 });
  console.log('RESPONSE', res && res.status());
  await page.waitForTimeout(5000);
  console.log('TITLE', await page.title());
  const body = await page.locator('body').innerText();
  console.log('BODY', body.slice(0, 400));
  console.log('HAS_APP_TEXT', body.toLowerCase().includes('bhagwati') || body.toLowerCase().includes('smart hospital'));
  await browser.close();
  server.close();
})();
