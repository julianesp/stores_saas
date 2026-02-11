/**
 * Script para activar un addon manualmente basándose en un ID de transacción de Wompi
 * Uso: node scripts/activate-addon-from-transaction.js <TRANSACTION_ID>
 *
 * Ejemplo: node scripts/activate-addon-from-transaction.js 1312687-177074158-86656
 */

const transactionId = process.argv[2];

if (!transactionId) {
  console.error('❌ Error: Debes proporcionar un ID de transacción');
  console.log('');
  console.log('Uso: node scripts/activate-addon-from-transaction.js <TRANSACTION_ID>');
  console.log('Ejemplo: node scripts/activate-addon-from-transaction.js 1312687-177074158-86656');
  console.log('');
  process.exit(1);
}

console.log('\n=== ACTIVACIÓN MANUAL DE ADDON ===\n');
console.log(`Transaction ID: ${transactionId}`);
console.log('');
console.log('⚠️  IMPORTANTE: Este script requiere que estés autenticado en el navegador');
console.log('');
console.log('PASOS A SEGUIR:');
console.log('');
console.log('1. Abre tu navegador e inicia sesión en: http://localhost:3000');
console.log('2. Abre la consola del navegador (F12)');
console.log('3. Copia y pega el siguiente código:');
console.log('');
console.log('─'.repeat(70));
console.log(`
fetch('/api/admin/activate-addon-manually', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    transactionId: '${transactionId}'
  })
})
.then(response => response.json())
.then(data => {
  console.log('');
  console.log('═════════════════════════════════════════════════════');
  if (data.success) {
    console.log('✅ ADDON ACTIVADO CORRECTAMENTE');
    console.log('═════════════════════════════════════════════════════');
    console.log('');
    console.log('📧 Usuario:', data.data.userEmail);
    console.log('🎁 Addon:', data.data.addonType);
    console.log('💰 Monto:', data.data.amount, 'COP');
    console.log('📅 Expira:', new Date(data.data.expiresAt).toLocaleDateString('es-CO'));
    console.log('🔖 Transaction ID:', data.data.transactionId);
    console.log('');
    console.log('🔄 Actualizaciones aplicadas:');
    console.log(JSON.stringify(data.data.updates, null, 2));
    console.log('');
    console.log('✓ Recarga la página para ver los cambios');
  } else {
    console.log('❌ ERROR AL ACTIVAR ADDON');
    console.log('═════════════════════════════════════════════════════');
    console.log('');
    console.log('Error:', data.error);
  }
  console.log('═════════════════════════════════════════════════════');
  console.log('');
})
.catch(error => {
  console.error('❌ Error de red:', error);
});
`);
console.log('─'.repeat(70));
console.log('');
console.log('4. Presiona Enter');
console.log('5. Espera el resultado');
console.log('6. Recarga la página para ver el addon activado');
console.log('');
