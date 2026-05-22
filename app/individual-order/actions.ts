'use server';

import { z } from 'zod';
import { put } from '@vercel/blob';
import { Resend } from 'resend';
import { db } from '@/app/lib/db';
import { rateLimit } from '@/app/lib/rate-limit';

const schema = z.object({
  lastName:     z.string().min(1, 'Введіть прізвище').max(100),
  firstName:    z.string().min(1, "Введіть ім'я").max(100),
  patronymic:   z.string().max(100).optional(),
  phone:        z.string().min(10, 'Введіть коректний номер телефону').max(20),
  email:        z.string().optional(),
  region:       z.string().min(1, 'Введіть область').max(100),
  city:         z.string().min(1, 'Введіть місто').max(100),
  productTypes: z.string().max(300).optional(),
  colors:       z.string().max(300).optional(),
  construction: z.string().max(60).optional(),
  comment:      z.string().max(1000).optional(),
});

export type IndividualOrderState = { success: boolean; error?: string } | null;

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

export async function submitIndividualOrder(
  _prev: IndividualOrderState,
  formData: FormData,
): Promise<IndividualOrderState> {
  const phone = String(formData.get('phone') ?? '').slice(0, 20);
  const rl = await rateLimit(`individual-order:${phone}`, { limit: 3, windowSeconds: 3600 });
  if (!rl.success) return { success: false, error: 'Забагато спроб. Спробуйте через годину.' };

  if (formData.get('gdpr') !== 'on') {
    return { success: false, error: 'Необхідна згода на обробку персональних даних.' };
  }

  // ── Image upload (optional, non-fatal) ──────────────────────────────────
  const imageFile = formData.get('image');
  let imageUrl = '';

  if (imageFile instanceof File && imageFile.size > 0) {
    const ALLOWED = ['image/jpeg', 'image/png', 'image/webp'];
    if (!ALLOWED.includes(imageFile.type)) {
      return { success: false, error: 'Непідтримуваний формат зображення. Дозволені: JPEG, PNG, WebP.' };
    }
    if (imageFile.size > 4 * 1024 * 1024) {
      return { success: false, error: 'Файл занадто великий. Максимум 4 МБ.' };
    }
    try {
      const ext = imageFile.name.split('.').pop()?.toLowerCase() || 'jpg';
      const filename = `individual-orders/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const blob = await put(filename, imageFile, { access: 'public', addRandomSuffix: false });
      imageUrl = blob.url;
    } catch (uploadErr) {
      console.error('Individual order image upload failed:', uploadErr);
    }
  }

  const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues[0]?.message ?? 'Перевірте правильність заповнення форми.',
    };
  }

  const d = parsed.data;

  try {
    await db.query`
      INSERT INTO individual_orders
        (last_name, first_name, patronymic, phone, email, region, city,
         product_types, colors, construction, image_url, comment)
      VALUES
        (${d.lastName}, ${d.firstName}, ${d.patronymic ?? ''},
         ${d.phone}, ${d.email ?? ''}, ${d.region}, ${d.city},
         ${d.productTypes ?? ''}, ${d.colors ?? ''}, ${d.construction ?? ''},
         ${imageUrl}, ${d.comment ?? ''})
    `;
  } catch (dbErr) {
    console.error('individual_orders insert failed:', dbErr);
    return { success: false, error: 'Помилка збереження заявки. Спробуйте ще раз.' };
  }

  const adminEmail = process.env.NEXT_PUBLIC_COMPANY_EMAIL || 'info@dekop.com.ua';
  const from = process.env.RESEND_FROM_EMAIL || 'noreply@dekop.com.ua';
  const apiKey = process.env.RESEND_API_KEY;

  if (apiKey) {
    try {
      const resend = new Resend(apiKey);
      await resend.emails.send({
        from,
        to: adminEmail,
        subject: 'Нова заявка на індивідуальне замовлення',
        html: `
          <div style="font-family:Inter,Arial,sans-serif;max-width:600px;color:#160101">
            <h2 style="font-size:20px;font-weight:700;margin-bottom:16px">Нова заявка на індивідуальне замовлення</h2>
            <table style="width:100%;border-collapse:collapse">
              ${row('Прізвище:', d.lastName)}
              ${row("Ім'я:", d.firstName)}
              ${row('По батькові:', d.patronymic)}
              ${row('Телефон:', d.phone)}
              ${row('Email:', d.email)}
              ${row('Область:', d.region)}
              ${row('Місто:', d.city)}
              ${row('Вид виробу:', d.productTypes)}
              ${row('Кольори:', d.colors)}
              ${row('Конструкція:', d.construction)}
              ${row('Коментар:', d.comment)}
            </table>
            ${imageUrl ? `<div style="margin-top:20px"><p style="font-weight:600;margin-bottom:8px">Фото:</p><img src="${imageUrl}" alt="Фото замовлення" style="max-width:100%;border-radius:6px"/></div>` : ''}
          </div>
        `,
      });
    } catch (emailErr) {
      console.error('Individual order email failed:', emailErr);
    }
  }

  return { success: true };
}
