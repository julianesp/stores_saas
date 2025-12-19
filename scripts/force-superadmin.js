/**
 * Script para forzar la actualización de admin@neurai.dev a superadmin
 * Ejecutar con: node scripts/force-superadmin.js
 */

const https = require('https');

const API_URL = process.env.CLOUDFLARE_API_URL || 'https://tienda-pos-api.julii1295.workers.dev';
const ADMIN_EMAIL = 'admin@neurai.dev';

console.log('🔧 Script para actualizar admin@neurai.dev a superadmin');
console.log('📡 API URL:', API_URL);
console.log('');

// Este script asume que tienes acceso directo a la base de datos de Cloudflare
// O que puedes hacer una llamada autenticada a tu API

console.log('⚠️  INSTRUCCIONES:');
console.log('');
console.log('1. Abre tu navegador e inicia sesión como admin@neurai.dev');
console.log('2. Abre la consola del navegador (F12)');
console.log('3. Ejecuta el siguiente código:');
console.log('');
console.log('```javascript');
console.log('// Llamar al endpoint de auto-upgrade');
console.log('fetch("/api/admin/auto-upgrade", { method: "POST" })');
console.log('  .then(r => r.json())');
console.log('  .then(data => {');
console.log('    console.log("Resultado:", data);');
console.log('    if (data.upgraded || data.isSuperAdmin) {');
console.log('      console.log("✅ Actualización exitosa! Recarga la página.");');
console.log('      window.location.reload();');
console.log('    }');
console.log('  })');
console.log('  .catch(err => console.error("Error:", err));');
console.log('```');
console.log('');
console.log('4. O más simple, visita: http://localhost:3000/admin-upgrade');
console.log('');
console.log('Si necesitas actualizar directamente en la base de datos de Cloudflare D1:');
console.log('');
console.log('```bash');
console.log('wrangler d1 execute tienda-pos-shared --remote \\');
console.log('  --command="UPDATE user_profiles SET is_superadmin = 1, subscription_status = \'active\' WHERE email = \'admin@neurai.dev\'"');
console.log('```');
console.log('');
