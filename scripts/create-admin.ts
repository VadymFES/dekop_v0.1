/**
 * Admin User Creation Script
 *
 * Usage:
 *   npx ts-node scripts/create-admin.ts <email> <password> [role]
 *
 * Example:
 *   npx ts-node scripts/create-admin.ts admin@example.com SecurePassword123 admin
 *
 * Roles:
 *   - admin: Full system access
 *   - manager: Limited access (orders, products read/update)
 */

import { sql } from '@vercel/postgres';
import bcrypt from 'bcryptjs';

const BCRYPT_ROUNDS = 12;

async function createAdmin(email: string, password: string, roleName: string = 'admin') {
  try {
    console.log('Creating admin user...');
    console.log(`Email: ${email}`);
    console.log(`Role: ${roleName}`);

    // Validate email format
    const emailRegex = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$/;
    if (!emailRegex.test(email)) {
      throw new Error('Invalid email format');
    }

    // Validate password strength
    if (password.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    // Check if user already exists
    const existingUser = await sql`
      SELECT id FROM admin_users WHERE email = ${email.toLowerCase()}
    `;

    if (existingUser.rows.length > 0) {
      throw new Error(`User with email ${email} already exists`);
    }

    // Get role
    const roleResult = await sql`
      SELECT id FROM admin_roles WHERE name = ${roleName}
    `;

    if (roleResult.rows.length === 0) {
      throw new Error(`Role "${roleName}" not found. Available roles: admin, manager`);
    }

    const roleId = roleResult.rows[0].id;

    // Hash password
    console.log('Hashing password...');
    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    // Create user
    console.log('Creating user in database...');
    const userResult = await sql`
      INSERT INTO admin_users (email, password_hash, is_active, email_verified)
      VALUES (${email.toLowerCase()}, ${passwordHash}, true, true)
      RETURNING id, email
    `;

    const userId = userResult.rows[0].id;

    // Assign role
    console.log('Assigning role...');
    await sql`
      INSERT INTO admin_user_roles (user_id, role_id)
      VALUES (${userId}, ${roleId})
    `;

    // Store initial password in history
    await sql`
      INSERT INTO admin_password_history (user_id, password_hash, change_reason)
      VALUES (${userId}, ${passwordHash}, 'initial')
    `;

    console.log('\n✅ Admin user created successfully!');
    console.log('================================');
    console.log(`Email: ${email}`);
    console.log(`Role: ${roleName}`);
    console.log(`User ID: ${userId}`);
    console.log('================================');
    console.log('\nYou can now login at: /admin-secret-2024/login');

  } catch (error) {
    console.error('\n❌ Error creating admin user:');
    console.error(error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length < 2) {
  console.log('Usage: npx ts-node scripts/create-admin.ts <email> <password> [role]');
  console.log('');
  console.log('Arguments:');
  console.log('  email     Required. Admin email address');
  console.log('  password  Required. Password (min 8 characters)');
  console.log('  role      Optional. "admin" (default) or "manager"');
  console.log('');
  console.log('Example:');
  console.log('  npx ts-node scripts/create-admin.ts admin@example.com MySecurePass123');
  process.exit(1);
}

const [email, password, role = 'admin'] = args;

createAdmin(email, password, role).then(() => {
  process.exit(0);
});
