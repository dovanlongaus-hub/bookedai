import { defineConfig, devices } from '@playwright/test';

const mode = process.env.PLAYWRIGHT_PUBLIC_ASSISTANT_MODE === 'live-read' ? 'live-read' : 'legacy';
const port = mode === 'live-read' ? 3101 : 3100;
const liveReadEnv =
  mode === 'live-read'
    ? 'VITE_PUBLIC_BOOKING_ASSISTANT_V1_ENABLED=1 VITE_PUBLIC_BOOKING_ASSISTANT_V1_LIVE_READ=1 '
    : '';

export default defineConfig({
  testDir: './tests',
  fullyParallel: false,
  reporter: 'list',
  outputDir: './output/playwright',
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    headless: true,
    trace: 'retain-on-failure',
  },
  webServer: {
    command: `${liveReadEnv}npm run build && ${liveReadEnv}npx vite preview --host 127.0.0.1 --port ${port} --strictPort`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    cwd: '.',
    timeout: 240000,
  },
  projects: [
    {
      name: mode,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],
});
