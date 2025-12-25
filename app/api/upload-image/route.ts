import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { v2 as cloudinary } from 'cloudinary';

// Force Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  console.log('=== Upload API Called ===');

  try {
    // 1. Autenticación
    const { userId } = await auth();
    if (!userId) {
      console.error('No userId');
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }
    console.log('✓ Auth OK');

    // 2. Obtener archivo
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      console.error('No file');
      return NextResponse.json({ error: 'No file' }, { status: 400 });
    }
    console.log('✓ File OK:', file.size, 'bytes');

    // 3. Configurar Cloudinary
    cloudinary.config({
      cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
      api_key: process.env.NEXT_PUBLIC_CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });
    console.log('✓ Cloudinary config OK');

    // 4. Convertir a base64 (método alternativo más simple)
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const base64 = buffer.toString('base64');
    const dataURI = `data:${file.type};base64,${base64}`;
    console.log('✓ Base64 OK');

    // 5. Subir usando upload en lugar de upload_stream
    console.log('Uploading to Cloudinary...');
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'products',
      resource_type: 'image',
    });
    console.log('✓ Upload OK:', result.secure_url);

    return NextResponse.json({
      success: true,
      secure_url: result.secure_url,
      public_id: result.public_id,
    });

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
    return NextResponse.json(
      { error: error.message || 'Error al subir imagen' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const publicId = searchParams.get('public_id');

    if (!publicId) {
      return NextResponse.json({ error: 'public_id requerido' }, { status: 400 });
    }

    const result = await cloudinary.uploader.destroy(publicId);
    return NextResponse.json({ success: true, result });

  } catch (error: any) {
    console.error('Error deleting:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
