import { defineConfig, devices } from '@playwright/test';
import { loadEnvConfig } from '@next/env';

// Mismas variables que `pnpm dev` (.env.local): las claves de Clerk de desarrollo
// y, opcionalmente, E2E_CLERK_USER_EMAIL / E2E_PRODUCT para las pruebas con sesión.
loadEnvConfig(process.cwd());

export const AUTH_FILE = 'e2e/.auth/user.json';
const PORT = Number(process.env.E2E_PORT || 3000);

export default defineConfig({
  testDir: './e2e',
  // Las pruebas con sesión escriben en la base real del tenant (crean y borran
  // una venta): se ejecutan en serie para no pisarse entre sí.
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  // La primera visita a cada ruta compila con Turbopack y puede tardar.
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'e2e/report' }]],
  outputDir: 'e2e/test-results',
  use: {
    baseURL: `http://localhost:${PORT}`,
    locale: 'es-CO',
    timezoneId: 'America/Bogota',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: `pnpm dev --port ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  projects: [
    { name: 'setup', testMatch: /global\.setup\.ts/ },
    {
      name: 'publico',
      testMatch: /publico\.spec\.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'con-sesion',
      testMatch: /venta\.spec\.ts/,
      dependencies: ['setup'],
      use: { ...devices['Desktop Chrome'], storageState: AUTH_FILE },
    },
  ],
});
