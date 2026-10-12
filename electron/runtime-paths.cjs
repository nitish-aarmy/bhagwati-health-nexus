const fs = require('fs')
const path = require('path')

function resolveAppOutputRoot({
  appIsPackaged = false,
  projectRoot = path.join(__dirname, '..'),
  resourcesPath = process.resourcesPath || '',
  fsImpl = fs,
} = {}) {
  const devCandidates = [
    path.join(projectRoot, 'dist-electron'),
    path.join(projectRoot, '.output'),
    projectRoot,
  ]

  const packagedCandidates = [
    path.join(resourcesPath, 'app.asar.unpacked', 'dist-electron'),
    path.join(resourcesPath, 'app.asar.unpacked', '.output'),
    path.join(resourcesPath, 'app.asar.unpacked'),
    path.join(resourcesPath, 'app.asar', 'dist-electron'),
    path.join(resourcesPath, 'app.asar', '.output'),
    path.join(resourcesPath, 'app.asar'),
  ]

  const candidates = appIsPackaged ? packagedCandidates : devCandidates

  for (const candidate of candidates) {
    const serverEntry = path.join(candidate, 'server', 'index.mjs')
    const publicDir = path.join(candidate, 'public')
    const packageJson = path.join(candidate, 'package.json')

    if (fsImpl.existsSync(serverEntry) || fsImpl.existsSync(publicDir) || fsImpl.existsSync(packageJson)) {
      return candidate
    }
  }

  return appIsPackaged ? path.join(resourcesPath, 'app.asar') || projectRoot : projectRoot
}

module.exports = { resolveAppOutputRoot }
