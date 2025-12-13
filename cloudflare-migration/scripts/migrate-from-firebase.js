/**
 * Script de Migración: Firebase/Firestore → Cloudflare D1
 *
 * Este script exporta datos de Firestore e importa a D1
 *
 * Uso:
 * 1. Colocar serviceAccountKey.json en la raíz
 * 2. npm install firebase-admin dotenv
 * 3. node scripts/migrate-from-firebase.js
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Configurar Firebase Admin
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Colecciones a migrar
const COLLECTIONS = [
  'user_profiles',
  'products',
  'customers',
  'sales',
  'sale_items',
  'categories',
  'suppliers',
  'inventory_movements',
  'offers',
  'credit_payments',
  'loyalty_settings',
  'payment_transactions',
  'purchase_orders',
  'purchase_order_items'
];

/**
 * Exportar una colección de Firestore a JSON
 */
async function exportCollection(collectionName) {
  console.log(`\n📦 Exportando ${collectionName}...`);

  const snapshot = await db.collection(collectionName).get();
  const documents = [];

  snapshot.forEach(doc => {
    documents.push({
      id: doc.id,
      ...doc.data()
    });
  });

  console.log(`   ✅ ${documents.length} documentos exportados`);

  return documents;
}

/**
 * Agrupar documentos por user_profile_id (tenant)
 */
function groupByTenant(documents, collectionName) {
  const tenants = {};

  documents.forEach(doc => {
    // Identificar el tenant basándose en user_profile_id o cashier_id
    let tenantId = null;

    if (collectionName === 'user_profiles') {
      tenantId = doc.id; // El user_profile mismo es el tenant
    } else if (doc.user_profile_id) {
      tenantId = doc.user_profile_id;
    } else if (doc.cashier_id) {
      // Para sales, usar cashier_id como referencia al tenant
      tenantId = doc.cashier_id;
    } else if (collectionName === 'customers' && doc.id) {
      // Customers sin user_profile_id - necesita análisis manual
      tenantId = 'ORPHAN';
    }

    if (tenantId) {
      if (!tenants[tenantId]) {
        tenants[tenantId] = [];
      }
      tenants[tenantId].push(doc);
    }
  });

  return tenants;
}

/**
 * Convertir datos de Firestore a SQL INSERT
 * AGREGANDO tenant_id para Opción B (DB Compartida)
 */
function generateSQLInserts(documents, tableName, tenantId) {
  if (documents.length === 0) {
    return '';
  }

  const inserts = [];

  // Tablas que NO necesitan tenant_id (ya tienen user_profile_id)
  const TABLES_WITHOUT_TENANT_ID = ['user_profiles', 'payment_transactions', 'loyalty_settings'];

  for (const doc of documents) {
    // Agregar tenant_id si la tabla lo requiere
    if (!TABLES_WITHOUT_TENANT_ID.includes(tableName)) {
      doc.tenant_id = tenantId;
    }

    const columns = Object.keys(doc);
    const values = columns.map(col => {
      const value = doc[col];

      if (value === null || value === undefined) {
        return 'NULL';
      }

      // Convertir Timestamp de Firestore a string ISO
      if (value && value._seconds !== undefined) {
        return `'${new Date(value._seconds * 1000).toISOString()}'`;
      }

      // Arrays y objetos a JSON
      if (typeof value === 'object') {
        return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
      }

      // Strings
      if (typeof value === 'string') {
        return `'${value.replace(/'/g, "''")}'`;
      }

      // Números y booleanos
      return value;
    });

    inserts.push(
      `INSERT OR IGNORE INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});`
    );
  }

  return inserts.join('\n');
}

/**
 * Main Migration Function
 */
async function migrate() {
  console.log('🚀 Iniciando migración Firebase → Cloudflare D1\n');
  console.log('================================================\n');

  try {
    // Paso 1: Exportar todos los datos
    console.log('📥 PASO 1: Exportando datos de Firestore');

    const allData = {};

    for (const collection of COLLECTIONS) {
      allData[collection] = await exportCollection(collection);
    }

    // Paso 2: Agrupar por tenant
    console.log('\n🏢 PASO 2: Agrupando datos por tenant (tienda)');

    const userProfiles = allData['user_profiles'];
    console.log(`\n   Encontrados ${userProfiles.length} tenants (tiendas)`);

    // Crear directorio de salida
    const outputDir = path.join(__dirname, '../migration-output');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir);
    }

    // Paso 3: Generar SQL para cada tenant
    console.log('\n📝 PASO 3: Generando archivos SQL por tenant');

    for (const userProfile of userProfiles) {
      const tenantId = userProfile.id;
      const tenantEmail = userProfile.email || 'unknown';

      console.log(`\n   📁 Procesando: ${tenantEmail} (${tenantId})`);

      let sqlContent = `-- Migración de datos para: ${tenantEmail}\n`;
      sqlContent += `-- Tenant ID: ${tenantId}\n`;
      sqlContent += `-- Fecha: ${new Date().toISOString()}\n\n`;

      // Generar INSERTs para cada colección
      for (const collection of COLLECTIONS) {
        if (collection === 'user_profiles') {
          // El user_profile del tenant
          sqlContent += `\n-- User Profile\n`;
          sqlContent += generateSQLInserts([userProfile], collection, tenantId) + '\n';
          continue;
        }

        const tenantDocuments = groupByTenant(allData[collection], collection)[tenantId] || [];

        if (tenantDocuments.length > 0) {
          sqlContent += `\n-- ${collection.toUpperCase()} (${tenantDocuments.length} registros)\n`;
          sqlContent += generateSQLInserts(tenantDocuments, collection, tenantId) + '\n';
        }
      }

      // Guardar archivo SQL
      const filename = `tenant_${tenantId}_migration.sql`;
      fs.writeFileSync(path.join(outputDir, filename), sqlContent);

      console.log(`      ✅ Generado: ${filename}`);
    }

    // Paso 4: Generar reporte
    console.log('\n📊 PASO 4: Generando reporte de migración');

    const report = {
      fecha: new Date().toISOString(),
      total_tenants: userProfiles.length,
      colecciones: {}
    };

    for (const collection of COLLECTIONS) {
      report.colecciones[collection] = allData[collection].length;
    }

    fs.writeFileSync(
      path.join(outputDir, 'migration-report.json'),
      JSON.stringify(report, null, 2)
    );

    console.log('\n✅ Migración completada!');
    console.log(`\n📂 Archivos generados en: ${outputDir}`);
    console.log('\n📋 Próximos pasos:');
    console.log('   1. Crear bases de datos D1 para cada tenant');
    console.log('   2. Aplicar schema.sql a cada DB');
    console.log('   3. Ejecutar tenant_*_migration.sql en cada DB correspondiente');
    console.log('\nEjemplo:');
    console.log('   wrangler d1 create store_TENANT_ID');
    console.log('   wrangler d1 execute store_TENANT_ID --file=schema.sql');
    console.log('   wrangler d1 execute store_TENANT_ID --file=tenant_TENANT_ID_migration.sql');

  } catch (error) {
    console.error('\n❌ Error durante la migración:', error);
    process.exit(1);
  }
}

// Ejecutar migración
migrate();
