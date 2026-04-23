import { access, mkdir, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requestedOutDir = process.env.BUILD_OUT_DIR?.trim();
const defaultOutDir = path.join(rootDir, 'dist');
const fallbackOutDir = path.join('/tmp', 'bookedai-frontend-dist');

async function canWriteDir(targetPath) {
  try {
    await access(targetPath, constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

async function canUseDefaultOutDir(targetPath) {
  await mkdir(targetPath, { recursive: true });

  if (!(await canWriteDir(targetPath))) {
    return false;
  }

  const nestedPaths = [path.join(targetPath, 'assets'), path.join(targetPath, 'branding')];
  for (const nestedPath of nestedPaths) {
    try {
      const details = await stat(nestedPath);
      if (details.isDirectory() && !(await canWriteDir(nestedPath))) {
        return false;
      }
    } catch {
      // Missing nested directories are fine.
    }
  }

  return true;
}

function run(command, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      cwd: rootDir,
      stdio: 'inherit',
      shell: true,
      env,
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code === 0) {
        resolve();
        return;
      }
      reject(new Error(`${command} exited with code ${code ?? 1}`));
    });
  });
}

const resolvedOutDir = requestedOutDir
  ? path.resolve(rootDir, requestedOutDir)
  : (await canUseDefaultOutDir(defaultOutDir))
    ? defaultOutDir
    : fallbackOutDir;
const usingRequestedOutDir = Boolean(requestedOutDir);

const env = {
  ...process.env,
  BUILD_OUT_DIR: resolvedOutDir,
};

if (resolvedOutDir !== defaultOutDir) {
  const reason = usingRequestedOutDir ? 'requested BUILD_OUT_DIR' : 'dist is not writable';
  console.warn(`[frontend build] ${reason}, using outDir: ${resolvedOutDir}`);
}

await run('npm run sync:template', env);
await run('tsc', env);
await run('vite build', env);
await run('node scripts/generate-hosted-html.mjs', env);
