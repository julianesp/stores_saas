const { neon } = require('@neondatabase/serverless');

async function extendTrial() {
  const sql = neon(process.env.DATABASE_URL);

  try {
    // Extender trial por 30 días más
    const newTrialEnd = new Date();
    newTrialEnd.setDate(newTrialEnd.getDate() + 30);

    const result = await sql`
      UPDATE user_profiles
      SET trial_end_date = ${newTrialEnd.toISOString()},
          subscription_status = 'trial',
          updated_at = NOW()
      WHERE email = 'admin@neurai.dev'
      RETURNING id, email, trial_end_date, subscription_status
    `;

    console.log('✅ Trial extendido exitosamente:');
    console.log(result);
    console.log('\n📅 Nueva fecha de expiración:', newTrialEnd.toLocaleDateString('es-CO'));
  } catch (error) {
    console.error('❌ Error extendiendo trial:', error);
  }
}

extendTrial();
