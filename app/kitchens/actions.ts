'use server';

import { z } from 'zod';
import { Resend } from 'resend';
import { db } from '@/app/lib/db';
import { rateLimit } from '@/app/lib/rate-limit';

const schema = z.object({
  lastName:   z.string().min(1, 'Введіть прізвище').max(100),
  firstName:  z.string().min(1, "Введіть ім'я").max(100),
  patronymic: z.string().max(100).optional(),
  phone:      z.string().min(10, 'Введіть коректний номер телефону').max(20),
  email:      z.string().email('Введіть коректний email'),
  region:     z.string().min(1, 'Введіть область').max(100),
  city:       z.string().min(1, 'Введіть місто').max(100),
  corpus:     z.string().max(60).optional(),
  worktop:    z.string().max(60).optional(),
  fittings:   z.string().max(60).optional(),
  colors:     z.string().max(200).optional(),
  appliances: z.string().max(200).optional(),
  comment:    z.string().max(1000).optional(),
});

export type KitchenOrderState = { success: boolean; error?: string } | null;

function esc(v: string) {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function row(label: string, value: string | undefined) {
  if (!value) return '';
  return `<tr><td style="padding:6px 12px 6px 0;font-weight:600;white-space:nowrap">${label}</td><td>${esc(value)}</td></tr>`;
}

export async function submitKitchenOrder(
  _prev: KitchenOrderState,
  formData: FormData,
): Promise<KitchenOrderState> {
  const phone = String(formData.get('phone') ?? '').slice(0, 20);
  const rl = await rateLimit(`kitchen-order:${phone}`, { limit: 3, windowSeconds: 3600 });
  if (!rl.success) return { success: false, error: 'Забагато спроб. Спробуйте через годину.' };

  if (formData.get('gdpr') !== 'on') {
    return { success: false, error: 'Необхідна згода на обробку персональних даних.' };
  }

  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Перевірте правильність заповнення форми.',
    };
  }

  const d = parsed.data;

  // Persist order to database so it is visible in the admin panel
  // regardless of whether the email send succeeds.
  try {
    await db.query`
      INSERT INTO kitchen_orders
        (last_name, first_name, patronymic, phone, email, region, city,
         corpus, worktop, fittings, colors, appliances, comment)
      VALUES
        (${d.lastName}, ${d.firstName}, ${d.patronymic ?? ''},
         ${d.phone}, ${d.email}, ${d.region}, ${d.city},
         ${d.corpus ?? ''}, ${d.worktop ?? ''}, ${d.fittings ?? ''},
         ${d.colors ?? ''}, ${d.appliances ?? ''}, ${d.comment ?? ''})
    `;
  } catch (dbErr) {
    console.error('kitchen_orders insert failed:', dbErr);
    return { success: false, error: 'Помилка збереження заявки. Спробуйте ще раз.' };
  }

  // Send notification email (best-effort — order is already saved)
  const adminEmail = process.env.NEXT_PUBLIC_COMPANY_EMAIL || 'info@dekop.com.ua';
  const from = process.env.RESEND_FROM_EMAIL || 'noreply@dekop.com.ua';
  const apiKey = process.env.RESEND_API_KEY;

  if (apiKey) {
    try {
      const resend = new Resend(apiKey);
      await resend.emails.send({
        from,
        to: adminEmail,
        subject: 'Нова заявка на виготовлення кухні',
        html: `
          <div style="font-family:Inter,Arial,sans-serif;max-width:600px;color:#160101">
            <h2 style="font-size:20px;font-weight:700;margin-bottom:16px">Нова заявка на кухню</h2>
            <table style="width:100%;border-collapse:collapse">
              ${row('Прізвище:', d.lastName)}
              ${row("Ім'я:", d.firstName)}
              ${row('По батькові:', d.patronymic)}
              ${row('Телефон:', d.phone)}
              ${row('Email:', d.email)}
              ${row('Область:', d.region)}
              ${row('Місто:', d.city)}
              ${row('Корпус:', d.corpus)}
              ${row('Робоча поверхня:', d.worktop)}
              ${row('Фурнітура:', d.fittings)}
              ${row('Кольори:', d.colors)}
              ${row('Прилади:', d.appliances)}
              ${row('Коментар:', d.comment)}
            </table>
          </div>
        `,
      });
    } catch (emailErr) {
      // Order is already saved — log but don't fail the response
      console.error('Kitchen order email failed:', emailErr);
    }
  }

  return { success: true };
}
