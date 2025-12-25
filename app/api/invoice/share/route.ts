import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { pdfData, saleNumber } = body;

    if (!pdfData || !saleNumber) {
      return NextResponse.json({ error: 'Datos requeridos' }, { status: 400 });
    }

    // Convertir base64 a Buffer
    const pdfBuffer = Buffer.from(pdfData, 'base64');

    // Aquí podrías subir a Cloudinary o guardar temporalmente
    // Por ahora, vamos a usar una solución con Data URL

    // Generar un ID único para este PDF
    const pdfId = `${Date.now()}-${saleNumber}`;

    // En producción, deberías subir esto a Cloudinary o un almacenamiento temporal
    // Por ahora retornamos el data URL
    const dataUrl = `data:application/pdf;base64,${pdfData}`;

    return NextResponse.json({
      success: true,
      downloadUrl: dataUrl,
      pdfId: pdfId,
      message: 'PDF generado exitosamente'
    });

  } catch (error) {
    console.error('Error sharing invoice:', error);
    return NextResponse.json(
      { error: 'Error al compartir factura' },
      { status: 500 }
    );
  }
}
