#!/bin/bash

echo "🔍 Verificando variables de entorno de Cloudinary en Vercel..."

# Verificar si está instalado el CLI de Vercel
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI no está instalado. Instálalo con: npm i -g vercel"
    exit 1
fi

echo ""
echo "Variables de entorno actuales en Vercel:"
echo "----------------------------------------"
vercel env ls

echo ""
echo "📝 Para agregar las variables de Cloudinary a Vercel, ejecuta:"
echo ""
echo "vercel env add NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME"
echo "vercel env add NEXT_PUBLIC_CLOUDINARY_API_KEY"
echo "vercel env add CLOUDINARY_API_SECRET"
echo ""
echo "Para cada una, selecciona todos los entornos: Production, Preview, Development"
