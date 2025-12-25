import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const dataUrl = searchParams.get('url');

    if (!dataUrl) {
      return NextResponse.json({ error: 'URL requerida' }, { status: 400 });
    }

    // Decodificar el data URL
    const base64Data = dataUrl.split(',')[1];

    if (!base64Data) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    // Convertir base64 a buffer
    const pdfBuffer = Buffer.from(base64Data, 'base64');

    // Retornar el PDF como respuesta
    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="factura.pdf"',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

  } catch (error) {
    console.error('Error downloading PDF:', error);
    return NextResponse.json(
      { error: 'Error al descargar PDF' },
      { status: 500 }
    );
  }
}
