#!/usr/bin/env node

/**
 * Script para extender el período de prueba de un usuario
 * Uso: node scripts/extend-trial.js
 */

const { execSync } = require('child_process');

console.log('🔧 Extendiendo período de prueba...\n');

try {
  // Extender trial por 365 días más desde ahora
  const sql = `
    UPDATE user_profiles
    SET
      subscription_status = 'trial',
      trial_end_date = datetime('now', '+365 days'),
      trial_start_date = COALESCE(trial_start_date, datetime('now'))
    WHERE subscription_status IN ('trial', 'expired');
  `;

  console.log('📝 Ejecutando actualización en Cloudflare D1...');

  const command = `wrangler d1 execute tienda-pos-shared --remote --command="${sql.replace(/\n/g, ' ').replace(/"/g, '\\"')}"`;

  const output = execSync(command, {
    encoding: 'utf-8',
    stdio: 'inherit'
  });

  console.log('\n✅ Trial extendido exitosamente por 365 días');
  console.log('🔄 Recarga la página en tu navegador para ver los cambios\n');

} catch (error) {
  console.error('\n❌ Error al extender el trial:', error.message);
  console.log('\n💡 Solución alternativa:');
  console.log('Ejecuta manualmente este comando:\n');
  console.log(`wrangler d1 execute tienda-pos-shared --remote --command="UPDATE user_profiles SET subscription_status = 'trial', trial_end_date = datetime('now', '+365 days') WHERE subscription_status IN ('trial', 'expired');"`);
  process.exit(1);
}
