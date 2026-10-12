import fs from 'fs/promises';
import path from 'path';
import { execFileSync } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '..');
const targetDir = path.join(projectRoot, 'dist-electron');

async function exists(candidate) {
  try {
    await fs.access(candidate);
    return true;
  } catch {
    return false;
  }
}

let sourceDir = path.join(projectRoot, '.output');
if (!(await exists(sourceDir))) {
  console.log('No .output bundle found. Running the app build to create it...');
  const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';
  execFileSync(npmCommand, ['run', 'build'], {
    cwd: projectRoot,
    stdio: 'inherit',
  });
}

if (!(await exists(sourceDir))) {
  throw new Error(`Build output was not generated at ${sourceDir}.`);
}

await fs.rm(targetDir, { recursive: true, force: true });
await fs.mkdir(targetDir, { recursive: true });
await fs.cp(sourceDir, targetDir, { recursive: true, force: true });

console.log(`Prepared Electron output in ${targetDir}`);
