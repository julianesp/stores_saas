#!/bin/bash

# Script para subir variables de entorno a Vercel (SOLO las necesarias)
# Elimina las obsoletas y sube las actuales

echo "🚀 Configurando variables de entorno en Vercel..."
echo ""

# Función para agregar variable
add_env() {
  local key=$1
  local value=$2
  echo "📝 Agregando: $key"
  echo "$value" | vercel env add "$key" production --force
}

echo "═══════════════════════════════════════════════════════"
echo "  LIMPIANDO VARIABLES OBSOLETAS"
echo "═══════════════════════════════════════════════════════"
echo ""

# Eliminar variables de Firebase (obsoletas)
echo "🗑️  Eliminando variables de Firebase..."
vercel env rm NEXT_PUBLIC_FIREBASE_API_KEY production -y 2>/dev/null || true
vercel env rm NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN production -y 2>/dev/null || true
vercel env rm NEXT_PUBLIC_FIREBASE_PROJECT_ID production -y 2>/dev/null || true
vercel env rm NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET production -y 2>/dev/null || true
vercel env rm NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID production -y 2>/dev/null || true
vercel env rm NEXT_PUBLIC_FIREBASE_APP_ID production -y 2>/dev/null || true

# Eliminar variables de Wompi (obsoletas)
echo "🗑️  Eliminando variables de Wompi..."
vercel env rm NEXT_PUBLIC_WOMPI_ENV production -y 2>/dev/null || true

# Eliminar variables de PostgreSQL (obsoletas)
echo "🗑️  Eliminando variables de PostgreSQL/Neon..."
vercel env rm POSTGRES_PRISMA_URL production -y 2>/dev/null || true
vercel env rm DATABASE_URL_UNPOOLED production -y 2>/dev/null || true
vercel env rm POSTGRES_URL_NON_POOLING production -y 2>/dev/null || true
vercel env rm POSTGRES_URL_NO_SSL production -y 2>/dev/null || true
vercel env rm PGHOST production -y 2>/dev/null || true
vercel env rm PGHOST_UNPOOLED production -y 2>/dev/null || true
vercel env rm POSTGRES_USER production -y 2>/dev/null || true
vercel env rm PGUSER production -y 2>/dev/null || true
vercel env rm POSTGRES_HOST production -y 2>/dev/null || true

# Eliminar variables de Stack/Neon (obsoletas)
echo "🗑️  Eliminando variables de Stack/Neon..."
vercel env rm NEXT_PUBLIC_STACK_PROJECT_ID production -y 2>/dev/null || true
vercel env rm NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY production -y 2>/dev/null || true
vercel env rm NEON_PROJECT_ID production -y 2>/dev/null || true

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  AGREGANDO VARIABLES ACTUALES"
echo "═══════════════════════════════════════════════════════"
echo ""

# Clerk Authentication
echo "🔐 Clerk Authentication"
add_env "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" "pk_test_ZXhjaXRlZC1mb2FsLTkwLmNsZXJrLmFjY291bnRzLmRldiQ"
add_env "CLERK_SECRET_KEY" "sk_test_dAsMnN8CRIKAFgumo0iviwvNdB7ZeUlSw96IgB4JEE"
add_env "NEXT_PUBLIC_CLERK_SIGN_IN_URL" "/sign-in"
add_env "NEXT_PUBLIC_CLERK_SIGN_UP_URL" "/sign-up"
add_env "NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL" "/dashboard"
add_env "NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL" "/dashboard"

echo ""
echo "🌐 Application URLs"
add_env "NEXT_PUBLIC_APP_URL" "https://tienda-pos.vercel.app"
add_env "NEXT_PUBLIC_URL" "https://tienda-pos.vercel.app"

echo ""
echo "👨‍💼 Super Admin"
add_env "SUPER_ADMIN_EMAIL" "admin@neurai.dev"
add_env "NEXT_PUBLIC_SUPER_ADMIN_EMAIL" "admin@neurai.dev"

echo ""
echo "☁️ Cloudinary"
add_env "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME" "tiendapos"
add_env "NEXT_PUBLIC_CLOUDINARY_API_KEY" "491334679817122"
add_env "CLOUDINARY_API_SECRET" "N4JkKriorCBtFYE-7Copg2QLmXE"

echo ""
echo "⚡ Cloudflare"
add_env "NEXT_PUBLIC_CLOUDFLARE_API_URL" "https://tienda-pos-api.julii1295.workers.dev"
add_env "CRON_SECRET" "tu-secreto-super-seguro-cambia-esto-917edba8626d6da05f3d2ff52ecac09e"

echo ""
echo "💳 ePayco (IMPORTANTE)"
add_env "NEXT_PUBLIC_EPAYCO_ENV" "production"
add_env "NEXT_PUBLIC_EPAYCO_PUBLIC_KEY" "101df072a3893ba3a275792688bbd7b1"
add_env "EPAYCO_P_CUST_ID_CLIENTE" "1561203"
add_env "EPAYCO_P_KEY" "2d9fe7c7c0a93958d633f67ad51f14e4be86e686"
add_env "EPAYCO_PRIVATE_KEY" "202c490f729670c6ae421c8031c2c6ab"

echo ""
echo "═══════════════════════════════════════════════════════"
echo "  ✅ CONFIGURACIÓN COMPLETADA"
echo "═══════════════════════════════════════════════════════"
echo ""
echo "📋 Resumen:"
echo "  - Variables obsoletas eliminadas"
echo "  - Variables actuales agregadas/actualizadas"
echo ""
echo "⚠️  IMPORTANTE: Debes redesplegar para que los cambios tomen efecto:"
echo ""
echo "  vercel --prod"
echo ""
echo "O espera a que Vercel redespliegue automáticamente en el próximo commit."
echo ""
