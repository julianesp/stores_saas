#!/usr/bin/env node

/**
 * Script para crear productos de ejemplo en la tienda
 * Ejecutar: node scripts/seed-products.js
 */

const API_URL = process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL || 'https://tienda-pos-api.julii1295.workers.dev';

// Token de Clerk - debes obtenerlo desde tu sesión activa
// Ve a: localStorage.getItem('__clerk_db_jwt') en la consola del navegador
const CLERK_TOKEN = process.argv[2];

if (!CLERK_TOKEN) {
  console.error('❌ Error: Debes proporcionar un token de Clerk');
  console.log('\n📋 Instrucciones:');
  console.log('1. Abre tu navegador e inicia sesión en http://localhost:3000');
  console.log('2. Abre la consola del navegador (F12)');
  console.log('3. Ejecuta: await window.Clerk.session.getToken()');
  console.log('4. Copia el token y ejecuta: node scripts/seed-products.js "TU_TOKEN_AQUI"\n');
  process.exit(1);
}

// Categorías a crear
const categories = [
  { name: 'Bebidas', description: 'Bebidas frías y calientes' },
  { name: 'Snacks', description: 'Papas, galletas y dulces' },
  { name: 'Lácteos', description: 'Leche, yogurt y quesos' },
  { name: 'Panadería', description: 'Pan, tortas y pastelería' },
  { name: 'Aseo', description: 'Productos de limpieza' },
  { name: 'Tecnología', description: 'Accesorios y electrónicos' },
];

// Productos a crear
const products = [
  // Bebidas
  { name: 'Coca Cola 400ml', category: 'Bebidas', cost_price: 1800, sale_price: 2500, stock: 50, min_stock: 10, barcode: '7702001012345' },
  { name: 'Agua Cristal 600ml', category: 'Bebidas', cost_price: 800, sale_price: 1200, stock: 100, min_stock: 20, barcode: '7702002012346' },
  { name: 'Jugo Hit Mora 200ml', category: 'Bebidas', cost_price: 1200, sale_price: 1800, stock: 40, min_stock: 10, barcode: '7702003012347' },
  { name: 'Cerveza Poker 330ml', category: 'Bebidas', cost_price: 1500, sale_price: 2300, stock: 30, min_stock: 10, barcode: '7702004012348' },
  { name: 'Energizante Red Bull', category: 'Bebidas', cost_price: 3500, sale_price: 5000, stock: 25, min_stock: 5, barcode: '7702005012349' },

  // Snacks
  { name: 'Papas Margarita Natural', category: 'Snacks', cost_price: 1000, sale_price: 1500, stock: 60, min_stock: 15, barcode: '7702006012340' },
  { name: 'Doritos Queso', category: 'Snacks', cost_price: 1200, sale_price: 1800, stock: 45, min_stock: 10, barcode: '7702007012341' },
  { name: 'Chocolatina Jet', category: 'Snacks', cost_price: 800, sale_price: 1200, stock: 80, min_stock: 20, barcode: '7702008012342' },
  { name: 'Galletas Oreo', category: 'Snacks', cost_price: 2500, sale_price: 3500, stock: 35, min_stock: 10, barcode: '7702009012343' },
  { name: 'Chicles Trident', category: 'Snacks', cost_price: 600, sale_price: 1000, stock: 90, min_stock: 20, barcode: '7702010012344' },

  // Lácteos
  { name: 'Leche Alpina 1L', category: 'Lácteos', cost_price: 3200, sale_price: 4500, stock: 25, min_stock: 5, barcode: '7702011012345' },
  { name: 'Yogurt Alpina Vaso', category: 'Lácteos', cost_price: 1500, sale_price: 2200, stock: 40, min_stock: 10, barcode: '7702012012346' },
  { name: 'Queso Tajado Alpina', category: 'Lácteos', cost_price: 3800, sale_price: 5500, stock: 20, min_stock: 5, barcode: '7702013012347' },
  { name: 'Kumis Alpina 1L', category: 'Lácteos', cost_price: 3000, sale_price: 4200, stock: 30, min_stock: 8, barcode: '7702014012348' },

  // Panadería
  { name: 'Pan Tajado Bimbo', category: 'Panadería', cost_price: 4500, sale_price: 6200, stock: 20, min_stock: 5, barcode: '7702015012349' },
  { name: 'Ponqué Ramo', category: 'Panadería', cost_price: 2000, sale_price: 3000, stock: 35, min_stock: 10, barcode: '7702016012340' },
  { name: 'Tostadas Doña Paisa', category: 'Panadería', cost_price: 2800, sale_price: 4000, stock: 25, min_stock: 8, barcode: '7702017012341' },

  // Aseo
  { name: 'Jabón Protex', category: 'Aseo', cost_price: 2500, sale_price: 3500, stock: 40, min_stock: 10, barcode: '7702018012342' },
  { name: 'Shampoo Sedal 400ml', category: 'Aseo', cost_price: 8500, sale_price: 12000, stock: 20, min_stock: 5, barcode: '7702019012343' },
  { name: 'Papel Higiénico Familia', category: 'Aseo', cost_price: 12000, sale_price: 16000, stock: 30, min_stock: 8, barcode: '7702020012344' },
  { name: 'Detergente Ariel 500g', category: 'Aseo', cost_price: 6500, sale_price: 9000, stock: 25, min_stock: 5, barcode: '7702021012345' },

  // Tecnología
  { name: 'Cable USB-C 1m', category: 'Tecnología', cost_price: 5000, sale_price: 8000, stock: 15, min_stock: 3, barcode: '7702022012346' },
  { name: 'Audífonos Bluetooth', category: 'Tecnología', cost_price: 25000, sale_price: 35000, stock: 10, min_stock: 2, barcode: '7702023012347' },
  { name: 'Cargador Rápido', category: 'Tecnología', cost_price: 15000, sale_price: 22000, stock: 12, min_stock: 3, barcode: '7702024012348' },
  { name: 'Mouse Inalámbrico', category: 'Tecnología', cost_price: 18000, sale_price: 28000, stock: 8, min_stock: 2, barcode: '7702025012349' },
];

