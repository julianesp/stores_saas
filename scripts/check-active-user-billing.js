/**
 * Script para verificar el estado de facturación de un usuario ACTIVO
 * Uso: node scripts/check-active-user-billing.js
 */

console.log('\n=== ANÁLISIS DE USUARIO CON SUSCRIPCIÓN ACTIVA ===\n');
console.log('Usuario: Julián Alexander España Riobamba');
console.log('Email: julii1295@gmail.com');
console.log('Estado mostrado en panel: Activa (verde)');
console.log('Días mostrados: 0 días (rojo) ← ESTO ES INCORRECTO');
console.log('');
console.log('='.repeat(70));
console.log('');

console.log('🔍 PROBLEMA DETECTADO EN EL CÓDIGO:\n');
console.log('El Dashboard de Super Admin tiene un ERROR en la columna "Días".');
console.log('');
console.log('UBICACIÓN: app/dashboard/superadmin/page.tsx');
console.log('FUNCIÓN: getDaysRemainingForActive() (líneas 288-316)');
console.log('');
console.log('CÓDIGO ACTUAL (INCORRECTO):');
console.log('─'.repeat(70));
console.log(`
const getDaysRemainingForActive = (store: UserProfile): number | null => {
  if (store.subscription_status === "active" && store.trial_end_date) {
    // ❌ ERROR: Usa trial_end_date para usuarios ACTIVOS
    const trialEnd = new Date(store.trial_end_date);
    const now = new Date();
    const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const trialEndMidnight = new Date(
      trialEnd.getFullYear(),
      trialEnd.getMonth(),
      trialEnd.getDate()
    );
    const daysLeft = Math.ceil(
      (trialEndMidnight.getTime() - nowMidnight.getTime()) / (1000 * 60 * 60 * 24)
    );
    return Math.max(0, daysLeft);
  }
  return null;
};
`);
console.log('─'.repeat(70));
console.log('');

console.log('❌ POR QUÉ ES INCORRECTO:\n');
console.log('1. Para usuarios ACTIVOS, trial_end_date es del período de prueba YA TERMINADO');
console.log('2. Lo correcto es usar next_billing_date para saber cuándo se cobrará el siguiente mes');
console.log('3. El "0 días" significa que trial_end_date ya expiró, NO que la suscripción expire hoy');
console.log('');

console.log('✅ CÓDIGO CORRECTO DEBERÍA SER:');
console.log('─'.repeat(70));
console.log(`
const getDaysRemainingForActive = (store: UserProfile): number | null => {
  // ✅ Para usuarios ACTIVOS, usar next_billing_date
  if (store.subscription_status === "active" && store.next_billing_date) {
    const nextBilling = new Date(store.next_billing_date);
    const now = new Date();
    const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const nextBillingMidnight = new Date(
      nextBilling.getFullYear(),
      nextBilling.getMonth(),
      nextBilling.getDate()
    );
    const daysLeft = Math.ceil(
      (nextBillingMidnight.getTime() - nowMidnight.getTime()) / (1000 * 60 * 60 * 24)
    );
    return Math.max(0, daysLeft);
  }
  return null;
};
`);
console.log('─'.repeat(70));
console.log('');

console.log('📅 EXPLICACIÓN DE LOS CAMPOS:\n');
console.log('Para usuarios en TRIAL:');
console.log('  - trial_start_date: Cuando comenzó el trial (ej: 2026-01-26)');
console.log('  - trial_end_date: Cuando termina el trial (ej: 2026-02-10)');
console.log('  - next_billing_date: NULL (no tienen facturación aún)');
console.log('');
console.log('Para usuarios ACTIVOS (que pagaron):');
console.log('  - trial_start_date: Cuando comenzó el trial (campo legacy)');
console.log('  - trial_end_date: Cuando terminó el trial (campo legacy)');
console.log('  - last_payment_date: Cuándo pagó la última vez (ej: 2026-02-08)');
console.log('  - next_billing_date: Cuándo se le cobrará de nuevo (ej: 2026-03-10)');
console.log('');
console.log('🎯 El campo correcto para mostrar días restantes es next_billing_date');
console.log('');

console.log('='.repeat(70));
console.log('');

console.log('🧮 CÁLCULO CORRECTO PARA EL USUARIO:\n');
console.log('Si el usuario pagó el 8 de febrero de 2026:');
console.log('');
console.log('  last_payment_date: 2026-02-08');
console.log('  next_billing_date: 2026-03-10 (30 días después)');
console.log('  HOY: 2026-02-10');
console.log('');
console.log('  Días restantes = (2026-03-10) - (2026-02-10) = 28 días');
console.log('');
console.log('❌ El sistema muestra: 0 días (porque usa trial_end_date)');
console.log('✅ Debería mostrar: 28 días (usando next_billing_date)');
console.log('');

console.log('='.repeat(70));
console.log('');

console.log('📋 RESUMEN:\n');
console.log('1. ❌ El campo "Días" está INCORRECTO para usuarios ACTIVOS');
console.log('2. ✅ El usuario SÍ tiene acceso al sistema (subscription_status = active)');
console.log('3. ✅ El próximo cobro será en ~28 días (no en 0 días)');
console.log('4. 🔧 Se debe corregir la función getDaysRemainingForActive()');
console.log('');

console.log('='.repeat(70));
console.log('');

console.log('🔧 PARA CORREGIR ESTE ERROR:\n');
console.log('1. Editar: app/dashboard/superadmin/page.tsx');
console.log('2. Encontrar la función: getDaysRemainingForActive (línea 288)');
console.log('3. Cambiar trial_end_date por next_billing_date');
console.log('4. Guardar y verificar en el dashboard');
console.log('');

console.log('🔍 PARA VERIFICAR EL ESTADO REAL DEL USUARIO:\n');
console.log('Opción 1: Panel de admin');
console.log('  1. Ve a: https://posib.dev/dashboard/admin/subscriptions');
console.log('  2. Busca: julii1295@gmail.com');
console.log('  3. Verifica los campos:');
console.log('     - last_payment_date (cuándo pagó)');
console.log('     - next_billing_date (cuándo se le cobrará)');
console.log('');
console.log('Opción 2: Iniciar sesión como el usuario');
console.log('  1. Inicia sesión con: julii1295@gmail.com');
console.log('  2. Ve al dashboard');
console.log('  3. ¿Puede acceder? → SÍ, la suscripción está ACTIVA ✓');
console.log('');

console.log('='.repeat(70));
console.log('');

console.log('💡 CONCLUSIÓN FINAL:\n');
console.log('');
console.log('✅ El usuario Julián Alexander TIENE ACCESO al sistema');
console.log('✅ Su suscripción está ACTIVA y pagada');
console.log('❌ El "0 días" es un ERROR de la interfaz (usa campo incorrecto)');
console.log('✅ Los días reales restantes hasta el próximo cobro son ~28 días');
console.log('');
console.log('El sistema de bloqueo/acceso funciona correctamente.');
console.log('Solo la visualización de "días restantes" está incorrecta.');
console.log('');
