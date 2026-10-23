import fs from 'node:fs';
import path from 'node:path';
import { clerk, clerkSetup } from '@clerk/testing/playwright';
import { test as setup } from '@playwright/test';
import { AUTH_FILE } from '../playwright.config';

setup.describe.configure({ mode: 'serial' });

// Pide a Clerk un "testing token" para que el inicio de sesión automatizado no
// sea bloqueado como bot. clerkSetup rechaza claves de producción: estas pruebas
// solo corren contra la instancia de desarrollo de Clerk (.env.local).
setup('configurar Clerk', async () => {
  await clerkSetup();
});

setup('iniciar sesión', async ({ page }) => {
  const email = process.env.E2E_CLERK_USER_EMAIL;

  if (!email) {
    // Sin correo configurado se reutiliza la sesión guardada (si existe).
    setup.skip(fs.existsSync(AUTH_FILE), 'Se reutiliza la sesión guardada en e2e/.auth');
    throw new Error(
      'Falta E2E_CLERK_USER_EMAIL: el correo de un usuario de la instancia de desarrollo de Clerk ' +
        '(agrégalo a .env.local o pásalo al ejecutar: E2E_CLERK_USER_EMAIL=... pnpm e2e).'
    );
  }

  // Inicio de sesión por ticket: el backend de Clerk crea un token para ese
  // usuario; no se escribe ninguna contraseña.
  await page.goto('/');
  await clerk.signIn({ page, emailAddress: email });
  await page.goto('/dashboard');
  await page.waitForURL('**/dashboard**');
  // Esperar a que el dashboard cargue el tenant (queda guardado en localStorage).
  await page.waitForFunction(() => !!localStorage.getItem('selected_tenant_id'), null, {
    timeout: 30_000,
  });

  fs.mkdirSync(path.dirname(AUTH_FILE), { recursive: true });
  await page.context().storageState({ path: AUTH_FILE });
});
