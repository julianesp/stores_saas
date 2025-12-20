/**
 * Script to update user profiles with real data from Clerk API
 *
 * This script finds all users with placeholder emails and updates them
 * with real data from Clerk.
 *
 * Usage: node scripts/update-user-data-from-clerk.js
 */

import { spawn } from 'child_process';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env.local
function loadEnvFile(filePath) {
  const envContent = readFileSync(filePath, 'utf8');
  const envVars = {};

  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        envVars[key.trim()] = valueParts.join('=').trim();
      }
    }
  });

  return envVars;
}

const envVars = loadEnvFile(path.join(__dirname, '..', '.env.local'));
const CLERK_SECRET_KEY = envVars.CLERK_SECRET_KEY || process.env.CLERK_SECRET_KEY;

if (!CLERK_SECRET_KEY) {
  console.error('Error: CLERK_SECRET_KEY not found in environment variables');
  process.exit(1);
}

/**
 * Execute a D1 query using wrangler
 */
async function executeD1Query(query) {
  return new Promise((resolve, reject) => {
    const wrangler = spawn(
      'wrangler',
      [
        'd1',
        'execute',
        'tienda-pos-shared',
        '--remote',
        '--json',
        '--command',
        query,
      ],
      {
        cwd: path.join(__dirname, '..', 'cloudflare-migration'),
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    );

    let stdout = '';
    let stderr = '';

    wrangler.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    wrangler.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    wrangler.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`Wrangler command failed: ${stderr}`));
        return;
      }

      try {
        // Parse the JSON output from wrangler
        const lines = stdout.split('\n');
        let jsonOutput = null;

        for (const line of lines) {
          if (line.trim().startsWith('[') || line.trim().startsWith('{')) {
            try {
              jsonOutput = JSON.parse(line);
              break;
            } catch (e) {
              // Continue to next line
            }
          }
        }

        if (!jsonOutput) {
          // Try parsing the entire output
          jsonOutput = JSON.parse(stdout);
        }

        resolve(jsonOutput);
      } catch (error) {
        reject(new Error(`Failed to parse JSON: ${error.message}\nOutput: ${stdout}`));
      }
    });
  });
}

/**
 * Fetch user data from Clerk API
 */
async function fetchClerkUser(clerkUserId) {
  try {
    const response = await fetch(`https://api.clerk.com/v1/users/${clerkUserId}`, {
      headers: {
        'Authorization': `Bearer ${CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch Clerk user ${clerkUserId}: ${response.status} ${response.statusText}`);
      return null;
    }

    return await response.json();
  } catch (error) {
    console.error(`Error fetching Clerk user ${clerkUserId}:`, error);
    return null;
  }
}

/**
 * Get email from Clerk user data
 */
function getClerkUserEmail(user, clerkUserId) {
  if (!user || !user.email_addresses || user.email_addresses.length === 0) {
    return `user_${clerkUserId}@placeholder.com`;
  }
  return user.email_addresses[0].email_address;
}

/**
 * Get full name from Clerk user data
 */
function getClerkUserFullName(user) {
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

/**
 * Main function
 */
async function main() {
  console.log('🔍 Finding users with placeholder emails...\n');

  // Find all users with placeholder emails
  const result = await executeD1Query(
    `SELECT id, clerk_user_id, email, full_name
     FROM user_profiles
     WHERE email LIKE '%@placeholder.com'
     AND is_superadmin = 0`
  );

  const users = result[0]?.results || [];

  if (users.length === 0) {
    console.log('✅ No users found with placeholder emails. All data is up to date!');
    return;
  }

  console.log(`Found ${users.length} users with placeholder data:\n`);

  let updated = 0;
  let failed = 0;
  let skipped = 0;

  for (const user of users) {
    console.log(`📝 Processing: ${user.email} (${user.full_name})`);

    // Fetch real data from Clerk
    const clerkUser = await fetchClerkUser(user.clerk_user_id);

    if (!clerkUser) {
      console.log(`   ⚠️  Failed to fetch Clerk data - skipping`);
      failed++;
      continue;
    }

    const newEmail = getClerkUserEmail(clerkUser, user.clerk_user_id);
    const newFullName = getClerkUserFullName(clerkUser);

    // Check if email is still a placeholder
    if (newEmail.includes('@placeholder.com')) {
      console.log(`   ⚠️  Clerk user has no email - skipping`);
      skipped++;
      continue;
    }

    console.log(`   ✓ Found real data: ${newEmail} - ${newFullName}`);

    // Update the database
    try {
      await executeD1Query(
        `UPDATE user_profiles
         SET email = '${newEmail.replace(/'/g, "''")}',
             full_name = '${newFullName.replace(/'/g, "''")}',
             updated_at = '${new Date().toISOString()}'
         WHERE id = '${user.id}'`
      );

      console.log(`   ✅ Updated successfully\n`);
      updated++;
    } catch (error) {
      console.log(`   ❌ Failed to update: ${error.message}\n`);
      failed++;
    }

    // Add a small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  console.log('\n' + '='.repeat(50));
  console.log('Summary:');
  console.log(`  ✅ Updated: ${updated}`);
  console.log(`  ⚠️  Skipped: ${skipped}`);
  console.log(`  ❌ Failed: ${failed}`);
  console.log('='.repeat(50));
}

// Run the script
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
