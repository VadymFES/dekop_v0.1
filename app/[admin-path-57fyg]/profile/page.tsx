/**
 * Сторінка профілю адміністратора
 */

import { redirect } from 'next/navigation';
import { getCurrentAdmin } from '@/app/lib/admin-auth';
import { db } from '@/app/lib/db';
import ProfileClient from './ProfileClient';

export default async function ProfilePage() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect('/admin-secret-2024/login');
  }

  // Get full profile data
  const profileResult = await db.query`
    SELECT
      id, email, first_name, last_name,
      created_at, last_login_at, last_login_ip
    FROM admin_users
    WHERE id = ${admin.id}
  `;

  if (profileResult.rows.length === 0) {
    redirect('/admin-secret-2024/login');
  }

  const profile = {
    ...profileResult.rows[0],
    roles: admin.roles,
  };

  return (
    <div>
      <h1 style={{ fontSize: '24px', marginBottom: '30px' }}>Профіль</h1>
      <ProfileClient profile={profile} />
    </div>
  );
}
