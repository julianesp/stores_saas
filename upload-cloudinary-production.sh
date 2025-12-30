#!/bin/bash

# Script para agregar variables de Cloudinary a Production en Vercel
# IMPORTANTE: Usar echo -n para NO agregar saltos de línea

echo "Agregando variables de Cloudinary a Production..."

# NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME
echo -n "tiendapos" | vercel env add NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME production

# NEXT_PUBLIC_CLOUDINARY_API_KEY
echo -n "491334679817122" | vercel env add NEXT_PUBLIC_CLOUDINARY_API_KEY production

# CLOUDINARY_API_SECRET
echo -n "N4JkKriorCBtFYE-7Copg2QLmXE" | vercel env add CLOUDINARY_API_SECRET production

echo "¡Variables agregadas exitosamente!"
