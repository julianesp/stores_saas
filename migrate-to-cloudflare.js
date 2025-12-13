#!/usr/bin/env node

/**
 * Script de Migración Automática: Firebase → Cloudflare API
 *
 * Este script actualiza automáticamente los archivos del frontend
 * para usar la nueva API de Cloudflare en lugar de Firebase.
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Iniciando migración automática a Cloudflare API\n');

// Archivos a actualizar
const FILES_TO_UPDATE = [
  'app/dashboard/products/new/page.tsx',
  'app/dashboard/products/[id]/page.tsx',
  'app/dashboard/products/quick-add/page.tsx',
  'app/dashboard/customers/page.tsx',
  'app/dashboard/customers/[id]/page.tsx',
  'app/dashboard/customers/new/page.tsx',
  'app/dashboard/sales/page.tsx',
  'app/dashboard/sales/[id]/page.tsx',
  'app/dashboard/pos/page.tsx',
  'app/dashboard/inventory/page.tsx',
  'app/dashboard/offers/page.tsx',
  'components/products/category-manager-modal.tsx',
];

// Contador de cambios
let filesUpdated = 0;
let filesSkipped = 0;
let filesError = 0;

/**
 * Actualizar un archivo
 */
function updateFile(filePath) {
  const fullPath = path.join(__dirname, filePath);

  console.log(`\n📝 Procesando: ${filePath}`);

  // Verificar si el archivo existe
  if (!fs.existsSync(fullPath)) {
    console.log(`   ⚠️  Archivo no encontrado, saltando...`);
    filesSkipped++;
    return;
  }

  // Leer contenido
  let content = fs.readFileSync(fullPath, 'utf8');
  const originalContent = content;

  // Verificar si ya está migrado
  if (content.includes('from \'@/lib/cloudflare-api\'')) {
    console.log(`   ✅ Ya migrado, saltando...`);
    filesSkipped++;
    return;
  }

  // Verificar si usa Firebase
  if (!content.includes('from \'@/lib/firestore-helpers\'')) {
    console.log(`   ⏭️  No usa Firebase, saltando...`);
    filesSkipped++;
    return;
  }

  try {
    // 1. Agregar import de useAuth si no existe
    if (!content.includes('import { useAuth }') && !content.includes('import {useAuth}')) {
      // Buscar donde están los otros imports
      const importRegex = /(import.*from ['"]react['"];?\n)/;
      if (importRegex.test(content)) {
        content = content.replace(importRegex, "$1import { useAuth } from '@clerk/nextjs';\n");
        console.log('   ✓ Agregado import de useAuth');
      }
    }

    // 2. Reemplazar imports de firestore-helpers
    const firestoreImports = [
      'getAllDocuments',
      'getDocumentById',
      'createDocument',
      'updateDocument',
      'deleteDocument',
      'queryDocuments'
    ];

    // Mapeo de funciones Firebase → Cloudflare por colección
    const apiMappings = {
      products: {
        getAllDocuments: 'getProducts',
        getDocumentById: 'getProductById',
        createDocument: 'createProduct',
        updateDocument: 'updateProduct',
        deleteDocument: 'deleteProduct'
      },
      customers: {
        getAllDocuments: 'getCustomers',
        getDocumentById: 'getCustomerById',
        createDocument: 'createCustomer',
        updateDocument: 'updateCustomer',
        deleteDocument: 'deleteCustomer'
      },
      categories: {
        getAllDocuments: 'getCategories',
        getDocumentById: 'getCategoryById',
        createDocument: 'createCategory',
        updateDocument: 'updateCategory',
        deleteDocument: 'deleteCategory'
      },
      sales: {
        getAllDocuments: 'getSales',
        getDocumentById: 'getSaleById',
        createDocument: 'createSale'
      }
    };

    // Reemplazar import de firestore-helpers
    content = content.replace(
      /import\s*{([^}]+)}\s*from\s*['"]@\/lib\/firestore-helpers['"];?/g,
      (match, imports) => {
        // Extraer las funciones usadas
        const usedFunctions = imports.split(',').map(f => f.trim());

        // Determinar qué funciones de API necesitamos importar
        const apiImports = new Set();

        // Buscar en el contenido qué colecciones se usan
        for (const [collection, mapping] of Object.entries(apiMappings)) {
          if (content.includes(`'${collection}'`) || content.includes(`"${collection}"`)) {
            for (const [fbFunc, apiFunc] of Object.entries(mapping)) {
              if (usedFunctions.some(f => f.includes(fbFunc))) {
                apiImports.add(apiFunc);
              }
            }
          }
        }

        if (apiImports.size > 0) {
          console.log(`   ✓ Reemplazando imports de Firestore por: ${Array.from(apiImports).join(', ')}`);
          return `import { ${Array.from(apiImports).join(', ')} } from '@/lib/cloudflare-api';`;
        }

        return match; // Mantener original si no hay mappings
      }
    );

    // 3. Agregar useAuth hook al inicio del componente
    if (!content.includes('const { getToken } = useAuth()')) {
      // Buscar el export default function y agregar después
      content = content.replace(
        /(export default function \w+\([^)]*\)\s*{)/,
        '$1\n  const { getToken } = useAuth();\n'
      );
      console.log('   ✓ Agregado hook useAuth()');
    }

    // 4. Reemplazar llamadas a getAllDocuments
    content = content.replace(
      /await\s+getAllDocuments\(\s*['"](\w+)['"]\s*\)/g,
      (match, collection) => {
        const apiFunc = apiMappings[collection]?.getAllDocuments;
        if (apiFunc) {
          console.log(`   ✓ getAllDocuments('${collection}') → ${apiFunc}(getToken)`);
          return `await ${apiFunc}(getToken)`;
        }
        return match;
      }
    );

    // 5. Reemplazar llamadas a getDocumentById
    content = content.replace(
      /await\s+getDocumentById\(\s*['"](\w+)['"]\s*,\s*([^)]+)\)/g,
      (match, collection, id) => {
        const apiFunc = apiMappings[collection]?.getDocumentById;
        if (apiFunc) {
          console.log(`   ✓ getDocumentById('${collection}', ...) → ${apiFunc}(${id}, getToken)`);
          return `await ${apiFunc}(${id}, getToken)`;
        }
        return match;
      }
    );

    // 6. Reemplazar llamadas a createDocument
    content = content.replace(
      /await\s+createDocument\(\s*['"](\w+)['"]\s*,\s*([^)]+)\)/g,
      (match, collection, data) => {
        const apiFunc = apiMappings[collection]?.createDocument;
        if (apiFunc) {
          console.log(`   ✓ createDocument('${collection}', ...) → ${apiFunc}(..., getToken)`);
          return `await ${apiFunc}(${data}, getToken)`;
        }
        return match;
      }
    );

    // 7. Reemplazar llamadas a updateDocument
    content = content.replace(
      /await\s+updateDocument\(\s*['"](\w+)['"]\s*,\s*([^,]+),\s*([^)]+)\)/g,
      (match, collection, id, data) => {
        const apiFunc = apiMappings[collection]?.updateDocument;
        if (apiFunc) {
          console.log(`   ✓ updateDocument('${collection}', ...) → ${apiFunc}(${id}, ${data}, getToken)`);
          return `await ${apiFunc}(${id}, ${data}, getToken)`;
        }
        return match;
      }
    );

    // 8. Reemplazar llamadas a deleteDocument
    content = content.replace(
      /await\s+deleteDocument\(\s*['"](\w+)['"]\s*,\s*([^)]+)\)/g,
      (match, collection, id) => {
        const apiFunc = apiMappings[collection]?.deleteDocument;
        if (apiFunc) {
          console.log(`   ✓ deleteDocument('${collection}', ...) → ${apiFunc}(${id}, getToken)`);
          return `await ${apiFunc}(${id}, getToken)`;
        }
        return match;
      }
    );

    // Verificar si hubo cambios
    if (content === originalContent) {
      console.log(`   ⚠️  No se realizaron cambios`);
      filesSkipped++;
      return;
    }

    // Guardar el archivo actualizado
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`   ✅ Archivo actualizado exitosamente`);
    filesUpdated++;

  } catch (error) {
    console.error(`   ❌ Error procesando archivo: ${error.message}`);
    filesError++;
  }
}

/**
 * Ejecutar migración
 */
function migrate() {
  console.log('Archivos a procesar:', FILES_TO_UPDATE.length);
  console.log('='.repeat(60));

  for (const file of FILES_TO_UPDATE) {
    updateFile(file);
  }

  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Resumen de la migración:\n');
  console.log(`   ✅ Archivos actualizados: ${filesUpdated}`);
  console.log(`   ⏭️  Archivos saltados: ${filesSkipped}`);
  console.log(`   ❌ Errores: ${filesError}`);
  console.log('\n' + '='.repeat(60));

  if (filesUpdated > 0) {
    console.log('\n✨ Migración completada con éxito!\n');
    console.log('📋 Próximos pasos:');
    console.log('   1. Revisa los archivos actualizados');
    console.log('   2. Ejecuta: npm run dev');
    console.log('   3. Prueba la funcionalidad en el navegador');
    console.log('   4. Verifica que no haya errores en la consola\n');
  } else {
    console.log('\n⚠️  No se actualizó ningún archivo.');
    console.log('   Los archivos ya estaban migrados o no usan Firebase.\n');
  }
}

// Ejecutar migración
migrate();
