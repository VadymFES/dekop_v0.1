'use server';

import { Resend } from 'resend';
import { z } from 'zod';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { db } from '@/app/lib/db';
import { rateLimit } from '@/app/lib/rate-limit';

const emailSchema = z.string().email();

let resendClient: Resend | null = null;
function getResend(): Resend {
  if (!resendClient) resendClient = new Resend(process.env.RESEND_API_KEY);
  return resendClient;
}

export async function subscribeNotification(
  _prev: { success: boolean; error?: string } | null,
  formData: FormData
): Promise<{ success: boolean; error?: string }> {
  const raw = formData.get('email');

  // IP-based rate limit: 5 attempts per IP per hour (bot/abuse protection)
  const headersList = await headers();
  const ip =
    headersList.get('x-forwarded-for')?.split(',')[0].trim() ||
    headersList.get('x-real-ip') ||
    'unknown';
  const ipRl = await rateLimit(`subscribe-ip:${ip}`, { limit: 5, windowSeconds: 3600 });
  if (!ipRl.success) return { success: false, error: 'Забагато спроб. Спробуйте через годину.' };

  // Email-based rate limit: 3 attempts per email per hour
  const emailRl = await rateLimit(
    `subscribe:${String(raw).toLowerCase().slice(0, 254)}`,
    { limit: 3, windowSeconds: 3600 }
  );
  if (!emailRl.success) return { success: false, error: 'Забагато спроб. Спробуйте через годину.' };

  const parsed = emailSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: 'Введіть коректний email' };
  }
  const email = parsed.data.toLowerCase();

  // Check for duplicate before sending anything
  const existing = await db.query`
    SELECT 1 FROM newsletter_subscribers WHERE email = ${email}
  `;
  if (existing.rows.length > 0) {
    return { success: false, error: 'Цей email вже зареєстровано.' };
  }

  const resend = getResend();
  const from = process.env.RESEND_FROM_EMAIL || 'noreply@dekop.com.ua';
  const adminEmail = process.env.NEXT_PUBLIC_COMPANY_EMAIL || 'info@dekop.com.ua';

  // Insert subscriber — outside try/catch so redirect() is never swallowed
  await db.query`
    INSERT INTO newsletter_subscribers (email) VALUES (${email})
  `;

  try {
    const [adminResult, userResult] = await Promise.all([
      resend.emails.send({
        from,
        to: adminEmail,
        subject: 'Новий підписник — сповіщення про відкриття',
        html: `<p>Новий підписник на сповіщення про відкриття магазину:</p><p><strong>${email}</strong></p>`,
      }),
      resend.emails.send({
        from,
        to: email,
        subject: 'Ми вас сповістимо — онлайн-магазин меблів Dekop',
        html: `
          <div style="font-family:Inter,Arial,sans-serif;max-width:520px;margin:0 auto;color:#160101">
            <h2 style="font-size:22px;font-weight:700;margin-bottom:8px">Дякуємо!</h2>
            <p style="color:#555;line-height:1.6;margin-bottom:16px">
              Ви підписалися на сповіщення про відкриття магазину <strong>Dekop</strong>.
              Ми надішлемо вам листа, щойно магазин відкриється.
            </p>
            <p style="color:#aaa;font-size:13px">Якщо ви не підписувалися — просто ігноруйте цей лист.</p>
          </div>
        `,
      }),
    ]);

    // Resend v6 returns { data, error } instead of throwing — log failures so
    // they surface in Vercel Function Logs rather than being silently dropped.
    if (adminResult.error) {
      console.error('[coming-soon] admin notification failed:', adminResult.error);
    }
    if (userResult.error) {
      console.error('[coming-soon] user confirmation failed:', userResult.error);
    }
  } catch (err) {
    // Network-level failure — subscriber is already saved, so just log
    console.error('[coming-soon] email send threw:', err);
  }

  redirect('/coming-soon?subscribed=1');
}
