#!/bin/bash

# Script mejorado para subir variables de entorno a Vercel
# Usa --yes para evitar prompts interactivos

PROJECT_NAME="tienda-pos"

echo "📤 Subiendo variables de entorno a Vercel (Proyecto: $PROJECT_NAME)..."
echo ""

# Función para agregar variable de entorno
add_env() {
    local key=$1
    local value=$2
    echo "Adding $key..."
    echo "$value" | vercel env add "$key" production --yes 2>/dev/null || echo "  ⚠️  $key ya existe o hubo un error"
}

# Clerk Authentication
echo "🔐 Configurando Clerk Authentication..."
add_env "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" "pk_test_ZXhjaXRlZC1mb2FsLTkwLmNsZXJrLmFjY291bnRzLmRldiQ"
add_env "CLERK_SECRET_KEY" "sk_test_dAsMnN8CRIKAFgumo0iviwvNdB7ZeUlSw96IgB4JEE"
add_env "NEXT_PUBLIC_CLERK_SIGN_IN_URL" "/sign-in"
add_env "NEXT_PUBLIC_CLERK_SIGN_UP_URL" "/sign-up"
add_env "NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL" "/dashboard"
add_env "NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL" "/dashboard"

# Firebase
echo "🔥 Configurando Firebase..."
add_env "NEXT_PUBLIC_FIREBASE_API_KEY" "AIzaSyCy0_xHahJygoybRTIcjNLNSNkqc_jd_3U"
add_env "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN" "stores-9fb3c.firebaseapp.com"
add_env "NEXT_PUBLIC_FIREBASE_PROJECT_ID" "stores-9fb3c"
add_env "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET" "stores-9fb3c.firebasestorage.app"
add_env "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID" "181901581482"
add_env "NEXT_PUBLIC_FIREBASE_APP_ID" "1:181901581482:web:29edf631e13562d48484d3"

# Super Admin
echo "👤 Configurando Super Admin..."
add_env "SUPER_ADMIN_EMAIL" "admin@neurai.dev"

# Wompi
echo "💳 Configurando Wompi (Pagos)..."
add_env "NEXT_PUBLIC_WOMPI_ENV" "production"
add_env "NEXT_PUBLIC_WOMPI_PUBLIC_KEY" "pub_prod_LGXgTsMP6ErIj0DoTBIOlnVlKvaWeggC"
add_env "WOMPI_PRIVATE_KEY" "prv_prod_ysl4hWLET10WkcTYVmRsy67mPhh4cxCc"
add_env "WOMPI_INTEGRITY_SECRET" "prod_integrity_Id5LNZGdCTxI32qvzgETqgRZmYqyUFwS"

echo ""
echo "✅ Proceso completado"
echo ""
echo "📝 Nota: Si alguna variable ya existía, se mostrará una advertencia."
echo "        Puedes verificar las variables en: https://vercel.com/julianesps-projects/tienda-pos/settings/environment-variables"
echo ""
echo "🚀 Para hacer el deploy, ejecuta: vercel --prod"
