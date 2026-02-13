/**
 * Script para forzar la actualización del perfil admin a superadmin
 */

const API_BASE_URL = 'https://tienda-pos-api.julii1295.workers.dev';
const ADMIN_EMAIL = 'admin@neurai.dev';

async function forceAdminUpgrade() {
  try {
    console.log('🔍 Buscando perfil de admin...');

    // Primero, obtener todos los perfiles para encontrar el admin
    const response = await fetch(`${API_BASE_URL}/api/user-profiles/all`);

    if (!response.ok) {
      throw new Error(`Error al obtener perfiles: ${response.status}`);
    }

    const profiles = await response.json();
    console.log(`📊 Total de perfiles encontrados: ${profiles.length}`);

    // Buscar el perfil del admin
    const adminProfile = profiles.find(p => p.email === ADMIN_EMAIL);

    if (!adminProfile) {
      console.error('❌ No se encontró el perfil del admin');
      console.log('Emails encontrados:', profiles.map(p => p.email));
      return;
    }

    console.log('✅ Perfil de admin encontrado:', {
      id: adminProfile.id,
      email: adminProfile.email,
      is_superadmin: adminProfile.is_superadmin,
      subscription_status: adminProfile.subscription_status,
      trial_end_date: adminProfile.trial_end_date,
    });

    // Actualizar el perfil
    console.log('\n🔄 Actualizando perfil a superadmin...');

    const updateResponse = await fetch(
      `${API_BASE_URL}/api/user-profiles/${adminProfile.id}`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          is_superadmin: true,
          subscription_status: 'active',
          trial_start_date: null,
          trial_end_date: null,
        }),
      }
    );

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Error al actualizar perfil: ${updateResponse.status} - ${errorText}`);
    }

    const updatedProfile = await updateResponse.json();

    console.log('✅ Perfil actualizado exitosamente:', {
      id: updatedProfile.id,
      email: updatedProfile.email,
      is_superadmin: updatedProfile.is_superadmin,
      subscription_status: updatedProfile.subscription_status,
      trial_end_date: updatedProfile.trial_end_date,
    });

    console.log('\n✨ ¡Admin actualizado correctamente!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

forceAdminUpgrade();
