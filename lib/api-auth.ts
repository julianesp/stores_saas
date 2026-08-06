import { auth } from '@clerk/nextjs/server';
import { getUserProfile } from '@/lib/cloudflare-api';
import type { UserProfile } from '@/lib/types';

/**
 * Helpers de autorización para route handlers de Next.js.
 *
 * Estos helpers centralizan la verificación de identidad (Clerk) y de
 * privilegios (superadmin) para no repetir la lógica en cada endpoint y evitar
 * que un endpoint quede accidentalmente sin protección.
 */

export type GetTokenFn = Awaited<ReturnType<typeof auth>>['getToken'];

export interface AuthedContext {
  userId: string;
  getToken: GetTokenFn;
}

export interface SuperAdminContext extends AuthedContext {
  profile: UserProfile;
}

/**
 * Exige un usuario autenticado. Devuelve el contexto o `null` si no hay sesión.
 */
export async function requireAuth(): Promise<AuthedContext | null> {
  const { userId, getToken } = await auth();
  if (!userId || !getToken) return null;
  return { userId, getToken };
}

/**
 * Exige que el usuario autenticado sea superadmin.
 *
 * La verificación se hace contra la fuente de verdad (el flag `is_superadmin`
 * persistido en el perfil), NO contra un email en variables de entorno. Un
 * email nunca debe ser suficiente para conceder privilegios de superadmin.
 *
 * Devuelve el contexto con el perfil cargado o `null` si no está autorizado.
 */
export async function requireSuperAdmin(): Promise<SuperAdminContext | null> {
  const authed = await requireAuth();
  if (!authed) return null;

  let profile: UserProfile | null = null;
  try {
    profile = await getUserProfile(authed.getToken);
  } catch {
    return null;
  }

  if (!profile || !profile.is_superadmin) return null;

  return { ...authed, profile };
}