async function apiCall(endpoint, method = 'GET', data = null) {
  const options = {
    method,
    headers: {
      'Authorization': `Bearer ${CLERK_TOKEN}`,
      'Content-Type': 'application/json',
    },
  };

  if (data) {
    options.body = JSON.stringify(data);
  }

  try {
    const response = await fetch(`${API_URL}${endpoint}`, options);
    const result = await response.json();

    if (!response.ok || !result.success) {
      const errorMsg = result.error || result.message || `HTTP ${response.status}`;
      throw new Error(errorMsg);
    }

    return result.data;
  } catch (error) {
    if (error.message) {
      throw error;
    }
    throw new Error(`Network error: ${error.toString()}`);
  }
}

async function main() {
  console.log('🚀 Iniciando creación de productos de ejemplo...\n');

  try {
    // Crear categorías
    console.log('📁 Creando categorías...');
    const createdCategories = {};

    for (const category of categories) {
      try {
        const created = await apiCall('/api/categories', 'POST', category);
        createdCategories[category.name] = created.id;
        console.log(`  ✅ ${category.name}`);
      } catch (error) {
        if (error.message.includes('already exists')) {
          // Obtener categorías existentes
          const existing = await apiCall('/api/categories');
          const found = existing.find(c => c.name === category.name);
          if (found) {
            createdCategories[category.name] = found.id;
            console.log(`  ⏭️  ${category.name} (ya existe)`);
          }
        } else {
          console.error(`  ❌ Error creando ${category.name}:`, error.message);
        }
      }
    }

    console.log(`\n📦 Creando ${products.length} productos...\n`);

    let created = 0;
    let skipped = 0;
    let errors = 0;

    for (const product of products) {
      try {
        const productData = {
          ...product,
          category_id: createdCategories[product.category],
        };
        delete productData.category;

        await apiCall('/api/products', 'POST', productData);
        console.log(`  ✅ ${product.name} - ${product.sale_price.toLocaleString('es-CO', { style: 'currency', currency: 'COP' })}`);
        created++;
      } catch (error) {
        if (error.message.includes('already exists') || error.message.includes('UNIQUE constraint')) {
          console.log(`  ⏭️  ${product.name} (ya existe)`);
          skipped++;
        } else {
          console.error(`  ❌ ${product.name}: ${error.message}`);
          errors++;
        }
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✨ Proceso completado!\n');
    console.log(`📊 Resumen:`);
    console.log(`  ✅ Productos creados: ${created}`);
    console.log(`  ⏭️  Productos saltados: ${skipped}`);
    console.log(`  ❌ Errores: ${errors}`);
    console.log('='.repeat(60));

    if (created > 0) {
      console.log('\n🎉 Ya puedes empezar a hacer ventas en http://localhost:3000/dashboard/pos\n');
    }

  } catch (error) {
    console.error('\n❌ Error fatal:', error.message);
    process.exit(1);
  }
}

main();
