const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Inicializar Firebase Admin
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Tu tenant ID principal
const MAIN_TENANT_ID = 'dV5Ns1etmXSSteV83kua';

// Colecciones a migrar (sin user_profile_id)
const COLLECTIONS_TO_MIGRATE = [
  'products',
  'customers',
  'categories',
  'sale_items',
  'inventory_movements',
  'offers'
];

// Tablas que NO tienen updated_at
const TABLES_WITHOUT_UPDATED_AT = ['sale_items', 'inventory_movements'];

/**
 * Convertir valor de Firestore a SQL
 */
function valueToSQL(value) {
  if (value === null || value === undefined) {
    return 'NULL';
  }

  // Timestamp de Firestore
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
}

/**
 * Generar SQL INSERTs
 */
function generateInserts(documents, tableName, tenantId) {
  if (documents.length === 0) {
    return '';
  }

  const inserts = [];

  for (const doc of documents) {
    // Agregar tenant_id
    doc.tenant_id = tenantId;

    // Agregar timestamps si no existen
    if (!doc.created_at) {
      doc.created_at = new Date().toISOString();
    }

    // Manejar updated_at
    if (TABLES_WITHOUT_UPDATED_AT.includes(tableName)) {
      // Eliminar updated_at si la tabla no lo tiene
      delete doc.updated_at;
    } else if (!doc.updated_at) {
      // Agregar updated_at si la tabla lo tiene y no existe
      doc.updated_at = new Date().toISOString();
    }

    const columns = Object.keys(doc);
    const values = columns.map(col => valueToSQL(doc[col]));

    inserts.push(
      `INSERT OR IGNORE INTO ${tableName} (${columns.join(', ')}) VALUES (${values.join(', ')});`
    );
  }

  return inserts.join('\n');
}

/**
 * Main
 */
async function migrate() {
  console.log('🚀 Migrando datos restantes a Cloudflare D1\n');
  console.log('================================================\n');

  try {
    let fullSQL = `-- Migración de datos restantes\n`;
    fullSQL += `-- Tenant: ${MAIN_TENANT_ID} (julii1295@gmail.com)\n`;
    fullSQL += `-- Fecha: ${new Date().toISOString()}\n\n`;
    fullSQL += `PRAGMA foreign_keys = OFF;\n\n`;

    for (const collection of COLLECTIONS_TO_MIGRATE) {
      console.log(`📦 Exportando ${collection}...`);

      const snapshot = await db.collection(collection).get();
      const documents = [];

      snapshot.forEach(doc => {
        documents.push({
          id: doc.id,
          ...doc.data()
        });
      });

      console.log(`   ✅ ${documents.length} documentos exportados`);

      if (documents.length > 0) {
        fullSQL += `\n-- ${collection.toUpperCase()} (${documents.length} registros)\n`;
        fullSQL += generateInserts(documents, collection, MAIN_TENANT_ID) + '\n';
      }
    }

    fullSQL += `\nPRAGMA foreign_keys = ON;\n`;

    // Guardar archivo
    const outputDir = path.join(__dirname, '../migration-output');
    const filename = 'remaining-data.sql';
    const filepath = path.join(outputDir, filename);

    fs.writeFileSync(filepath, fullSQL);

    console.log('\n✅ Migración completada!');
    console.log(`📂 Archivo generado: ${filename}\n`);

    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

migrate();
