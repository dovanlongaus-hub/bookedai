import { spawn } from 'node:child_process';

const port = process.argv[2] ?? '3100';
const skipBuild = process.argv.includes('--skip-build');

function killExistingPreviewServer(portNumber) {
  return new Promise((resolve, reject) => {
    const child = spawn(`lsof -ti tcp:${String(portNumber)}`, {
      stdio: ['ignore', 'pipe', 'inherit'],
      shell: true,
    });

    let stdout = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString();
    });

    child.on('error', reject);
    child.on('exit', (code) => {
      if (code !== 0 && !stdout.trim()) {
        resolve();
        return;
      }

      const pids = stdout
        .split(/\s+/)
        .map((value) => value.trim())
        .filter(Boolean);

      if (pids.length === 0) {
        resolve();
        return;
      }

      const killer = spawn(`kill ${pids.join(' ')}`, {
        stdio: 'inherit',
        shell: true,
      });

      killer.on('error', reject);
      killer.on('exit', (killCode) => {
        if (killCode === 0) {
          resolve();
          return;
        }
        reject(new Error(`Failed to stop existing preview server on port ${String(portNumber)}`));
      });
    });
  });
}

function runCommand(command, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      stdio: 'inherit',
      shell: true,
      ...options,
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

async function main() {
  await killExistingPreviewServer(port);

  if (!skipBuild) {
    await runCommand('npm run build', {
      env: process.env,
    });
  }

  await killExistingPreviewServer(port);

  let shuttingDown = false;
  let preview = null;

  function spawnPreview() {
    preview = spawn('node', ['scripts/serve_dist_spa.mjs'], {
      stdio: 'inherit',
      env: {
        ...process.env,
        PLAYWRIGHT_PREVIEW_HOST: '127.0.0.1',
        PLAYWRIGHT_PREVIEW_PORT: String(port),
      },
    });

    preview.on('error', (error) => {
      console.error(error);
      process.exit(1);
    });

    preview.on('exit', (code) => {
      if (shuttingDown) {
        process.exit(code ?? 0);
        return;
      }

      console.error(`[playwright-preview] preview exited with code ${code ?? 0}; restarting`);
      setTimeout(spawnPreview, 250);
    });
  }

  spawnPreview();

  process.on('SIGINT', () => {
    shuttingDown = true;
    preview?.kill('SIGINT');
  });
  process.on('SIGTERM', () => {
    shuttingDown = true;
    preview?.kill('SIGTERM');
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
