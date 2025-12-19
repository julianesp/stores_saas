#!/bin/bash

# Script para subir variables de entorno de ePayco a Vercel
# Uso: ./upload-epayco-env.sh

echo "📤 Subiendo variables de entorno de ePayco a Vercel..."
echo ""

# ePayco - Producción
echo "1️⃣ Configurando ePayco en modo producción..."
vercel env add NEXT_PUBLIC_EPAYCO_ENV production production
vercel env add NEXT_PUBLIC_EPAYCO_PUBLIC_KEY production production
vercel env add EPAYCO_P_CUST_ID_CLIENTE production production
vercel env add EPAYCO_P_KEY production production
vercel env add EPAYCO_PRIVATE_KEY production production

# URLs de la aplicación
echo ""
echo "2️⃣ Configurando URLs de la aplicación..."
vercel env add NEXT_PUBLIC_APP_URL production production
vercel env add NEXT_PUBLIC_URL production production

echo ""
echo "✅ Variables de entorno subidas correctamente"
echo ""
echo "📝 Valores que debes ingresar cuando te lo pida:"
echo "   NEXT_PUBLIC_EPAYCO_ENV = production"
echo "   NEXT_PUBLIC_EPAYCO_PUBLIC_KEY = 2d9fe7c7c0a93958d633f67ad51f14e4be86e686"
echo "   EPAYCO_P_CUST_ID_CLIENTE = 1561203"
echo "   EPAYCO_P_KEY = 101df072a3893ba3a275792688bbd7b1"
echo "   EPAYCO_PRIVATE_KEY = 202c490f729670c6ae421c8031c2c6ab"
echo "   NEXT_PUBLIC_APP_URL = https://tienda-pos.vercel.app"
echo "   NEXT_PUBLIC_URL = https://tienda-pos.vercel.app"
echo ""
echo "🔄 Después de subir las variables, ejecuta:"
echo "   vercel --prod"
echo ""
