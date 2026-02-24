/**
 * Script para activar TODOS los complementos permanentemente para la cuenta de demo
 *
 * Este script activa:
 * - IA (Análisis con IA)
 * - Tienda Online
 * - Email Marketing
 *
 * Para el email: julii1295@gmail.com (cuenta de demostración)
 *
 * Uso: node scripts/activate-demo-account.js
 */

const DEMO_EMAIL = 'julii1295@gmail.com';

async function activateDemoAccount() {
  try {
    console.log('\n🚀 Activando cuenta de demostración...\n');
    console.log(`📧 Email: ${DEMO_EMAIL}`);
    console.log('🎯 Activando TODOS los complementos permanentemente\n');

    // Importar las funciones necesarias
    const { updateUserProfile, getAllUserProfiles } = require('../lib/cloudflare-api');

    // Crear una función getToken mock para usar las funciones
    // En este caso, necesitaremos usar el API directamente
    const CLOUDFLARE_API_URL = process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL;
    const API_KEY = process.env.CLOUDFLARE_API_KEY;

    if (!CLOUDFLARE_API_URL || !API_KEY) {
      console.error('❌ Error: Variables de entorno no configuradas');
      console.error('   Asegúrate de tener NEXT_PUBLIC_CLOUDFLARE_API_URL y CLOUDFLARE_API_KEY');
      process.exit(1);
    }

    // Obtener el perfil del usuario
    console.log('🔍 Buscando perfil del usuario...');
    const response = await fetch(`${CLOUDFLARE_API_URL}/api/user-profiles`, {
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      }
    });

    if (!response.ok) {
      throw new Error(`Error al obtener perfiles: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const users = data.data || [];
    const user = users.find(u => u.email === DEMO_EMAIL);

    if (!user) {
      console.error(`❌ No se encontró usuario con email: ${DEMO_EMAIL}`);
      console.log('\n💡 Asegúrate de que el usuario existe en la base de datos');
      process.exit(1);
    }

    console.log('✅ Usuario encontrado');
    console.log(`   ID: ${user.id}`);
    console.log(`   Nombre: ${user.full_name}`);
    console.log(`   Estado actual: ${user.subscription_status}\n`);

    // Configurar fecha de expiración muy lejana (10 años en el futuro)
    const farFutureDate = new Date();
    farFutureDate.setFullYear(farFutureDate.getFullYear() + 10);
    const expiresAt = farFutureDate.toISOString();

    // Preparar la actualización
    const updates = {
      subscription_status: 'active',
      has_ai_addon: true,
      has_store_addon: true,
      has_email_addon: true,
      ai_addon_expires_at: expiresAt,
      store_addon_expires_at: expiresAt,
      email_addon_expires_at: expiresAt,
      next_billing_date: expiresAt,
    };

    console.log('📝 Actualizando perfil con:');
    console.log('   ✅ Estado: active (permanente)');
    console.log('   ✅ IA: Activado hasta', farFutureDate.toLocaleDateString('es-CO'));
    console.log('   ✅ Tienda Online: Activado hasta', farFutureDate.toLocaleDateString('es-CO'));
    console.log('   ✅ Email Marketing: Activado hasta', farFutureDate.toLocaleDateString('es-CO'));
    console.log('');

    // Actualizar el perfil
    const updateResponse = await fetch(`${CLOUDFLARE_API_URL}/api/user-profiles/${user.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': API_KEY,
      },
      body: JSON.stringify(updates)
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Error al actualizar perfil: ${updateResponse.status} - ${errorText}`);
    }

    const updatedUser = await updateResponse.json();

    console.log('✅ ¡Perfil actualizado exitosamente!\n');
    console.log('🎉 La cuenta de demostración está lista:\n');
    console.log('   📧 Email:', DEMO_EMAIL);
    console.log('   🤖 Análisis IA: ✅ ACTIVO (permanente)');
    console.log('   🏪 Tienda Online: ✅ ACTIVO (permanente)');
    console.log('   📧 Email Marketing: ✅ ACTIVO (permanente)');
    console.log('');
    console.log('💡 Esta cuenta ahora tiene acceso completo a TODOS los complementos');
    console.log('   para demostrar el sistema a tus leads.\n');
    console.log('='.repeat(70));
    console.log('');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('');
    if (error.stack) {
      console.error('Stack trace:', error.stack);
    }
    process.exit(1);
  }
}

// Ejecutar el script
activateDemoAccount();
