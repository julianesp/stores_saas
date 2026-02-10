/**
 * Script para corregir las fechas de pago de un usuario basándose en transacciones reales
 * Uso: node scripts/fix-user-payment-dates.js <email>
 */

const email = process.argv[2] || 'julii1295@gmail.com';

console.log('\n=== CORRECCIÓN DE FECHAS DE PAGO ===\n');
console.log(`Email: ${email}`);
console.log('');
console.log('Este script va a:');
console.log('1. Buscar al usuario en la base de datos');
console.log('2. Obtener todas sus transacciones de pago aprobadas por Wompi');
console.log('3. Identificar la fecha del último pago REAL');
console.log('4. Actualizar last_payment_date y next_billing_date correctamente');
console.log('');
console.log('='.repeat(70));
console.log('');

async function fixPaymentDates() {
  try {
    console.log('🔍 Consultando endpoint de corrección...\n');

    const response = await fetch('http://localhost:3000/api/admin/fix-payment-dates', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('❌ Error al corregir fechas:\n');
      console.error('Status:', response.status);
      console.error('Error:', data.error);

      if (data.info) {
        console.log('\n⚠️  Información adicional:');
        console.log(data.info);
      }

      if (data.error && data.error.includes('no tiene transacciones aprobadas')) {
        console.log('\n📋 SOLUCIÓN:');
        console.log('');
        console.log('Este usuario pagó ANTES de que se implementara el sistema de');
        console.log('payment_transactions. Para corregir manualmente:');
        console.log('');
        console.log('1. Ve al panel de admin de suscripciones');
        console.log('2. Busca al usuario por email');
        console.log('3. Verifica cuándo realmente pagó (revisa Wompi o tu sistema de facturación)');
        console.log('4. Usa el botón "Activar" para establecer la fecha correcta');
        console.log('');
      }

      process.exit(1);
    }

    console.log('✅ Fechas corregidas exitosamente!\n');
    console.log('='.repeat(70));
    console.log('');
    console.log('📊 RESULTADOS:\n');
    console.log(`Usuario: ${data.data.email}`);
    console.log(`User Profile ID: ${data.data.userProfileId}`);
    console.log('');
    console.log('📅 ÚLTIMO PAGO REGISTRADO:');
    console.log(`  Fecha: ${new Date(data.data.lastPayment.date).toLocaleString('es-CO')}`);
    console.log(`  Transaction ID: ${data.data.lastPayment.transactionId}`);
    console.log(`  Monto: $${data.data.lastPayment.amount.toLocaleString('es-CO')} ${data.data.lastPayment.currency}`);
    console.log('');
    console.log('🔄 FECHAS ACTUALIZADAS:');
    console.log(`  Último pago: ${new Date(data.data.updated.last_payment_date).toLocaleString('es-CO')}`);
    console.log(`  Próximo cobro: ${new Date(data.data.updated.next_billing_date).toLocaleString('es-CO')}`);
    console.log(`  Estado: ${data.data.updated.subscription_status}`);
    console.log('');
    console.log('📈 ESTADÍSTICAS:');
    console.log(`  Total de transacciones: ${data.data.allTransactions}`);
    console.log(`  Pagos aprobados: ${data.data.totalApprovedPayments}`);
    console.log('');
    console.log('='.repeat(70));
    console.log('');
    console.log('✅ El próximo cobro será automático en la fecha indicada.');
    console.log('');

  } catch (error) {
    console.error('❌ Error inesperado:', error.message);
    console.error('');
    console.error('⚠️  Asegúrate de que:');
    console.error('1. El servidor esté corriendo (npm run dev)');
    console.error('2. Estés autenticado como super admin');
    console.error('3. La base de datos esté accesible');
    console.error('');
    process.exit(1);
  }
}

console.log('⏳ Iniciando corrección...\n');
fixPaymentDates();
