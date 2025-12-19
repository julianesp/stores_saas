#!/bin/bash

# Script para subir variables de entorno de ePayco a Vercel automáticamente
# Lee los valores desde .env.local

echo "📤 Subiendo variables de entorno de ePayco a Vercel..."
echo ""

# Verificar que existe .env.local
if [ ! -f .env.local ]; then
    echo "❌ Error: No se encuentra el archivo .env.local"
    exit 1
fi

# Función para obtener valor del .env.local
get_env_value() {
    grep "^$1=" .env.local | cut -d '=' -f2- | tr -d '\r'
}

# Obtener valores
EPAYCO_ENV=$(get_env_value "NEXT_PUBLIC_EPAYCO_ENV")
EPAYCO_PUBLIC_KEY=$(get_env_value "NEXT_PUBLIC_EPAYCO_PUBLIC_KEY")
EPAYCO_P_CUST_ID=$(get_env_value "EPAYCO_P_CUST_ID_CLIENTE")
EPAYCO_P_KEY=$(get_env_value "EPAYCO_P_KEY")
EPAYCO_PRIVATE_KEY=$(get_env_value "EPAYCO_PRIVATE_KEY")
APP_URL=$(get_env_value "NEXT_PUBLIC_APP_URL")
PUBLIC_URL=$(get_env_value "NEXT_PUBLIC_URL")

echo "📋 Valores a subir:"
echo "   NEXT_PUBLIC_EPAYCO_ENV = $EPAYCO_ENV"
echo "   NEXT_PUBLIC_EPAYCO_PUBLIC_KEY = ${EPAYCO_PUBLIC_KEY:0:20}..."
echo "   EPAYCO_P_CUST_ID_CLIENTE = $EPAYCO_P_CUST_ID"
echo "   EPAYCO_P_KEY = ${EPAYCO_P_KEY:0:20}..."
echo "   EPAYCO_PRIVATE_KEY = ${EPAYCO_PRIVATE_KEY:0:20}..."
echo "   NEXT_PUBLIC_APP_URL = $APP_URL"
echo "   NEXT_PUBLIC_URL = $PUBLIC_URL"
echo ""

read -p "¿Continuar? (s/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Ss]$ ]]; then
    echo "❌ Cancelado"
    exit 1
fi

# Subir variables
echo ""
echo "1️⃣ Subiendo NEXT_PUBLIC_EPAYCO_ENV..."
echo "$EPAYCO_ENV" | vercel env add NEXT_PUBLIC_EPAYCO_ENV production

echo ""
echo "2️⃣ Subiendo NEXT_PUBLIC_EPAYCO_PUBLIC_KEY..."
echo "$EPAYCO_PUBLIC_KEY" | vercel env add NEXT_PUBLIC_EPAYCO_PUBLIC_KEY production

echo ""
echo "3️⃣ Subiendo EPAYCO_P_CUST_ID_CLIENTE..."
echo "$EPAYCO_P_CUST_ID" | vercel env add EPAYCO_P_CUST_ID_CLIENTE production

echo ""
echo "4️⃣ Subiendo EPAYCO_P_KEY..."
echo "$EPAYCO_P_KEY" | vercel env add EPAYCO_P_KEY production

echo ""
echo "5️⃣ Subiendo EPAYCO_PRIVATE_KEY..."
echo "$EPAYCO_PRIVATE_KEY" | vercel env add EPAYCO_PRIVATE_KEY production

echo ""
echo "6️⃣ Subiendo NEXT_PUBLIC_APP_URL..."
echo "$APP_URL" | vercel env add NEXT_PUBLIC_APP_URL production

echo ""
echo "7️⃣ Subiendo NEXT_PUBLIC_URL..."
echo "$PUBLIC_URL" | vercel env add NEXT_PUBLIC_URL production

echo ""
echo "✅ ¡Todas las variables de entorno se subieron correctamente!"
echo ""
echo "🔄 Ahora despliega tu aplicación con:"
echo "   vercel --prod"
echo ""
