import { spawn } from 'node:child_process';

const port = process.argv[2] ?? '3100';

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
  await runCommand('npm run build', {
    env: process.env,
  });

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
