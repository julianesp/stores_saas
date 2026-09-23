import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  exchangeCodeForTokens,
  getGoogleEmail,
  ensureBackupFolder,
} from '@/lib/google-drive';
import { verifyState } from '@/lib/backup-state';
import { saveDriveCredentials } from '@/lib/backup-worker';

export const runtime = 'nodejs';

// A dónde volver en el dashboard tras conectar (con un flag de resultado).
const CONFIG_PATH = '/dashboard/config';

function redirectToConfig(request: NextRequest, status: 'ok' | 'error', message?: string) {
  const url = new URL(CONFIG_PATH, request.nextUrl.origin);
  url.searchParams.set('drive', status);
  if (message) url.searchParams.set('drive_msg', message);
  url.hash = 'google-drive';
  return NextResponse.redirect(url);
}

/**
 * Callback de Google OAuth. Verifica el `state`, canjea el código por tokens,
 * crea la carpeta de copias en el Drive del tendero y guarda el refresh_token
 * en D1 (vía el Worker). Redirige de vuelta a la página de configuración.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const error = params.get('error');
  if (error) {
    return redirectToConfig(request, 'error', 'Conexión cancelada');
  }

  const code = params.get('code');
  const state = params.get('state');
  if (!code || !state) {
    return redirectToConfig(request, 'error', 'Respuesta inválida de Google');
  }

  const payload = verifyState(state);
  if (!payload) {
    return redirectToConfig(request, 'error', 'La sesión de conexión expiró, intenta de nuevo');
  }

  // Defensa extra: el usuario que vuelve debe ser el mismo que inició.
  const { userId } = await auth();
  if (!userId || userId !== payload.clerkUserId) {
    return redirectToConfig(request, 'error', 'La sesión no coincide');
  }

  try {
    const tokens = await exchangeCodeForTokens(code);
    if (!tokens.refresh_token) {
      // Google no reenvía refresh_token si ya se autorizó antes sin revocar.
      return redirectToConfig(
        request,
        'error',
        'Google no entregó el permiso persistente. Revoca el acceso en tu cuenta de Google e intenta de nuevo.'
      );
    }

    const googleEmail = await getGoogleEmail(tokens.access_token);
    const folderName = `Copias POS - ${payload.storeName}`;
    const folderId = await ensureBackupFolder(tokens.access_token, folderName);

    await saveDriveCredentials({
      user_profile_id: payload.userProfileId,
      google_email: googleEmail,
      google_refresh_token: tokens.refresh_token,
      drive_folder_id: folderId,
    });

    return redirectToConfig(request, 'ok');
  } catch (err) {
    console.error('[backup/callback] Error:', err);
    return redirectToConfig(request, 'error', 'No se pudo completar la conexión');
  }
}
