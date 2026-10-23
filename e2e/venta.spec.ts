import { expect, test, type Page } from '@playwright/test';

/**
 * Venta completa de punta a punta: POS → cobro en efectivo → historial de
 * ventas → eliminar la venta → el stock vuelve a su valor original.
 *
 * OJO: corre contra el Worker real con el tenant del usuario de prueba, así que
 * crea una venta de verdad. Por eso la elimina al final (también si la prueba
 * falla a mitad de camino). Usa un producto que se venda por paquete normal
 * (no por unidades sueltas) con stock ≥ 1: E2E_PRODUCT="Nombre exacto".
 */

const PRODUCT = process.env.E2E_PRODUCT;

function productCard(page: Page, name: string) {
  return page
    .locator('div.cursor-pointer')
    .filter({ has: page.getByRole('heading', { name, exact: true }) })
    .first();
}

async function readStock(page: Page, name: string): Promise<number> {
  const text = await productCard(page, name).getByText(/Disponible:/).innerText();
  const match = text.match(/Disponible:\s*(\d+)/);
  if (!match) throw new Error(`No se pudo leer el stock de "${name}": ${text}`);
  return Number(match[1]);
}

async function openPos(page: Page, name: string) {
  await page.goto('/dashboard/pos');
  await expect(productCard(page, name)).toBeVisible({ timeout: 30_000 });
}

async function deleteSale(page: Page, saleNumber: string) {
  await page.goto('/dashboard/sales');
  const row = page.locator('tr').filter({ hasText: saleNumber });
  await expect(row).toBeVisible({ timeout: 30_000 });
  await row.getByTitle('Eliminar venta').click();
  await expect(page.getByText('¿Eliminar esta venta?')).toBeVisible();
  await page.getByRole('button', { name: 'Sí, eliminar' }).click();
  await expect(page.getByText('Venta eliminada')).toBeVisible({ timeout: 30_000 });
}

test('venta en efectivo de punta a punta y reversión', async ({ page }) => {
  test.skip(!PRODUCT, 'Define E2E_PRODUCT con el nombre exacto de un producto con stock');
  const name = PRODUCT!;
  let saleNumber: string | null = null;
  let deleted = false;

  try {
    await test.step('agregar el producto al carrito', async () => {
      await openPos(page, name);
      await productCard(page, name).click();
      await expect(page.getByText('Carrito (1)')).toBeVisible();
    });

    const stockBefore = await readStock(page, name);
    expect(stockBefore).toBeGreaterThan(0);

    await test.step('cobrar en efectivo', async () => {
      await page.getByRole('combobox').filter({ hasText: 'Efectivo' }).selectOption('efectivo');
      await page.getByRole('button', { name: 'Procesar Venta' }).click();
      await expect(page.getByText('Venta Completada')).toBeVisible({ timeout: 30_000 });
      const label = await page.getByText(/Venta #VTA-/).innerText();
      saleNumber = label.replace('Venta #', '').trim();
      await page.getByRole('button', { name: 'Aceptar' }).click();
      await expect(page.getByText('Carrito (0)')).toBeVisible();
    });

    await test.step('el stock bajó una unidad', async () => {
      await expect.poll(() => readStock(page, name)).toBe(stockBefore - 1);
    });

    await test.step('la venta aparece en el historial y se elimina', async () => {
      await deleteSale(page, saleNumber!);
      deleted = true;
      await page.reload();
      await expect(page.getByText('Total Ventas')).toBeVisible({ timeout: 30_000 });
      await expect(page.locator('tr').filter({ hasText: saleNumber! })).toHaveCount(0);
    });

    await test.step('el stock volvió a su valor original', async () => {
      await openPos(page, name);
      await expect.poll(() => readStock(page, name)).toBe(stockBefore);
    });
  } finally {
    // Limpieza: nunca dejar una venta de prueba en la tienda.
    if (saleNumber && !deleted) {
      await deleteSale(page, saleNumber).catch((error) =>
        console.error(`⚠️ No se pudo eliminar la venta de prueba ${saleNumber}:`, error)
      );
    }
  }
});
