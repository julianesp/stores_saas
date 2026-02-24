/**
 * Script para verificar y actualizar addons de un usuario
 *
 * Uso:
 * node scripts/check-user-addons.js [email_del_usuario]
 */

const email = process.argv[2];

if (!email) {
  console.error('❌ Debes proporcionar un email de usuario');
  console.log('Uso: node scripts/check-user-addons.js usuario@example.com');
  process.exit(1);
}

const CLOUDFLARE_API_URL = process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL;

if (!CLOUDFLARE_API_URL) {
  console.error('❌ NEXT_PUBLIC_CLOUDFLARE_API_URL no está configurada');
  process.exit(1);
}

async function checkUserAddons() {
  try {
    console.log(`\n🔍 Buscando usuario: ${email}...\n`);

    // Obtener todos los perfiles (necesitarás autenticación adecuada)
    const response = await fetch(`${CLOUDFLARE_API_URL}/api/user-profiles`, {
      headers: {
        'Content-Type': 'application/json',
        // Aquí necesitarás agregar el token de autenticación
      }
    });

    if (!response.ok) {
      throw new Error(`Error al obtener perfiles: ${response.status}`);
    }

    const data = await response.json();
    const users = data.data || [];

    const user = users.find(u => u.email === email);

    if (!user) {
      console.error(`❌ No se encontró usuario con email: ${email}`);
      return;
    }

    console.log('✅ Usuario encontrado:\n');
    console.log('📧 Email:', user.email);
    console.log('👤 Nombre:', user.full_name);
    console.log('🆔 ID:', user.id);
    console.log('📊 Estado de suscripción:', user.subscription_status);
    console.log('\n🎯 Addons activos:');
    console.log('  🤖 IA:', user.has_ai_addon ? '✅ Activo' : '❌ Inactivo');
    console.log('  🏪 Tienda:', user.has_store_addon ? '✅ Activo' : '❌ Inactivo');
    console.log('  📧 Email Marketing:', user.has_email_addon ? '✅ Activo' : '❌ Inactivo');

    if (user.subscription_status === 'trial') {
      console.log('\n💡 El usuario está en período de prueba.');
      console.log('   Durante el trial, tiene acceso a todos los addons automáticamente.');
      if (user.trial_end_date) {
        const trialEnd = new Date(user.trial_end_date);
        const now = new Date();
        const daysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
        console.log(`   ⏰ Días restantes: ${daysLeft}`);
      }
    } else if (user.subscription_status === 'active') {
      console.log('\n💡 El usuario tiene suscripción activa.');
      console.log('   Para ver los addons en el menú, deben estar activados en el perfil.');

      if (!user.has_store_addon || !user.has_email_addon) {
        console.log('\n⚠️  PROBLEMA DETECTADO:');
        console.log('   Los addons de Tienda y/o Email Marketing no están activados.');
        console.log('\n📝 Para activarlos, puedes:');
        console.log('   1. Actualizar manualmente en la base de datos');
        console.log('   2. Usar el panel de admin para activar planes');
        console.log('   3. Procesar un pago de addon');
      }
    }

    console.log('\n' + '='.repeat(60) + '\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

checkUserAddons();
