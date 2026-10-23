import { expect, test } from '@playwright/test';

// Pruebas sin sesión: no tocan datos de ningún tenant.

test('la página de inicio carga', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/posib\.dev/);
});

test('el dashboard exige iniciar sesión', async ({ page }) => {
  await page.goto('/dashboard/pos');
  await expect(page).toHaveURL(/\/sign-in/);
});

test('la pantalla de inicio de sesión muestra el formulario de Clerk', async ({ page }) => {
  await page.goto('/sign-in');
  await expect(page.locator('input[name="identifier"]')).toBeVisible({ timeout: 20_000 });
});
