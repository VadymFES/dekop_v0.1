/**
 * Сторінка профілю адміністратора
 * Uses NEXT_PUBLIC_ADMIN_PATH_SECRET for admin path (Task 7)
 */

import { redirect } from 'next/navigation';
import { getCurrentAdmin } from '@/app/lib/admin-auth';
import { getAdminUrl } from '@/app/lib/admin-path';
import { db } from '@/app/lib/db';
import ProfileClient from './ProfileClient';

export default async function ProfilePage() {
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect(getAdminUrl('login'));
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
    redirect(getAdminUrl('login'));
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
