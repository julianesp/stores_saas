/**
 * Cliente de las rutas internas de respaldo del Worker (/api/backup-internal/*).
 *
 * Estas rutas no usan el JWT de Clerk; se autentican con CRON_SECRET vía la
 * cabecera X-Cron-Secret (mismo secret que comparten Worker y front). Se usan
 * desde el flujo OAuth y desde el endpoint de ejecución del respaldo.
 */

const API_URL =
  process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL || 'https://tienda-pos-api.julii1295.workers.dev';

function internalHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Cron-Secret': process.env.CRON_SECRET || '',
  };
}

/** Guarda las credenciales de Google del tenant tras el OAuth. */
export async function saveDriveCredentials(params: {
  user_profile_id: string;
  google_email: string | null;
  google_refresh_token: string;
  drive_folder_id: string;
}): Promise<void> {
  const res = await fetch(`${API_URL}/api/backup-internal/credentials`, {
    method: 'POST',
    headers: internalHeaders(),
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`Worker rechazó credentials: ${await res.text()}`);
}

/** Desconecta Google del tenant. */
export async function disconnectDrive(userProfileId: string): Promise<void> {
  const res = await fetch(`${API_URL}/api/backup-internal/disconnect`, {
    method: 'POST',
    headers: internalHeaders(),
    body: JSON.stringify({ user_profile_id: userProfileId }),
  });
  if (!res.ok) throw new Error(`Worker rechazó disconnect: ${await res.text()}`);
}

interface DriveCredentials {
  user_profile_id: string;
  google_email: string | null;
  google_refresh_token: string;
  drive_folder_id: string | null;
  store_name: string | null;
}

/** Lee las credenciales de Google de un tenant (para refrescar el token). */
export async function getDriveCredentials(userProfileId: string): Promise<DriveCredentials | null> {
  const res = await fetch(`${API_URL}/api/backup-internal/credentials/${userProfileId}`, {
    headers: internalHeaders(),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Worker rechazó GET credentials: ${await res.text()}`);
  const json = (await res.json()) as { data: DriveCredentials };
  return json.data;
}

export interface BackupSaleItem {
  product_name: string;
  quantity: number;
  unit_price: number;
  subtotal: number;
}

export interface BackupSale {
  id: string;
  total: number;
  subtotal: number;
  payment_method: string;
  payment_status: string | null;
  status: string;
  created_at: string;
  customer_name: string | null;
  items: BackupSaleItem[];
}

/** Ventas de un día (zona Colombia) de un tenant, con sus ítems. */
export async function getSalesForDay(
  userProfileId: string,
  date: string
): Promise<BackupSale[]> {
  const res = await fetch(
    `${API_URL}/api/backup-internal/sales-for-day?id=${encodeURIComponent(userProfileId)}&date=${date}`,
    { headers: internalHeaders() }
  );
  if (!res.ok) throw new Error(`Worker rechazó sales-for-day: ${await res.text()}`);
  const json = (await res.json()) as { data: BackupSale[] };
  return json.data || [];
}

/** Registra el resultado de una copia (uploaded/failed). */
export async function recordBackup(params: {
  user_profile_id: string;
  backup_date: string;
  status: 'uploaded' | 'failed';
  drive_file_id?: string;
  drive_file_link?: string;
  sales_count?: number;
  error?: string;
}): Promise<void> {
  const res = await fetch(`${API_URL}/api/backup-internal/record`, {
    method: 'POST',
    headers: internalHeaders(),
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`Worker rechazó record: ${await res.text()}`);
}
