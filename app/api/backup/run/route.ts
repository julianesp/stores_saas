import { NextRequest, NextResponse } from 'next/server';
import {
  getDriveCredentials,
  getSalesForDay,
  recordBackup,
} from '@/lib/backup-worker';
import { buildDailyBackupExcel } from '@/lib/backup-excel';
import {
  refreshAccessToken,
  ensureBackupFolder,
  uploadFileToDrive,
} from '@/lib/google-drive';

export const runtime = 'nodejs';
export const maxDuration = 60;

const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/**
 * Ejecuta la copia de un día para un tenant: consulta las ventas, arma el Excel,
 * refresca el token de Google, sube el archivo a Drive y registra el resultado.
 *
 * Autenticado por CRON_SECRET (X-Cron-Secret): lo llama el cron del Worker, tanto
 * en el disparo puntual de la noche como en la verificación/reintento de la mañana.
 * No hay sesión de usuario aquí.
 */
export async function POST(request: NextRequest) {
  // Guard: solo el cron (con el secret) puede ejecutar respaldos.
  const provided = request.headers.get('X-Cron-Secret');
  if (!process.env.CRON_SECRET || provided !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const body = await request.json().catch(() => null);
  const userProfileId = body?.user_profile_id as string | undefined;
  const date = body?.date as string | undefined;

  if (!userProfileId || !date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: 'Parámetros inválidos' }, { status: 400 });
  }

  try {
    const creds = await getDriveCredentials(userProfileId);
    if (!creds) {
      return NextResponse.json({ error: 'Tenant sin Google conectado' }, { status: 404 });
    }

    const sales = await getSalesForDay(userProfileId, date);

    // Access token fresco a partir del refresh_token guardado.
    const accessToken = await refreshAccessToken(creds.google_refresh_token);

    // Asegurar carpeta (por si el tendero la borró) y generar el Excel.
    const folderName = `Copias POS - ${creds.store_name || 'Mi tienda'}`;
    const folderId = creds.drive_folder_id || (await ensureBackupFolder(accessToken, folderName));

    const excel = await buildDailyBackupExcel({
      storeName: creds.store_name || 'Mi tienda',
      date,
      sales,
    });

    const fileName = `ventas-${date}.xlsx`;
    const uploaded = await uploadFileToDrive(accessToken, folderId, fileName, excel, XLSX_MIME);

    await recordBackup({
      user_profile_id: userProfileId,
      backup_date: date,
      status: 'uploaded',
      drive_file_id: uploaded.id,
      drive_file_link: uploaded.webViewLink,
      sales_count: sales.length,
    });

    return NextResponse.json({
      success: true,
      sales_count: sales.length,
      file: uploaded.webViewLink,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido';
    console.error('[backup/run] Error:', message);

    // Registrar el fallo para que la verificación matutina lo reintente.
    try {
      await recordBackup({
        user_profile_id: userProfileId,
        backup_date: date,
        status: 'failed',
        error: message,
      });
    } catch (recErr) {
      console.error('[backup/run] No se pudo registrar el fallo:', recErr);
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
