#!/bin/bash

# Script para subir variables de entorno a Vercel
# Asegúrate de estar autenticado con 'vercel login'

echo "Subiendo variables de entorno a Vercel..."

# Clerk Authentication
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY production <<< "pk_test_ZXhjaXRlZC1mb2FsLTkwLmNsZXJrLmFjY291bnRzLmRldiQ"
vercel env add CLERK_SECRET_KEY production <<< "sk_test_dAsMnN8CRIKAFgumo0iviwvNdB7ZeUlSw96IgB4JEE"

vercel env add NEXT_PUBLIC_CLERK_SIGN_IN_URL production <<< "/sign-in"
vercel env add NEXT_PUBLIC_CLERK_SIGN_UP_URL production <<< "/sign-up"
vercel env add NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL production <<< "/dashboard"
vercel env add NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL production <<< "/dashboard"

# Firebase
vercel env add NEXT_PUBLIC_FIREBASE_API_KEY production <<< "AIzaSyCy0_xHahJygoybRTIcjNLNSNkqc_jd_3U"
vercel env add NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN production <<< "stores-9fb3c.firebaseapp.com"
vercel env add NEXT_PUBLIC_FIREBASE_PROJECT_ID production <<< "stores-9fb3c"
vercel env add NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET production <<< "stores-9fb3c.firebasestorage.app"
vercel env add NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID production <<< "181901581482"
vercel env add NEXT_PUBLIC_FIREBASE_APP_ID production <<< "1:181901581482:web:29edf631e13562d48484d3"

# Super Admin
vercel env add SUPER_ADMIN_EMAIL production <<< "admin@neurai.dev"

# Wompi
vercel env add NEXT_PUBLIC_WOMPI_ENV production <<< "production"
vercel env add NEXT_PUBLIC_WOMPI_PUBLIC_KEY production <<< "pub_prod_LGXgTsMP6ErIj0DoTBIOlnVlKvaWeggC"
vercel env add WOMPI_PRIVATE_KEY production <<< "prv_prod_ysl4hWLET10WkcTYVmRsy67mPhh4cxCc"
vercel env add WOMPI_INTEGRITY_SECRET production <<< "prod_integrity_Id5LNZGdCTxI32qvzgETqgRZmYqyUFwS"

echo "✓ Variables de entorno subidas correctamente"
echo "Ahora puedes hacer el deploy con: vercel --prod"
