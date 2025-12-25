import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { v2 as cloudinary } from 'cloudinary';

// Force Node.js runtime (Cloudinary requires Node.js)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Validar configuración de Cloudinary
const validateCloudinaryConfig = () => {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    console.error('❌ Cloudinary config missing:', {
      cloudName: cloudName ? '✓' : '✗',
      apiKey: apiKey ? '✓' : '✗',
      apiSecret: apiSecret ? '✓' : '✗',
    });
    return false;
  }
  return true;
};

export async function POST(request: NextRequest) {
  try {
    console.log('=== Upload Image API Called ===');

    // Verificar autenticación primero
    const { userId } = await auth();
    if (!userId) {
      console.error('❌ Upload attempt without authentication');
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    console.log('✓ User authenticated:', userId);

    // Validar configuración de Cloudinary
    const isConfigValid = validateCloudinaryConfig();
    if (!isConfigValid) {
      console.error('❌ Cloudinary no está configurado correctamente');
      return NextResponse.json(
        { error: 'Error de configuración del servidor. Contacta al administrador.' },
        { status: 500 }
      );
    }

    console.log('✓ Cloudinary config validated');

    // Obtener datos del formulario
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const folder = formData.get('folder') as string || 'products';

    if (!file) {
      console.error('No file provided in upload request');
      return NextResponse.json(
        { error: 'No se proporcionó archivo' },
        { status: 400 }
      );
    }

    console.log('Processing image upload:', {
      fileName: file.name,
      fileType: file.type,
      fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
      folder,
    });

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      console.error('Invalid file type:', file.type);
      return NextResponse.json(
        { error: 'El archivo debe ser una imagen' },
        { status: 400 }
      );
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      console.error('File too large:', file.size);
      return NextResponse.json(
        { error: 'La imagen es muy grande (máximo 5MB)' },
        { status: 400 }
      );
    }

    // Convertir File a Buffer
    console.log('Converting file to buffer...');
    let buffer: Buffer;
    try {
      const bytes = await file.arrayBuffer();
      buffer = Buffer.from(bytes);
      console.log('✓ Buffer created, size:', buffer.length);
    } catch (error: any) {
      console.error('❌ Error converting file to buffer:', error);
      return NextResponse.json(
        { error: 'Error al procesar el archivo. Intenta con otra imagen.' },
        { status: 400 }
      );
    }

    console.log('📤 Starting Cloudinary upload...');

    // Subir a Cloudinary usando upload_stream
    const uploadResult = await new Promise((resolve, reject) => {
      // Timeout para evitar esperas infinitas
      const timeout = setTimeout(() => {
        reject(new Error('Timeout: La subida tardó demasiado (30s). Intenta de nuevo.'));
      }, 30000); // 30 segundos

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          resource_type: 'image',
          transformation: [
            { width: 1200, height: 1200, crop: 'limit' }, // Limitar tamaño máximo
            { quality: 'auto:good' }, // Optimizar calidad automáticamente
            { fetch_format: 'auto' }, // Formato automático (WebP cuando sea posible)
          ],
        },
        (error, result) => {
          clearTimeout(timeout);
          if (error) {
            console.error('❌ Cloudinary upload error:', {
              message: error.message,
              http_code: error.http_code,
              error
            });
            reject(new Error(error.message || 'Error al subir imagen a Cloudinary'));
          } else {
            console.log('✅ Cloudinary upload success:', result?.secure_url);
            resolve(result);
          }
        }
      );

      uploadStream.end(buffer);
    });

    const result = uploadResult as any;

    return NextResponse.json({
      success: true,
      secure_url: result.secure_url,
      public_id: result.public_id,
    });

  } catch (error: any) {
    console.error('Error uploading image:', {
      message: error.message,
      stack: error.stack,
      error,
    });
    return NextResponse.json(
      { error: error.message || 'Error al subir imagen al servidor' },
      { status: 500 }
    );
  }
}

/**
 * DELETE: Eliminar imagen de Cloudinary
 */
export async function DELETE(request: NextRequest) {
  try {
    // Verificar autenticación
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const publicId = searchParams.get('public_id');

    if (!publicId) {
      return NextResponse.json(
        { error: 'public_id es requerido' },
        { status: 400 }
      );
    }

    // Eliminar de Cloudinary
    const result = await cloudinary.uploader.destroy(publicId);

    return NextResponse.json({
      success: true,
      result,
    });

  } catch (error: any) {
    console.error('Error deleting image:', error);
    return NextResponse.json(
      { error: error.message || 'Error al eliminar imagen' },
      { status: 500 }
    );
  }
}
