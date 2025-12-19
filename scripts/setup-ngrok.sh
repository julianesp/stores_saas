#!/bin/bash

# Script para configurar ngrok y recibir webhooks de Wompi

echo "🚀 Configurando ngrok para recibir webhooks de Wompi"
echo ""

# Verificar si ngrok está instalado
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok no está instalado"
    echo ""
    echo "Instálalo desde: https://ngrok.com/download"
    echo "O con snap: sudo snap install ngrok"
    exit 1
fi

echo "✅ ngrok instalado"
echo ""

# Verificar si el servidor está corriendo en 3000
if ! lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "❌ El servidor Next.js NO está corriendo en el puerto 3000"
    echo ""
    echo "Primero ejecuta: npm run dev"
    exit 1
fi

echo "✅ Servidor Next.js corriendo en puerto 3000"
echo ""

# Iniciar ngrok
echo "📡 Iniciando ngrok..."
echo ""
echo "Esto te dará una URL pública como: https://abc123.ngrok.io"
echo ""
echo "⚠️  IMPORTANTE: Copia la URL HTTPS y configúrala en Wompi como:"
echo "   https://TU-URL.ngrok.io/api/webhooks/wompi"
echo ""
echo "Presiona Ctrl+C para detener ngrok cuando termines"
echo ""

ngrok http 3000
