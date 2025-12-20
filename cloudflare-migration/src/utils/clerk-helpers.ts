/**
 * Clerk API Helper Functions
 * Utilities for fetching user data from Clerk API
 */

export interface ClerkUser {
  id: string;
  email_addresses: Array<{
    email_address: string;
    id: string;
  }>;
  first_name: string | null;
  last_name: string | null;
  username: string | null;
  profile_image_url: string | null;
  created_at: number;
  updated_at: number;
}

/**
 * Fetch user data from Clerk API
 * @param clerkUserId - The Clerk user ID (sub from JWT)
 * @param clerkSecretKey - Clerk secret key for API authentication
 * @returns User data from Clerk or null if not found
 */
export async function fetchClerkUser(
  clerkUserId: string,
  clerkSecretKey: string
): Promise<ClerkUser | null> {
  try {
    const response = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}`, {
      headers: {
        'Authorization': `Bearer ${clerkSecretKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch Clerk user: ${response.status} ${response.statusText}`);
      return null;
    }

    const userData = await response.json();
    return userData as ClerkUser;
  } catch (error) {
    console.error('Error fetching Clerk user:', error);
    return null;
  }
}

/**
 * Extract email from Clerk user data
 * @param user - Clerk user data
 * @returns Email address or placeholder
 */
export function getClerkUserEmail(user: ClerkUser | null, clerkUserId: string): string {
  if (!user || !user.email_addresses || user.email_addresses.length === 0) {
    return `user_${clerkUserId}@placeholder.com`;
  }
  return user.email_addresses[0].email_address;
}

/**
 * Extract full name from Clerk user data
 * @param user - Clerk user data
 * @returns Full name or "Usuario" if not available
 */
export function getClerkUserFullName(user: ClerkUser | null): string {
  if (!user) {
    return 'Usuario';
  }

  const firstName = user.first_name || '';
  const lastName = user.last_name || '';
  const fullName = `${firstName} ${lastName}`.trim();

  if (fullName) {
    return fullName;
  }

  if (user.username) {
    return user.username;
  }

  return 'Usuario';
}
