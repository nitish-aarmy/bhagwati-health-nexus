const { app, BrowserWindow } = require('electron')
const http = require('http')
const fs = require('fs/promises')
const path = require('path')
const { pathToFileURL } = require('url')

async function startLocalServer() {
  const serverModulePath = path.join(
    process.resourcesPath,
    'app.asar.unpacked',
    '.output',
    'server',
    'index.mjs',
  )
  const serverModule = await import(pathToFileURL(serverModulePath).href)
  const fetchHandler = serverModule.default.fetch.bind(serverModule.default)
  const publicRoot = path.join(process.resourcesPath, 'app.asar.unpacked', '.output', 'public')

  async function servePublicAsset(request, response) {
    if (request.method !== 'GET' && request.method !== 'HEAD') return false

    const pathname = new URL(request.url || '/', 'http://127.0.0.1').pathname
    if (pathname === '/' || pathname.includes('..')) return false

    const assetPath = path.resolve(publicRoot, `.${pathname}`)
    if (assetPath !== publicRoot && !assetPath.startsWith(`${publicRoot}${path.sep}`)) return false

    try {
      const asset = await fs.readFile(assetPath)
      const extension = path.extname(assetPath).toLowerCase()
      const contentTypes = {
        '.css': 'text/css; charset=utf-8',
        '.html': 'text/html; charset=utf-8',
        '.js': 'text/javascript; charset=utf-8',
        '.json': 'application/json; charset=utf-8',
        '.map': 'application/json; charset=utf-8',
        '.png': 'image/png',
        '.svg': 'image/svg+xml',
        '.woff': 'font/woff',
        '.woff2': 'font/woff2',
      }
      response.writeHead(200, {
        'content-type': contentTypes[extension] || 'application/octet-stream',
        'cache-control': 'no-cache',
      })
      if (request.method === 'HEAD') response.end()
      else response.end(asset)
      return true
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
      return false
    }
  }

  const server = http.createServer(async (request, response) => {
    try {
      if (await servePublicAsset(request, response)) return

      const host = request.headers.host || '127.0.0.1'
      const chunks = []
      for await (const chunk of request) chunks.push(chunk)
      const body = chunks.length > 0 ? Buffer.concat(chunks) : undefined
      const headers = new Headers()
      for (const [name, value] of Object.entries(request.headers)) {
        if (value) headers.set(name, Array.isArray(value) ? value.join(', ') : value)
      }

      const webResponse = await fetchHandler(
        new Request(`http://${host}${request.url}`, {
          method: request.method,
          headers,
          body: request.method === 'GET' || request.method === 'HEAD' ? undefined : body,
        }),
        {},
        { waitUntil() {} },
      )

      console.log(`[server] ${request.method} ${request.url} -> ${webResponse.status}`)
      response.writeHead(webResponse.status, Object.fromEntries(webResponse.headers))
      response.end(Buffer.from(await webResponse.arrayBuffer()))
    } catch (error) {
      console.error(error)
      response.writeHead(500, { 'content-type': 'text/plain; charset=utf-8' })
      response.end('Bhagwati Health Nexus could not start.')
    }
  })

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  return { server, port: typeof address === 'object' && address ? address.port : 0 }
}

async function createWindow() {
  const { server, port } = await startLocalServer()
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  win.webContents.on('console-message', (_event, _level, message) => {
    console.log(`[renderer] ${message}`)
  })
  win.webContents.on('did-fail-load', (_event, errorCode, errorDescription, validatedURL) => {
    console.error(`[renderer] load failed ${errorCode}: ${errorDescription} (${validatedURL})`)
  })
  win.webContents.on('did-finish-load', () => {
    console.log('[renderer] load finished')
  })
  win.on('closed', () => server.close())
  const initialPath = process.argv.includes('--open-referrals') ? '/referrals' : '/'
  win.loadURL(`http://127.0.0.1:${port}${initialPath}`)
}

app.whenReady().then(createWindow).catch((error) => {
  console.error('Failed to start Bhagwati Health Nexus:', error)
  app.quit()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})
