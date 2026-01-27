/**
 * Script para limpiar cuentas duplicadas por email
 * Este script:
 * 1. Encuentra cuentas con emails duplicados
 * 2. Identifica cuál es la cuenta activa/principal
 * 3. Consolida datos si es necesario
 * 4. Elimina las cuentas duplicadas
 */

async function main() {
  console.log('🔍 Buscando cuentas duplicadas...\n');

  // Simulamos la conexión (deberás ejecutar esto con wrangler)
  // Este script se debe ejecutar con: wrangler d1 execute tienda-pos-shared --file=scripts/fix-duplicate-emails.sql

  const queries = [];

  // Query para encontrar emails duplicados
  console.log('📊 Generando SQL para encontrar duplicados...\n');

  queries.push(`
-- ==========================================
-- PASO 1: Identificar emails duplicados
-- ==========================================
SELECT
  email,
  COUNT(*) as count,
  GROUP_CONCAT(id) as profile_ids,
  GROUP_CONCAT(clerk_user_id) as clerk_ids,
  GROUP_CONCAT(subscription_status) as statuses,
  GROUP_CONCAT(created_at) as creation_dates
FROM user_profiles
WHERE email NOT LIKE '%placeholder.com%'
GROUP BY email
HAVING COUNT(*) > 1
ORDER BY count DESC;
  `.trim());

  // Guardar en archivo SQL para ejecución manual
  const fs = require('fs');
  const path = require('path');

  const sqlContent = `
-- ==========================================
-- Script para identificar y limpiar emails duplicados
-- Ejecutar con: wrangler d1 execute tienda-pos-shared --file=scripts/find-duplicates.sql
-- ==========================================

-- PASO 1: Ver todos los duplicados
SELECT
  email,
  COUNT(*) as count,
  GROUP_CONCAT(id || ' (' || subscription_status || ')') as profiles
FROM user_profiles
WHERE email NOT LIKE '%placeholder.com%'
GROUP BY email
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- PASO 2: Ver detalles completos de cada cuenta duplicada
-- (Reemplaza 'EMAIL_DUPLICADO' con el email que quieres analizar)
SELECT
  id,
  clerk_user_id,
  email,
  full_name,
  subscription_status,
  created_at,
  trial_start_date,
  trial_end_date,
  is_superadmin,
  (SELECT COUNT(*) FROM products WHERE tenant_id = user_profiles.id) as productos,
  (SELECT COUNT(*) FROM sales WHERE tenant_id = user_profiles.id) as ventas,
  (SELECT COUNT(*) FROM customers WHERE tenant_id = user_profiles.id) as clientes
FROM user_profiles
WHERE email = 'EMAIL_DUPLICADO'
ORDER BY created_at ASC;

-- ==========================================
-- INSTRUCCIONES PARA LIMPIAR MANUALMENTE:
-- ==========================================
-- 1. Ejecuta el query de arriba con el email duplicado
-- 2. Identifica cuál cuenta tiene datos (productos, ventas, clientes > 0)
-- 3. Si una cuenta tiene datos y otra no:
--    - Elimina la que NO tiene datos
-- 4. Si ambas tienen datos:
--    - Necesitas decidir cuál mantener (la más antigua, la activa, etc.)
--    - OPCIONAL: Migrar datos de una a otra antes de eliminar
-- 5. Usa el siguiente comando para eliminar la cuenta vacía:

-- DELETE FROM user_profiles WHERE id = 'ID_A_ELIMINAR';

-- EJEMPLO: Limpiar cuenta específica de julii1295@gmail.com
-- Primero, ver cuál tiene datos:
SELECT
  id,
  clerk_user_id,
  email,
  full_name,
  subscription_status,
  created_at,
  (SELECT COUNT(*) FROM products WHERE tenant_id = user_profiles.id) as productos,
  (SELECT COUNT(*) FROM sales WHERE tenant_id = user_profiles.id) as ventas,
  (SELECT COUNT(*) FROM customers WHERE tenant_id = user_profiles.id) as clientes,
  (SELECT COUNT(*) FROM categories WHERE tenant_id = user_profiles.id) as categorias,
  (SELECT COUNT(*) FROM suppliers WHERE tenant_id = user_profiles.id) as proveedores
FROM user_profiles
WHERE email = 'julii1295@gmail.com'
ORDER BY created_at ASC;

-- Luego, eliminar las cuentas que NO tienen datos (productos=0, ventas=0, etc.)
-- DELETE FROM user_profiles WHERE id = 'ID_SIN_DATOS';
`;

  const sqlPath = path.join(__dirname, 'find-duplicates.sql');
  fs.writeFileSync(sqlPath, sqlContent);

  console.log(`✅ Script SQL generado en: ${sqlPath}\n`);
  console.log('📝 Para ejecutar:');
  console.log('   wrangler d1 execute tienda-pos-shared --file=scripts/find-duplicates.sql\n');
  console.log('⚠️  IMPORTANTE: Revisa los resultados antes de eliminar cualquier cuenta!\n');

  // También generar un script para el caso específico de julii1295@gmail.com
  const cleanupSpecific = `
-- ==========================================
-- Limpieza específica para julii1295@gmail.com
-- ==========================================

-- Primero, verificar cuál cuenta tiene datos
SELECT
  id,
  clerk_user_id,
  email,
  subscription_status,
  created_at,
  (SELECT COUNT(*) FROM products WHERE tenant_id = user_profiles.id) as productos,
  (SELECT COUNT(*) FROM sales WHERE tenant_id = user_profiles.id) as ventas,
  (SELECT COUNT(*) FROM customers WHERE tenant_id = user_profiles.id) as clientes
FROM user_profiles
WHERE email = 'julii1295@gmail.com'
ORDER BY created_at ASC;

-- Las cuentas SIN datos pueden ser eliminadas de forma segura
-- Descomenta la línea de abajo reemplazando ID_SIN_DATOS con el ID correcto:
-- DELETE FROM user_profiles WHERE id = 'ID_SIN_DATOS' AND email = 'julii1295@gmail.com';

-- NOTA: Solo elimina las cuentas que tengan:
-- productos = 0, ventas = 0, clientes = 0
`;

  const cleanupPath = path.join(__dirname, 'cleanup-julii1295.sql');
  fs.writeFileSync(cleanupPath, cleanupSpecific);

  console.log(`✅ Script de limpieza específico generado en: ${cleanupPath}\n`);
}

main().catch(console.error);
