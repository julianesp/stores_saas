#!/bin/bash

echo "🔧 Actualizando variables de Cloudinary en Vercel..."
echo ""
echo "Las variables ya existen en Production, vamos a agregarlas a Preview y Development"
echo ""

# Leer valores del .env.local
source .env.local

echo "📝 Valores a agregar:"
echo "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME = $NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME"
echo "NEXT_PUBLIC_CLOUDINARY_API_KEY = $NEXT_PUBLIC_CLOUDINARY_API_KEY"
echo "CLOUDINARY_API_SECRET = (oculto)"
echo ""

read -p "¿Continuar? (s/n): " confirm
if [ "$confirm" != "s" ]; then
    echo "Cancelado"
    exit 0
fi

echo ""
echo "Agregando NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME a Preview y Development..."
echo "$NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME" | vercel env add NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME preview development

echo ""
echo "Agregando NEXT_PUBLIC_CLOUDINARY_API_KEY a Preview y Development..."
echo "$NEXT_PUBLIC_CLOUDINARY_API_KEY" | vercel env add NEXT_PUBLIC_CLOUDINARY_API_KEY preview development

echo ""
echo "Agregando CLOUDINARY_API_SECRET a Preview y Development..."
echo "$CLOUDINARY_API_SECRET" | vercel env add CLOUDINARY_API_SECRET preview development

echo ""
echo "✅ Variables agregadas exitosamente!"
echo ""
echo "⚠️  IMPORTANTE: Para que los cambios tengan efecto, necesitas:"
echo "   1. Hacer un nuevo deploy (push a git)"
echo "   2. O hacer un redeploy manual desde Vercel dashboard"
