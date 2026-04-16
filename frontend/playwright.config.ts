import { defineConfig, devices } from '@playwright/test';

const mode = process.env.PLAYWRIGHT_PUBLIC_ASSISTANT_MODE === 'live-read' ? 'live-read' : 'legacy';
const port = mode === 'live-read' ? 3101 : 3100;
const modeEnv =
  mode === 'live-read'
    ? 'VITE_PUBLIC_BOOKING_ASSISTANT_V1_ENABLED=1 VITE_PUBLIC_BOOKING_ASSISTANT_V1_LIVE_READ=1 '
    : 'VITE_PUBLIC_BOOKING_ASSISTANT_V1_ENABLED=0 VITE_PUBLIC_BOOKING_ASSISTANT_V1_LIVE_READ=0 ';
const externalServer = process.env.PLAYWRIGHT_EXTERNAL_SERVER === '1';

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
  webServer: externalServer
    ? undefined
    : {
        command: `${modeEnv}node scripts/start-playwright-preview.mjs ${port}`,
        url: `http://127.0.0.1:${port}`,
        reuseExistingServer: true,
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
