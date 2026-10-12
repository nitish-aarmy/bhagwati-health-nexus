const { app, BrowserWindow } = require('electron')
const http = require('http')
const fs = require('fs/promises')
const path = require('path')
const { spawn } = require('child_process')
const { pathToFileURL } = require('url')
const { resolveAppOutputRoot } = require('./runtime-paths.cjs')

let viteProcess = null
let localServer = null

function resolveProjectSourceRoot() {
  const projectRoot = resolveAppOutputRoot({
    appIsPackaged: app.isPackaged,
    projectRoot: path.join(__dirname, '..'),
    resourcesPath: process.resourcesPath,
  })

  return path.join(projectRoot, 'src')
}

function stopViteServer() {
  if (viteProcess && !viteProcess.killed) {
    viteProcess.kill('SIGTERM')
    viteProcess = null
  }
}

async function startViteDevServer() {
  const projectRoot = resolveAppOutputRoot()
  const port = 4173

  return new Promise((resolve, reject) => {
    const child = spawn(
      process.platform === 'win32' ? 'npx.cmd' : 'npx',
      ['vite', 'dev', '--host', '127.0.0.1', '--port', String(port), '--strictPort'],
      {
        cwd: projectRoot,
        env: {
          ...process.env,
          BROWSER: 'none',
          FORCE_COLOR: '0',
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
    )

    viteProcess = child
    let settled = false

    const finish = (callback, value) => {
      if (!settled) {
        settled = true
        callback(value)
      }
    }

    const handleOutput = (chunk) => {
      const text = chunk.toString()
      process.stdout.write(`[vite] ${text}`)
      const match = text.match(/https?:\/\/127\.0\.0\.1:(\d+)/i) || text.match(/https?:\/\/localhost:(\d+)/i)
      if (match) {
        finish(resolve, Number(match[1]))
      }
    }

    child.stdout.on('data', handleOutput)
    child.stderr.on('data', handleOutput)

    child.on('error', (error) => {
      finish(reject, error)
    })

    child.on('exit', (code) => {
      if (!settled && code !== 0) {
        finish(reject, new Error(`Vite dev server exited with code ${code}`))
      }
    })
  })
}

async function startLocalServer() {
  const outputRoot = resolveAppOutputRoot({
    appIsPackaged: app.isPackaged,
    projectRoot: path.join(__dirname, '..'),
    resourcesPath: process.resourcesPath,
  })
  const appRoot = require('fs').existsSync(path.join(outputRoot, 'src')) ? outputRoot : path.dirname(outputRoot)
  const serverModuleCandidates = [
    path.join(outputRoot, 'server', 'index.mjs'),
    path.join(outputRoot, 'dist-electron', 'server', 'index.mjs'),
    path.join(outputRoot, '.output', 'server', 'index.mjs'),
    path.join(outputRoot, '..', 'app.asar.unpacked', 'dist-electron', 'server', 'index.mjs'),
    path.join(outputRoot, '..', 'app.asar.unpacked', 'server', 'index.mjs'),
    path.join(outputRoot, '..', 'app.asar', 'dist-electron', 'server', 'index.mjs'),
  ].filter((candidate) => require('fs').existsSync(candidate))
  const serverModulePath = serverModuleCandidates[0]
  if (!serverModulePath) {
    throw new Error(`Unable to locate Nitro server bundle in packaged app output: ${outputRoot}`)
  }
  const serverModule = await import(pathToFileURL(serverModulePath).href)
  const fetchHandler = serverModule.default.fetch.bind(serverModule.default)
  const publicRoot = require('fs').existsSync(path.join(outputRoot, 'public'))
    ? path.join(outputRoot, 'public')
    : require('fs').existsSync(path.join(outputRoot, '.output', 'public'))
      ? path.join(outputRoot, '.output', 'public')
      : path.join(outputRoot, 'dist-electron', 'public')

  async function serveAsset(request) {
    if (request.method !== 'GET' && request.method !== 'HEAD') return null

    const pathname = new URL(request.url || '/', 'http://127.0.0.1').pathname
    if (pathname.includes('..')) return null
    if (pathname.startsWith('/src/') || pathname.startsWith('/@')) return null

    const candidateRoots = [publicRoot, outputRoot]
    const assetCandidates = []

    if (pathname !== '/') {
      const relativePath = pathname.replace(/^\/+/, '')
      for (const candidateRoot of candidateRoots) {
        const candidate = path.resolve(candidateRoot, relativePath)
        const safeBase = path.resolve(candidateRoot)
        if (candidate.startsWith(safeBase) && candidate !== safeBase) {
          assetCandidates.push(candidate)
        }
      }
    }

    for (const assetPath of assetCandidates) {
      try {
        const asset = await fs.readFile(assetPath)
        const extension = path.extname(assetPath).toLowerCase()
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
        }
        return new Response(asset, {
          status: 200,
          headers: {
            'content-type': contentTypes[extension] || 'application/octet-stream',
            'cache-control': 'no-cache',
          },
        })
      } catch (error) {
        if (error.code !== 'ENOENT') throw error
      }
    }

    return null
  }

  const env = {
    ASSETS: {
      async fetch(request) {
        return serveAsset(request)
      },
    },
  }

  const server = http.createServer(async (request, response) => {
    try {
      const pathname = new URL(request.url || '/', 'http://127.0.0.1').pathname
      if (pathname !== '/' && pathname.includes('..')) {
        response.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' })
        response.end('Invalid asset request.')
        return
      }

      const assetResponse = await serveAsset(request)
      if (assetResponse) {
        response.writeHead(assetResponse.status, Object.fromEntries(assetResponse.headers))
        response.end(Buffer.from(await assetResponse.arrayBuffer()))
        return
      }

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
        env,
        {
          waitUntil() {},
        },
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
  let url = 'http://127.0.0.1:4173/'

  if (app.isPackaged) {
    if (!localServer) {
      localServer = await startLocalServer()
    }
    url = `http://127.0.0.1:${localServer.port}${process.argv.includes('--open-referrals') ? '/referrals' : '/'}`
  } else {
    const port = await startViteDevServer()
    url = `http://127.0.0.1:${port}${process.argv.includes('--open-referrals') ? '/referrals' : '/'}`
  }

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
  win.on('closed', () => {
    if (localServer) {
      const closeTarget = localServer.server || localServer
      if (closeTarget && typeof closeTarget.close === 'function') {
        closeTarget.close()
      }
      localServer = null
    }
    stopViteServer()
  })

  win.loadURL(url)
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
