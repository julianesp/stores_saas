import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { v2 as cloudinary } from 'cloudinary';

// Force Node.js runtime (Cloudinary requires Node.js)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    console.log('=== Upload Image API Called ===');

    // Verificar autenticación
    let userId: string | null = null;
    try {
      const authResult = await auth();
      userId = authResult.userId;
    } catch (authError: any) {
      console.error('❌ Auth error:', authError);
      return NextResponse.json(
        { error: 'Error de autenticación' },
        { status: 401 }
      );
    }

    if (!userId) {
      console.error('❌ No userId found');
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    console.log('✓ User authenticated:', userId);

    // Configurar Cloudinary (hacerlo dentro de la función para asegurar que se ejecute en cada request)
    const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      console.error('❌ Cloudinary config missing:', {
        cloudName: !!cloudName,
        apiKey: !!apiKey,
        apiSecret: !!apiSecret,
      });
      return NextResponse.json(
        { error: 'Configuración de Cloudinary incompleta' },
        { status: 500 }
      );
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
    });

    console.log('✓ Cloudinary configured');

    // Obtener datos del formulario
    let formData: FormData;
    try {
      formData = await request.formData();
    } catch (formError: any) {
      console.error('❌ Error parsing formData:', formError);
      return NextResponse.json(
        { error: 'Error al procesar la solicitud' },
        { status: 400 }
      );
    }

    const file = formData.get('file') as File | null;
    const folder = (formData.get('folder') as string) || 'products';

    if (!file) {
      console.error('❌ No file in formData');
      return NextResponse.json(
        { error: 'No se proporcionó archivo' },
        { status: 400 }
      );
    }

    console.log('✓ File received:', {
      name: file.name,
      type: file.type,
      size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
    });

    // Validar tipo de archivo
    if (!file.type.startsWith('image/')) {
      console.error('❌ Invalid file type:', file.type);
      return NextResponse.json(
        { error: 'El archivo debe ser una imagen' },
        { status: 400 }
      );
    }

    // Validar tamaño (máximo 5MB)
    if (file.size > 5 * 1024 * 1024) {
      console.error('❌ File too large:', file.size);
      return NextResponse.json(
        { error: 'La imagen es muy grande (máximo 5MB)' },
        { status: 400 }
      );
    }

    // Convertir File a Buffer
    let buffer: Buffer;
    try {
      const bytes = await file.arrayBuffer();
      buffer = Buffer.from(bytes);
      console.log('✓ Buffer created, size:', buffer.length);
    } catch (bufferError: any) {
      console.error('❌ Error creating buffer:', bufferError);
      return NextResponse.json(
        { error: 'Error al procesar el archivo' },
        { status: 400 }
      );
    }

    console.log('📤 Starting Cloudinary upload...');

    // Subir a Cloudinary
    let uploadResult: any;
    try {
      uploadResult = await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Timeout al subir imagen'));
        }, 30000);

        const uploadStream = cloudinary.uploader.upload_stream(
          {
            folder: folder,
            resource_type: 'image',
            transformation: [
              { width: 1200, height: 1200, crop: 'limit' },
              { quality: 'auto:good' },
              { fetch_format: 'auto' },
            ],
          },
          (error, result) => {
            clearTimeout(timeout);
            if (error) {
              console.error('❌ Cloudinary error:', error);
              reject(error);
            } else {
              console.log('✅ Upload success:', result?.secure_url);
              resolve(result);
            }
          }
        );

        uploadStream.end(buffer);
      });
    } catch (uploadError: any) {
      console.error('❌ Upload failed:', uploadError);
      return NextResponse.json(
        { error: `Error al subir a Cloudinary: ${uploadError.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      secure_url: uploadResult.secure_url,
      public_id: uploadResult.public_id,
    });

  } catch (error: any) {
    console.error('❌ Unexpected error:', {
      message: error.message,
      stack: error.stack,
    });
    return NextResponse.json(
      { error: `Error interno del servidor: ${error.message}` },
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
