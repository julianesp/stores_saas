#!/bin/bash

echo "📤 Subiendo variables de Cloudinary a Vercel..."

# Cloudinary - Production
echo "tiendapos" | vercel env add NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME production
echo "491334679817122" | vercel env add NEXT_PUBLIC_CLOUDINARY_API_KEY production
echo "N4JkKriorCBtFYE-7Copg2QLmXE" | vercel env add CLOUDINARY_API_SECRET production

echo ""
echo "✅ Variables de Cloudinary configuradas"
echo ""
echo "🚀 Ahora puedes hacer deploy:"
echo "   git push origin main"
