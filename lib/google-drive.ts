/**
 * Helpers para el respaldo de ventas a Google Drive.
 *
 * Todo se hace contra las APIs REST de Google (OAuth2 + Drive v3) con `fetch`,
 * sin el SDK `googleapis`, para mantener las dependencias ligeras. Se usa desde
 * los route handlers de Next.js (runtime Node).
 *
 * Scope: `drive.file` — la app solo ve y gestiona los archivos que ella misma
 * crea. No pide acceso a todo el Drive del tendero (mínimo privilegio).
 */

export const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

const OAUTH_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const OAUTH_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';

function requiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Falta la variable de entorno ${name}`);
  return value;
}

/** URL de consentimiento de Google. `state` viaja de ida y vuelta para CSRF. */
export function buildConsentUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: requiredEnv('GOOGLE_CLIENT_ID'),
    redirect_uri: requiredEnv('GOOGLE_REDIRECT_URI'),
    response_type: 'code',
    scope: GOOGLE_DRIVE_SCOPE,
    access_type: 'offline', // necesario para recibir refresh_token
    prompt: 'consent', // fuerza refresh_token incluso si ya autorizó antes
    include_granted_scopes: 'true',
    state,
  });
  return `${OAUTH_AUTH_URL}?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

/** Canjea el `code` del callback por access_token + refresh_token. */
export async function exchangeCodeForTokens(code: string): Promise<TokenResponse> {
  const res = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: requiredEnv('GOOGLE_CLIENT_ID'),
      client_secret: requiredEnv('GOOGLE_CLIENT_SECRET'),
      redirect_uri: requiredEnv('GOOGLE_REDIRECT_URI'),
      grant_type: 'authorization_code',
    }),
  });

  if (!res.ok) {
    throw new Error(`Error al canjear el código con Google: ${await res.text()}`);
  }
  return res.json();
}

/** Obtiene un access_token fresco a partir del refresh_token guardado. */
export async function refreshAccessToken(refreshToken: string): Promise<string> {
  const res = await fetch(OAUTH_TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: requiredEnv('GOOGLE_CLIENT_ID'),
      client_secret: requiredEnv('GOOGLE_CLIENT_SECRET'),
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) {
    throw new Error(`Error al refrescar el token de Google: ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

/** Email de la cuenta de Google conectada (para mostrarlo en el dashboard). */
export async function getGoogleEmail(accessToken: string): Promise<string | null> {
  const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) return null;
  const data = (await res.json()) as { email?: string };
  return data.email || null;
}

/**
 * Busca (o crea) la carpeta de copias en el Drive del tendero y devuelve su ID.
 * Idempotente: si ya existe una carpeta con ese nombre creada por la app, la reutiliza.
 */
export async function ensureBackupFolder(accessToken: string, folderName: string): Promise<string> {
  const query = encodeURIComponent(
    `name = '${folderName.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  );
  const searchRes = await fetch(`${DRIVE_FILES_URL}?q=${query}&fields=files(id,name)&spaces=drive`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (searchRes.ok) {
    const data = (await searchRes.json()) as { files?: Array<{ id: string }> };
    if (data.files && data.files.length > 0) return data.files[0].id;
  }

  const createRes = await fetch(`${DRIVE_FILES_URL}?fields=id`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: folderName, mimeType: 'application/vnd.google-apps.folder' }),
  });

  if (!createRes.ok) {
    throw new Error(`No se pudo crear la carpeta en Drive: ${await createRes.text()}`);
  }
  const created = (await createRes.json()) as { id: string };
  return created.id;
}

/**
 * Sube un archivo a la carpeta indicada usando multipart. Si ya existe un archivo
 * con el mismo nombre en la carpeta, lo reemplaza (para que reintentos no dupliquen).
 * Devuelve el id y el webViewLink.
 */
export async function uploadFileToDrive(
  accessToken: string,
  folderId: string,
  fileName: string,
  content: Buffer | Uint8Array,
  mimeType: string
): Promise<{ id: string; webViewLink: string }> {
  // Buscar un archivo previo con el mismo nombre en la carpeta.
  const query = encodeURIComponent(
    `name = '${fileName.replace(/'/g, "\\'")}' and '${folderId}' in parents and trashed = false`
  );
  const existingRes = await fetch(`${DRIVE_FILES_URL}?q=${query}&fields=files(id)&spaces=drive`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  let existingId: string | null = null;
  if (existingRes.ok) {
    const data = (await existingRes.json()) as { files?: Array<{ id: string }> };
    if (data.files && data.files.length > 0) existingId = data.files[0].id;
  }

  const boundary = `boundary_${crypto.randomUUID()}`;
  const metadata = existingId
    ? {} // en update no se cambia el parent
    : { name: fileName, parents: [folderId] };

  const bodyParts = [
    `--${boundary}\r\n`,
    'Content-Type: application/json; charset=UTF-8\r\n\r\n',
    JSON.stringify(existingId ? { name: fileName } : metadata),
    `\r\n--${boundary}\r\n`,
    `Content-Type: ${mimeType}\r\n\r\n`,
  ];

  const head = new TextEncoder().encode(bodyParts.join(''));
  const tail = new TextEncoder().encode(`\r\n--${boundary}--`);
  const body = new Uint8Array(head.length + content.length + tail.length);
  body.set(head, 0);
  body.set(content, head.length);
  body.set(tail, head.length + content.length);

  const url = existingId
    ? `${DRIVE_UPLOAD_URL}/${existingId}?uploadType=multipart&fields=id,webViewLink`
    : `${DRIVE_UPLOAD_URL}?uploadType=multipart&fields=id,webViewLink`;

  const res = await fetch(url, {
    method: existingId ? 'PATCH' : 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body,
  });

  if (!res.ok) {
    throw new Error(`No se pudo subir el archivo a Drive: ${await res.text()}`);
  }
  const data = (await res.json()) as { id: string; webViewLink?: string };
  return { id: data.id, webViewLink: data.webViewLink || '' };
}
