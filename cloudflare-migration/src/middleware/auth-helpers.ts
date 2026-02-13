/**
 * Authentication Helper Functions
 * Shared utilities for token verification
 */

import type { ClerkJWTPayload } from '../types';

/**
 * Decode Clerk JWT (without verification - for development only)
 */
export async function decodeClerkToken(token: string): Promise<ClerkJWTPayload> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid JWT format');
  }

  const payload = JSON.parse(
    atob(parts[1].replace(/-/g, '+').replace(/_/g, '/'))
  );

  return payload;
}
