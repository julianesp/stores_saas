#!/usr/bin/env node

/**
 * Script para extender el período de prueba de un usuario
 * Uso: node scripts/extend-trial.js
 */

const { execSync } = require('child_process');

console.log('🔧 Estableciendo período de prueba a 15 días...\n');

try {
  // Establecer trial a 15 días para TODOS los usuarios (nuevos y existentes)
  // Usamos 'start of day' para normalizar a medianoche y luego agregamos 15 días
  const sql = `
    UPDATE user_profiles
    SET
      subscription_status = 'trial',
      trial_end_date = datetime('now', 'start of day', '+15 days'),
      trial_start_date = COALESCE(trial_start_date, datetime('now', 'start of day'))
    WHERE subscription_status IN ('trial', 'expired', 'active');
  `;

  console.log('📝 Ejecutando actualización en Cloudflare D1...');
  console.log('⚠️  Esto establecerá el trial a 15 días para TODOS los usuarios\n');

  const command = `wrangler d1 execute tienda-pos-shared --remote --command="${sql.replace(/\n/g, ' ').replace(/"/g, '\\"')}"`;

  const output = execSync(command, {
    encoding: 'utf-8',
    stdio: 'inherit'
  });

  console.log('\n✅ Trial establecido exitosamente a 15 días para todos los usuarios');
  console.log('🔄 Recarga la página en tu navegador para ver los cambios\n');

} catch (error) {
  console.error('\n❌ Error al establecer el trial:', error.message);
  console.log('\n💡 Solución alternativa:');
  console.log('Ejecuta manualmente este comando:\n');
  console.log(`wrangler d1 execute tienda-pos-shared --remote --command="UPDATE user_profiles SET subscription_status = 'trial', trial_end_date = datetime('now', 'start of day', '+15 days'), trial_start_date = COALESCE(trial_start_date, datetime('now', 'start of day')) WHERE subscription_status IN ('trial', 'expired', 'active');"`);
  process.exit(1);
}
