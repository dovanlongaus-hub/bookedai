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

  const preview = spawn(
    `npx vite preview --host 127.0.0.1 --port ${String(port)} --strictPort`,
    {
      stdio: 'inherit',
      shell: true,
      env: process.env,
    },
  );

  preview.on('error', (error) => {
    console.error(error);
    process.exit(1);
  });

  process.on('SIGINT', () => preview.kill('SIGINT'));
  process.on('SIGTERM', () => preview.kill('SIGTERM'));

  preview.on('exit', (code) => {
    process.exit(code ?? 0);
  });
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
