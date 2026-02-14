// Test script para verificar el endpoint de team members
const CLOUDFLARE_API = process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL || 'https://tienda-pos-api.julii1295.workers.dev';

async function testEndpoint() {
  console.log('🔍 Probando endpoint:', `${CLOUDFLARE_API}/api/team-members/me`);
  console.log('🔑 Este endpoint requiere autenticación con token de Clerk');
  console.log('');
  console.log('⚠️  Para probar manualmente:');
  console.log('1. Abre la consola del navegador en localhost:3000');
  console.log('2. Ejecuta este comando:');
  console.log('');
  console.log(`
fetch('/api/team/me')
  .then(r => r.json())
  .then(data => console.log('Respuesta:', data))
  .catch(err => console.error('Error:', err));
  `);
}

testEndpoint();
