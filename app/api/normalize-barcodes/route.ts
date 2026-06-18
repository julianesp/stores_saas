/**
 * API Route para normalizar todos los códigos de barras existentes
 *
 * Este endpoint actualiza todos los productos en la base de datos
 * para aplicar la normalización de códigos de barras.
 *
 * Solo se debe ejecutar UNA VEZ para migrar los datos existentes.
 */

import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { getProducts, updateProduct } from '@/lib/cloudflare-api';
import { normalizeBarcode } from '@/lib/barcode-utils';

export async function POST(request: Request) {
  try {
    // Verificar autenticación
    const { userId, getToken } = await auth();

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    console.log('🔧 Iniciando normalización de códigos de barras...');

    // Obtener todos los productos
    const products = await getProducts(getToken);

    let updated = 0;
    let skipped = 0;
    let errors = 0;

    const results = [];

    for (const product of products) {
      try {
        // Si el producto no tiene código de barras, saltarlo
        if (!product.barcode) {
          skipped++;
          continue;
        }

        // Normalizar el código
        const normalized = normalizeBarcode(product.barcode);

        // Si ya está normalizado, saltarlo
        if (normalized === product.barcode) {
          skipped++;
          results.push({
            id: product.id,
            name: product.name,
            barcode: product.barcode,
            status: 'skipped',
            reason: 'Already normalized'
          });
          continue;
        }

        // Actualizar el producto con el código normalizado
        await updateProduct(
          product.id,
          { barcode: normalized || undefined },
          getToken
        );

        updated++;
        results.push({
          id: product.id,
          name: product.name,
          original: product.barcode,
          normalized: normalized,
          status: 'updated'
        });

        console.log(`✅ Actualizado: ${product.name} - ${product.barcode} → ${normalized}`);
      } catch (error) {
        errors++;
        results.push({
          id: product.id,
          name: product.name,
          barcode: product.barcode,
          status: 'error',
          error: error instanceof Error ? error.message : 'Error desconocido'
        });
        console.error(`❌ Error actualizando ${product.name}:`, error);
      }
    }

    console.log(`🎉 Normalización completada:`);
    console.log(`   - Actualizados: ${updated}`);
    console.log(`   - Saltados: ${skipped}`);
    console.log(`   - Errores: ${errors}`);

    return NextResponse.json({
      success: true,
      message: 'Normalización completada',
      stats: {
        total: products.length,
        updated,
        skipped,
        errors
      },
      results
    });
  } catch (error) {
    console.error('Error en normalización:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error al normalizar códigos de barras'
      },
      { status: 500 }
    );
  }
}
