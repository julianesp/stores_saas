const admin = require('firebase-admin');
const serviceAccount = require('../serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function checkStructure() {
  console.log('🔍 Verificando estructura de productos en Firestore\n');
  
  // Get 3 products to see their structure
  const productsSnapshot = await db.collection('products').limit(3).get();
  
  console.log(`Encontrados ${productsSnapshot.size} productos de muestra:\n`);
  
  productsSnapshot.forEach(doc => {
    console.log(`ID: ${doc.id}`);
    console.log('Datos:', JSON.stringify(doc.data(), null, 2));
    console.log('---\n');
  });
  
  // Check customers
  const customersSnapshot = await db.collection('customers').limit(2).get();
  console.log(`\nEncontrados ${customersSnapshot.size} clientes de muestra:\n`);
  
  customersSnapshot.forEach(doc => {
    console.log(`ID: ${doc.id}`);
    console.log('Datos:', JSON.stringify(doc.data(), null, 2));
    console.log('---\n');
  });
  
  process.exit(0);
}

checkStructure();
