'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getCsrfTokenFromCookie } from '../../components/CsrfProvider';
import { useAdminPath } from '../../components/AdminPathProvider';
import type { Customer } from '@/app/lib/definitions';
import styles from '../../styles/admin.module.css';

interface Props {
  customer: Customer;
}

export default function CustomerForm({ customer }: Props) {
  const router = useRouter();
  const adminPath = useAdminPath();

  const [form, setForm] = useState({
    first_name: customer.first_name ?? '',
    last_name: customer.last_name ?? '',
    phone: customer.phone ?? '',
    email: customer.email ?? '',
    customer_type: customer.customer_type ?? 'individual',
    company_name: customer.company_name ?? '',
    tax_id: customer.tax_id ?? '',
    is_vat_payer: customer.is_vat_payer ?? false,
    tags: (customer.tags ?? []).join(', '),
    notes: customer.notes ?? '',
    marketing_consent: customer.marketing_consent ?? false,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const set = (key: keyof typeof form, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const payload = {
      first_name: form.first_name || null,
      last_name: form.last_name || null,
      phone: form.phone,
      email: form.email || null,
      customer_type: form.customer_type,
      company_name: form.company_name || null,
      tax_id: form.tax_id || null,
      is_vat_payer: form.is_vat_payer,
      tags: form.tags.split(',').map((t) => t.trim()).filter(Boolean),
      notes: form.notes || null,
      marketing_consent: form.marketing_consent,
    };

    try {
      const csrfToken = getCsrfTokenFromCookie();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (csrfToken) headers['X-CSRF-Token'] = csrfToken;

      const res = await fetch(`${adminPath}/api/customers/${customer.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Помилка збереження');
      }
      setMessage({ type: 'ok', text: 'Збережено' });
      router.refresh();
    } catch (err) {
      setMessage({ type: 'err', text: err instanceof Error ? err.message : 'Помилка збереження' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ backgroundColor: 'white', border: '1px solid #ccc', padding: '20px' }}>
      <h2 style={{ fontSize: '18px', marginTop: 0, marginBottom: '16px' }}>Профіль клієнта</h2>

      <Field label="Ім'я">
        <input className={styles.inputSmall} value={form.first_name} onChange={(e) => set('first_name', e.target.value)} />
      </Field>
      <Field label="Прізвище">
        <input className={styles.inputSmall} value={form.last_name} onChange={(e) => set('last_name', e.target.value)} />
      </Field>
      <Field label="Телефон">
        <input className={styles.inputSmall} value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+380XXXXXXXXX" />
      </Field>
      <Field label="Email">
        <input className={styles.inputSmall} value={form.email} onChange={(e) => set('email', e.target.value)} />
      </Field>

      <Field label="Тип">
        <select className={styles.select} value={form.customer_type} onChange={(e) => set('customer_type', e.target.value)} style={{ padding: '10px 12px' }}>
          <option value="individual">Фізична особа</option>
          <option value="business">Бізнес</option>
        </select>
      </Field>

      {form.customer_type === 'business' && (
        <>
          <Field label="Назва компанії">
            <input className={styles.inputSmall} value={form.company_name} onChange={(e) => set('company_name', e.target.value)} />
          </Field>
          <Field label="ЄДРПОУ / ІПН">
            <input className={styles.inputSmall} value={form.tax_id} onChange={(e) => set('tax_id', e.target.value)} />
          </Field>
          <Field label="Платник ПДВ">
            <input type="checkbox" checked={form.is_vat_payer} onChange={(e) => set('is_vat_payer', e.target.checked)} />
          </Field>
        </>
      )}

      <Field label="Теги (через кому)">
        <input className={styles.inputSmall} value={form.tags} onChange={(e) => set('tags', e.target.value)} placeholder="опт, Київ, постійний" />
      </Field>
      <Field label="Нотатки">
        <textarea className={styles.inputSmall} value={form.notes} onChange={(e) => set('notes', e.target.value)} rows={4} style={{ resize: 'vertical' }} />
      </Field>
      <Field label="Згода на маркетинг">
        <input type="checkbox" checked={form.marketing_consent} onChange={(e) => set('marketing_consent', e.target.checked)} />
      </Field>

      {message && (
        <div className={message.type === 'ok' ? styles.success : styles.error} style={{ marginBottom: '12px' }}>
          {message.text}
        </div>
      )}

      <button type="submit" disabled={saving} style={{ padding: '10px 24px', backgroundColor: '#333', color: 'white', border: 'none', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1 }}>
        {saving ? 'Збереження...' : 'Зберегти'}
      </button>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <label className={styles.labelSmall} style={{ display: 'block', marginBottom: '4px' }}>{label}</label>
      {children}
    </div>
  );
}
