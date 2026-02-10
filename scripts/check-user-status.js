/**
 * Script para verificar el estado de un usuario específico
 * Uso: node scripts/check-user-status.js <email>
 */

const email = process.argv[2] || 'sairaruano24@gmail.com';

console.log('\n=== VERIFICACIÓN DE ESTADO DE USUARIO ===\n');
console.log(`Email a verificar: ${email}`);
console.log(`Fecha actual: ${new Date().toISOString()}`);
console.log('\n');

// URL de la API
const API_URL = process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL || 'https://tienda-pos-api.julii1295.workers.dev';

async function checkUserStatus() {
  try {
    // Necesitamos obtener el token de autenticación
    // Este script debe ejecutarse después de autenticarse manualmente
    // o podemos hacer una consulta directa a la base de datos

    console.log('⚠️  NOTA: Este script requiere acceso a la API de Cloudflare Workers');
    console.log('Para verificar el estado del usuario, necesitas:');
    console.log('');
    console.log('1. Iniciar sesión en el panel de admin: https://posib.dev/dashboard/admin/users');
    console.log('2. Buscar el usuario: ' + email);
    console.log('3. Verificar los siguientes campos:');
    console.log('   - subscription_status: ¿Es "trial", "active", "expired" o "canceled"?');
    console.log('   - trial_end_date: ¿Cuál es la fecha de fin del trial?');
    console.log('   - trial_start_date: ¿Cuándo comenzó el trial?');
    console.log('');
    console.log('ANÁLISIS AUTOMÁTICO:');
    console.log('');

    // Simular el cálculo que hace el sistema
    const now = new Date();
    const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    console.log('Fecha actual (medianoche): ' + nowMidnight.toISOString());
    console.log('');
    console.log('REGLAS DE BLOQUEO:');
    console.log('');
    console.log('✅ Usuario CON acceso si:');
    console.log('   - subscription_status === "active"');
    console.log('   - subscription_status === "trial" Y trial_end_date >= HOY (a medianoche)');
    console.log('   - is_superadmin === true');
    console.log('');
    console.log('❌ Usuario SIN acceso si:');
    console.log('   - subscription_status === "expired"');
    console.log('   - subscription_status === "canceled"');
    console.log('   - subscription_status === "trial" Y trial_end_date < HOY (a medianoche)');
    console.log('');
    console.log('CASO ESPECÍFICO: Usuario con "0 días"');
    console.log('');
    console.log('Si el panel muestra "0 días", esto significa:');
    console.log('');
    console.log('Opción A: trial_end_date = HOY → Usuario AÚN tiene acceso');
    console.log('  - La comparación es: nowMidnight (HOY 00:00) > trialEndMidnight (HOY 00:00)');
    console.log('  - Resultado: FALSE (son iguales, no es mayor)');
    console.log('  - El usuario puede entrar hasta las 23:59:59 de HOY');
    console.log('');
    console.log('Opción B: trial_end_date = AYER → Usuario YA NO tiene acceso');
    console.log('  - La comparación es: nowMidnight (HOY 00:00) > trialEndMidnight (AYER 00:00)');
    console.log('  - Resultado: TRUE (HOY es mayor que AYER)');
    console.log('  - El usuario está BLOQUEADO desde medianoche de HOY');
    console.log('  - subscription_status cambia automáticamente a "expired"');
    console.log('');
    console.log('='.repeat(70));
    console.log('');
    console.log('PARA VERIFICAR EL ESTADO REAL:');
    console.log('');
    console.log('Opción 1 (Recomendada): Desde el panel de admin');
    console.log('  1. Ve a: https://posib.dev/dashboard/admin/users');
    console.log('  2. Busca: ' + email);
    console.log('  3. Verifica el campo "trial_end_date"');
    console.log('  4. Compara con la fecha de HOY: ' + nowMidnight.toISOString().split('T')[0]);
    console.log('');
    console.log('Opción 2: Intenta iniciar sesión con la cuenta del usuario');
    console.log('  - Si ve el modal "Tu suscripción ha expirado" → Usuario BLOQUEADO ✓');
    console.log('  - Si puede acceder al dashboard → Usuario ACTIVO');
    console.log('');
    console.log('Opción 3: Usa el endpoint de debug (requiere autenticación)');
    console.log('  - Inicia sesión como el usuario');
    console.log('  - Accede a: https://posib.dev/api/subscription/debug-status');
    console.log('  - Revisa el campo "canAccess" en la respuesta');
    console.log('');
    console.log('='.repeat(70));
    console.log('');
    console.log('CÓMO EXTENDER EL TRIAL (si es necesario):');
    console.log('');
    console.log('Si el usuario necesita más tiempo de prueba:');
    console.log('  1. Ve al panel de admin de suscripciones');
    console.log('  2. Busca el usuario por email');
    console.log('  3. Usa el botón "Extender Trial" para agregar días');
    console.log('');
    console.log('O usa el script:');
    console.log('  node scripts/extend-trial.js ' + email + ' 15  # Agregar 15 días');
    console.log('');

  } catch (error) {
    console.error('Error:', error);
  }
}

checkUserStatus();
