import { redirect } from 'next/navigation';
import { getCurrentAdmin } from '@/app/lib/admin-auth';
import { getAdminUrl } from '@/app/lib/admin-path';
import KitchensAdmin from './KitchensAdmin';

export default async function AdminKitchensPage() {
  const admin = await getCurrentAdmin();
  if (!admin) redirect(getAdminUrl('login'));

  return (
    <div>
      <h1 style={{ fontSize: '24px', marginBottom: '24px' }}>Кухні — керування контентом</h1>
      <KitchensAdmin />
    </div>
  );
}
