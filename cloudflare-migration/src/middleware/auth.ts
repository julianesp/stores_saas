/**
 * Authentication Middleware
 * Validates Clerk JWT tokens and attaches tenant context to requests
 */

import { Context, Next } from 'hono';
import { jwtVerify } from 'jose';
import type { Env, ClerkJWTPayload } from '../types';
import { TenantManager } from '../utils/tenant-manager';

export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({
      success: false,
      error: 'Unauthorized',
      message: 'Missing or invalid authorization header'
    }, 401);
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    // Verify Clerk JWT
    // Note: In production, you should verify against Clerk's JWKS
    // For now, we'll do basic JWT verification
    const clerkUserId = await verifyClerkToken(token, c.env);

    if (!clerkUserId) {
      return c.json({
        success: false,
        error: 'Unauthorized',
        message: 'Invalid token'
      }, 401);
    }

    // Get tenant - either from X-Tenant-ID header or from user's own tenant
    const tenantManager = new TenantManager(c.env);
    const requestedTenantId = c.req.header('X-Tenant-ID');

    let tenant = null;
    let userProfileId = null;
    let isTeamMember = false; // Flag to track if user is accessing as team member

    // If a specific tenant is requested, validate access
    if (requestedTenantId) {
      // Check if user is a team member of this tenant
      const teamMember = await c.env.DB
        .prepare(`
          SELECT tm.*, up.id as user_profile_id
          FROM team_members tm
          JOIN user_profiles up ON up.id = tm.owner_id
          WHERE tm.clerk_user_id = ?
            AND tm.owner_id = ?
            AND tm.status = 'active'
            AND tm.invitation_status = 'accepted'
        `)
        .bind(clerkUserId, requestedTenantId)
        .first<any>();

      if (teamMember) {
        // User is a team member - load the owner's tenant
        // The tenant system uses user_profile.id as tenant_id
        isTeamMember = true;
        tenant = await tenantManager.getTenantById(requestedTenantId);
        if (!tenant) {
          // If tenant doesn't exist in TENANTS_DB, create a minimal one
          // This is for compatibility with the user_profiles-based system
          tenant = {
            id: requestedTenantId,
            clerkUserId: '', // Will be filled from user_profile
            email: '',
            databaseName: 'shared',
            databaseId: 'shared',
            subscriptionStatus: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        }
        userProfileId = requestedTenantId; // This is the OWNER's profile ID
      } else {
        // Check if user is the owner of this tenant
        const ownerProfile = await c.env.DB
          .prepare('SELECT id FROM user_profiles WHERE clerk_user_id = ? AND id = ?')
          .bind(clerkUserId, requestedTenantId)
          .first<{ id: string }>();

        if (ownerProfile) {
          tenant = await tenantManager.getTenantByClerkId(clerkUserId);
          userProfileId = ownerProfile.id;
        } else {
          // Verificar si es superadmin — los superadmins pueden acceder a cualquier tenant
          const superAdminProfile = await c.env.DB
            .prepare('SELECT id FROM user_profiles WHERE clerk_user_id = ? AND is_superadmin = 1')
            .bind(clerkUserId)
            .first<{ id: string }>();

          if (superAdminProfile) {
            // Superadmin accede con su propio tenant context
            userProfileId = superAdminProfile.id;
            tenant = await tenantManager.getTenantByClerkId(clerkUserId);
          } else {
            return c.json({
              success: false,
              error: 'Access denied to requested tenant',
              message: 'You do not have access to this store'
            }, 403);
          }
        }
      }
    } else {
      // No specific tenant requested - check if user is a team member first
      console.log('🔍 [authMiddleware] No X-Tenant-ID provided, checking if user is team member...');

      const teamMembership = await c.env.DB
        .prepare(`
          SELECT tm.*, up.id as owner_profile_id, up.store_name
          FROM team_members tm
          JOIN user_profiles up ON up.id = tm.owner_id
          WHERE tm.clerk_user_id = ?
            AND tm.status = 'active'
            AND tm.invitation_status = 'accepted'
          LIMIT 1
        `)
        .bind(clerkUserId)
        .first<any>();

      if (teamMembership) {
        console.log('👥 [authMiddleware] Usuario es team member de:', teamMembership.store_name);
        // User is a team member - use the owner's tenant
        isTeamMember = true;
        userProfileId = teamMembership.owner_profile_id;
        tenant = await tenantManager.getTenantById(userProfileId);

        if (!tenant) {
          // Create minimal tenant object
          tenant = {
            id: userProfileId,
            clerkUserId: '',
            email: '',
            databaseName: 'shared',
            databaseId: 'shared',
            subscriptionStatus: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
        }
      } else {
        console.log('👑 [authMiddleware] Usuario no es team member, buscando su propio tenant...');
        // No specific tenant requested - use user's own tenant
        tenant = await tenantManager.getTenantByClerkId(clerkUserId);
      }
    }

    // Fetch Clerk user data once to use for both tenant and user_profile creation
    let clerkUser = null;
    let userEmail = '';
    if (!tenant) {
      const clerkSecretKey = c.env.CLERK_SECRET_KEY;
      if (clerkSecretKey) {
        const { fetchClerkUser, getClerkUserEmail } = await import('../utils/clerk-helpers');
        clerkUser = await fetchClerkUser(clerkUserId, clerkSecretKey);
        userEmail = getClerkUserEmail(clerkUser, clerkUserId);
      } else {
        userEmail = `user_${clerkUserId}@placeholder.com`;
      }
    }

    if (!tenant) {
      // Auto-create tenant on first API call
      try {
        const { generateTenantId } = await import('../utils/tenant-manager');
        console.log('Creating tenant for clerk_user_id:', clerkUserId, 'email:', userEmail);
        tenant = await tenantManager.createTenant(
          generateTenantId(),
          clerkUserId,
          userEmail
        );
      } catch (error) {
        console.error('Error creating tenant:', error);
        return c.json({
          success: false,
          error: 'Failed to create tenant',
          message: error instanceof Error ? error.message : 'Unknown error'
        }, 500);
      }
    }

    // Check subscription status (skip for superadmin)
    // Super admins are checked later after getting user_profile
    // if (tenant.subscriptionStatus === 'expired' || tenant.subscriptionStatus === 'canceled') {
    //   return c.json({
    //     success: false,
    //     error: 'Subscription required',
    //     message: 'Your subscription has expired. Please renew to continue.'
    //   }, 402); // Payment Required
    // }

    // IMPORTANT: Get user_profile.id to use as tenant_id for FK constraints
    // The products table has FK to user_profiles, not to tenants table
    let userProfile = null;

    if (userProfileId) {
      // We already have the userProfileId from tenant selection logic
      userProfile = await c.env.DB
        .prepare('SELECT id, is_superadmin, subscription_status FROM user_profiles WHERE id = ?')
        .bind(userProfileId)
        .first<{ id: string; is_superadmin: number; subscription_status: string }>();
    } else {
      // Fallback to clerk_user_id lookup
      userProfile = await c.env.DB
        .prepare('SELECT id, is_superadmin, subscription_status FROM user_profiles WHERE clerk_user_id = ?')
        .bind(clerkUserId)
        .first<{ id: string; is_superadmin: number; subscription_status: string }>();
    }

    if (!userProfile) {
      // Auto-create user profile on first API call
      try {
        // Fetch real user data from Clerk API if not already fetched
        if (!clerkUser) {
          const clerkSecretKey = c.env.CLERK_SECRET_KEY;
          if (clerkSecretKey) {
            const { fetchClerkUser, getClerkUserEmail } = await import('../utils/clerk-helpers');
            clerkUser = await fetchClerkUser(clerkUserId, clerkSecretKey);

            // Si Clerk no encuentra el usuario, rechazar la petición
            if (!clerkUser) {
              return c.json({
                success: false,
                error: 'Unauthorized',
                message: 'User not found in authentication provider'
              }, 401);
            }

            userEmail = getClerkUserEmail(clerkUser, clerkUserId);
          } else {
            console.warn('CLERK_SECRET_KEY not configured, using placeholder email');
            userEmail = `user_${clerkUserId}@placeholder.com`;
          }
        }

        // ⚠️ VALIDACIÓN: Verificar si ya existe un perfil con este email
        const existingProfileByEmail = await c.env.DB
          .prepare('SELECT id, clerk_user_id, email, is_superadmin, subscription_status FROM user_profiles WHERE email = ?')
          .bind(userEmail)
          .first<{ id: string; clerk_user_id: string; email: string; is_superadmin: number; subscription_status: string }>();

        if (existingProfileByEmail) {
          console.warn('⚠️ Email already exists in database:', userEmail, 'for clerk_user_id:', existingProfileByEmail.clerk_user_id);
          console.warn('Current clerk_user_id trying to register:', clerkUserId);

          // Si es el mismo clerk_user_id, solo retornar el perfil existente
          if (existingProfileByEmail.clerk_user_id === clerkUserId) {
            console.log('✅ Same clerk_user_id, returning existing profile');
            userProfile = {
              id: existingProfileByEmail.id,
              is_superadmin: existingProfileByEmail.is_superadmin,
              subscription_status: existingProfileByEmail.subscription_status
            };
          } else {
            // Email duplicado con diferente clerk_user_id - NO PERMITIR
            return c.json({
              success: false,
              error: 'Email already registered',
              message: `The email ${userEmail} is already associated with another account. Please use a different email or contact support.`
            }, 409); // Conflict
          }
        } else {
          // No existe perfil con este email, crear uno nuevo
          const { getClerkUserFullName } = await import('../utils/clerk-helpers');
          const fullName = getClerkUserFullName(clerkUser);
          const superAdminEmail = 'admin@neurai.dev';
          const isSuperAdmin = userEmail === superAdminEmail;

          console.log('Creating user_profile for clerk_user_id:', clerkUserId, 'email:', userEmail, 'name:', fullName);

          const profileId = `usr_${Date.now()}_${Math.random().toString(36).substring(7)}`;
          const now = new Date().toISOString();
          const trialEnd = new Date();
          trialEnd.setDate(trialEnd.getDate() + 30);

          await c.env.DB.prepare(
            `INSERT INTO user_profiles (
              id, clerk_user_id, email, role, full_name, is_superadmin,
              subscription_status, trial_start_date, trial_end_date, created_at, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          ).bind(
            profileId,
            clerkUserId,
            userEmail,
            'admin',
            fullName,
            isSuperAdmin ? 1 : 0,
            isSuperAdmin ? 'active' : 'trial',
            isSuperAdmin ? null : now,
            isSuperAdmin ? null : trialEnd.toISOString(),
            now,
            now
          ).run();

          console.log('User profile created successfully:', profileId);
          userProfile = {
            id: profileId,
            is_superadmin: isSuperAdmin ? 1 : 0,
            subscription_status: isSuperAdmin ? 'active' : 'trial'
          };
        }
      } catch (error) {
        console.error('Error creating user_profile:', error);
        return c.json({
          success: false,
          error: 'Failed to create user profile',
          message: error instanceof Error ? error.message : 'Unknown error'
        }, 500);
      }
    }

    // Override tenant.id with user_profile.id for FK compatibility
    tenant.id = userProfile.id;
    // Ensure clerk_user_id is available in tenant object (for user-profiles endpoint)
    (tenant as any).clerk_user_id = clerkUserId;
    // Attach is_superadmin flag to tenant object
    (tenant as any).is_superadmin = userProfile.is_superadmin === 1;

    // Check subscription status (skip for superadmin and team members)
    // Team members don't need their own subscription - they use the owner's subscription
    if (userProfile.is_superadmin !== 1 && !isTeamMember) {
      const userSubscriptionStatus = userProfile.subscription_status;
      if (userSubscriptionStatus === 'expired' || userSubscriptionStatus === 'canceled') {
        return c.json({
          success: false,
          error: 'Subscription required',
          message: 'Your subscription has expired. Please renew to continue.'
        }, 402); // Payment Required
      }
    }

    // If user is a team member, verify the OWNER's subscription instead
    if (isTeamMember && userProfileId) {
      const ownerProfile = await c.env.DB
        .prepare('SELECT subscription_status FROM user_profiles WHERE id = ?')
        .bind(userProfileId)
        .first<{ subscription_status: string }>();

      if (ownerProfile) {
        const ownerSubscriptionStatus = ownerProfile.subscription_status;
        if (ownerSubscriptionStatus === 'expired' || ownerSubscriptionStatus === 'canceled') {
          return c.json({
            success: false,
            error: 'Store subscription expired',
            message: 'The store owner\'s subscription has expired. Please contact the store owner.'
          }, 402); // Payment Required
        }
      }
    }

    // Attach tenant to context
    c.set('tenant', tenant);
    c.set('clerkUserId', clerkUserId);
    c.set('userProfileId', userProfile.id);

    await next();
  } catch (error) {
    console.error('Auth error:', error);
    return c.json({
      success: false,
      error: 'Unauthorized',
      message: 'Token verification failed'
    }, 401);
  }
}

// Re-export helper function
export { decodeClerkToken } from './auth-helpers';

/**
 * Verify Clerk JWT token
 * Returns Clerk user ID if valid, null otherwise
 */
async function verifyClerkToken(token: string, env: Env): Promise<string | null> {
  try {
    // For Clerk, we need to verify using their JWKS
    // This is a simplified version - in production use Clerk's verification

    // Decode without verification first (for development)
    const { decodeClerkToken: decode } = await import('./auth-helpers');
    const payload = await decode(token);

    // In production, uncomment this and use proper verification:
    /*
    const JWKS = createRemoteJWKSet(
      new URL(`https://${CLERK_FRONTEND_API}/.well-known/jwks.json`)
    );

    const { payload } = await jwtVerify(token, JWKS, {
      issuer: `https://${CLERK_FRONTEND_API}`,
    });
    */

    return payload.sub || null;
  } catch (error) {
    console.error('Token verification error:', error);
    return null;
  }
}

/**
 * Middleware to check if user is admin
 */
export async function requireAdmin(c: Context<{ Bindings: Env }>, next: Next) {
  const tenant = c.get('tenant');

  if (!tenant) {
    return c.json({
      success: false,
      error: 'Forbidden',
      message: 'Admin access required'
    }, 403);
  }

  // Check if user has admin role in their user_profile
  // This would require querying the tenant's database
  // For now, we'll assume all tenant owners are admins

  await next();
}

/**
 * Optional middleware - check subscription for specific features
 */
export async function requireActiveSubscription(c: Context<{ Bindings: Env }>, next: Next) {
  const tenant = c.get('tenant');

  if (!tenant) {
    return c.json({
      success: false,
      error: 'Unauthorized'
    }, 401);
  }

  if (tenant.subscriptionStatus !== 'active' && tenant.subscriptionStatus !== 'trial') {
    return c.json({
      success: false,
      error: 'Subscription required',
      message: 'This feature requires an active subscription'
    }, 402);
  }

  await next();
}
