'use client';

import { useState, useEffect, useCallback, useRef, Fragment } from 'react';
import Image from 'next/image';
import { useCsrf } from '../components/CsrfProvider';
import styles from '../styles/admin.module.css';

const ADMIN_PATH = process.env.NEXT_PUBLIC_ADMIN_PATH_SECRET ?? '';

// ─── types ────────────────────────────────────────────────────────────────────

interface KitchenCard {
  id: number; name: string; description: string;
  price: number; image_url: string; sort_order: number;
}

interface GalleryImage {
  id: number; image_url: string; alt: string; sort_order: number;
}

interface KitchenOrder {
  id: number;
  last_name: string; first_name: string; patronymic: string;
  phone: string; email: string; region: string; city: string;
  corpus: string; worktop: string; fittings: string;
  colors: string; appliances: string; comment: string;
  status: 'new' | 'in_progress' | 'done' | 'cancelled';
  created_at: string;
}

type Tab = 'cards' | 'gallery' | 'orders';

const emptyForm = (): Omit<KitchenCard, 'id'> => ({
  name: '', description: '', price: 0, image_url: '', sort_order: 0,
});

const STATUS_LABELS: Record<string, string> = {
  new: 'Нова',
  in_progress: 'В роботі',
  done: 'Виконано',
  cancelled: 'Скасовано',
};

const STATUS_COLORS: Record<string, string> = {
  new: '#ff9800',
  in_progress: '#2196f3',
  done: '#4caf50',
  cancelled: '#f44336',
};

// ─── helpers ──────────────────────────────────────────────────────────────────

function apiUrl(path: string) {
  return `${window.location.origin}/${ADMIN_PATH}/api/kitchens${path}`;
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleString('uk-UA', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

// ─── component ────────────────────────────────────────────────────────────────

export default function KitchensAdmin() {
  const { getCsrfHeaders } = useCsrf();

  function authHeaders() {
    return { 'Content-Type': 'application/json', ...getCsrfHeaders() };
  }

  const [tab, setTab] = useState<Tab>('orders');

  // data
  const [cards, setCards] = useState<KitchenCard[]>([]);
  const [gallery, setGallery] = useState<GalleryImage[]>([]);
  const [orders, setOrders] = useState<KitchenOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  // card form
  const [showForm, setShowForm] = useState(false);
  const [editCard, setEditCard] = useState<KitchenCard | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  // gallery
  const galleryRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  // expanded order row
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);

  // ── load ──
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [contentRes, ordersRes] = await Promise.all([
        fetch(apiUrl(''), { credentials: 'include' }),
        fetch(apiUrl('/orders'), { credentials: 'include' }),
      ]);
      const content = await contentRes.json();
      const ordersData = await ordersRes.json();
      setCards(content.cards ?? []);
      setGallery(content.gallery ?? []);
      setOrders(ordersData.orders ?? []);
    } catch {
      setPageError('Не вдалося завантажити дані.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ── card helpers ──
  function openAdd() { setEditCard(null); setForm(emptyForm()); setFormError(''); setShowForm(true); }
  function openEdit(c: KitchenCard) {
    setEditCard(c);
    setForm({ name: c.name, description: c.description, price: c.price, image_url: c.image_url, sort_order: c.sort_order });
    setFormError(''); setShowForm(true);
  }
  function cancelForm() { setShowForm(false); setEditCard(null); setForm(emptyForm()); setFormError(''); }

  async function uploadImage(file: File): Promise<string | null> {
    const fd = new FormData();
    fd.append('file', file);
    const r = await fetch(`${window.location.origin}/api/upload`, { method: 'POST', body: fd, credentials: 'include' });
    if (!r.ok) return null;
    return (await r.json()).url ?? null;
  }

  async function onCardImage(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadImage(file);
    if (url) setForm(f => ({ ...f, image_url: url }));
    e.target.value = '';
  }

  async function saveCard() {
    if (!form.name.trim()) { setFormError("Назва обов'язкова"); return; }
    setSaving(true); setFormError('');
    try {
      const url = editCard ? apiUrl(`/cards/${editCard.id}`) : apiUrl('/cards');
      const r = await fetch(url, { method: editCard ? 'PUT' : 'POST', headers: authHeaders(), credentials: 'include', body: JSON.stringify(form) });
      if (!r.ok) { const d = await r.json(); setFormError(d.error ?? 'Помилка'); return; }
      await loadData(); cancelForm();
    } catch { setFormError('Помилка мережі'); }
    finally { setSaving(false); }
  }

  async function deleteCard(id: number) {
    if (!confirm('Видалити картку?')) return;
    try {
      await fetch(apiUrl(`/cards/${id}`), { method: 'DELETE', headers: authHeaders(), credentials: 'include' });
      setCards(p => p.filter(c => c.id !== id));
    } catch { alert('Помилка видалення'); }
  }

  // ── gallery helpers ──
  async function onGalleryFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    try {
      for (const file of files) {
        const url = await uploadImage(file);
        if (!url) continue;
        await fetch(apiUrl('/gallery'), {
          method: 'POST', headers: authHeaders(), credentials: 'include',
          body: JSON.stringify({ image_url: url, alt: file.name.replace(/\.[^/.]+$/, ''), sort_order: 0 }),
        });
      }
      await loadData();
    } catch { alert('Помилка завантаження'); }
    finally { setUploading(false); if (e.target) e.target.value = ''; }
  }

  async function deleteGallery(id: number) {
    if (!confirm('Видалити фото?')) return;
    try {
      await fetch(apiUrl(`/gallery/${id}`), { method: 'DELETE', headers: authHeaders(), credentials: 'include' });
      setGallery(p => p.filter(g => g.id !== id));
    } catch { alert('Помилка видалення'); }
  }

  // ── order status ──
  async function updateStatus(id: number, status: string) {
    try {
      const r = await fetch(apiUrl(`/orders/${id}`), {
        method: 'PATCH', headers: authHeaders(), credentials: 'include',
        body: JSON.stringify({ status }),
      });
      if (!r.ok) return;
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status: status as KitchenOrder['status'] } : o));
    } catch { alert('Помилка оновлення статусу'); }
  }

  // ── render ────────────────────────────────────────────────────────────────

  if (loading) return <p style={{ color: '#666', fontSize: 14 }}>Завантаження...</p>;
  if (pageError) return <div className={styles.error}>{pageError}</div>;

  const newOrdersCount = orders.filter(o => o.status === 'new').length;

  return (
    <div>
      {/* ── Tab bar ── */}
      <div style={{ display: 'flex', borderBottom: '2px solid #ddd', marginBottom: 24 }}>
        {(['orders', 'cards', 'gallery'] as Tab[]).map(t => {
          const label = t === 'orders'
            ? `Замовлення (${orders.length}${newOrdersCount > 0 ? ` · ${newOrdersCount} нових` : ''})`
            : t === 'cards' ? `Картки каруселі (${cards.length})`
            : `Галерея (${gallery.length})`;
          return (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                padding: '10px 20px', fontSize: 14, fontWeight: 600,
                fontFamily: 'inherit', cursor: 'pointer', border: 'none',
                borderBottom: tab === t ? '2px solid #333' : '2px solid transparent',
                marginBottom: -2, background: 'none',
                color: tab === t ? '#333' : '#888',
                transition: 'color 0.15s',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {/* ════ ORDERS TAB ════ */}
      {tab === 'orders' && (
        <div>
          <p style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>
            Заявки надходять з форми на сторінці Кухні. Змінюйте статус для відстеження роботи.
          </p>

          {orders.length === 0 ? (
            <div className={styles.card}>
              <p className={styles.emptyText}>Поки немає заявок.</p>
            </div>
          ) : (
            <div className={styles.cardNoPadding}>
              <table className={styles.table}>
                <thead className={styles.tableHeader}>
                  <tr>
                    <th className={styles.th}>Дата</th>
                    <th className={styles.th}>Клієнт</th>
                    <th className={styles.th}>Контакти</th>
                    <th className={styles.th}>Місто</th>
                    <th className={styles.th}>Матеріали</th>
                    <th className={styles.th} style={{ width: 150 }}>Статус</th>
                    <th className={styles.th} style={{ width: 40 }}></th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map(order => (
                    <Fragment key={order.id}>
                      <tr
                        style={{ cursor: 'pointer', background: expandedOrder === order.id ? '#f9f9f9' : undefined }}
                        onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                      >
                        <td className={styles.tdSmall}>{fmtDate(order.created_at)}</td>
                        <td className={styles.td}>
                          <strong>{order.last_name} {order.first_name}</strong>
                          {order.patronymic && <div className={styles.slugText}>{order.patronymic}</div>}
                        </td>
                        <td className={styles.td}>
                          <div>{order.phone}</div>
                          <div className={styles.slugText}>{order.email}</div>
                        </td>
                        <td className={styles.tdSmall}>{[order.city, order.region].filter(Boolean).join(', ')}</td>
                        <td className={styles.tdSmall}>
                          {[order.corpus, order.worktop, order.fittings].filter(Boolean).join(' / ') || '—'}
                        </td>
                        <td className={styles.td} onClick={e => e.stopPropagation()}>
                          <select
                            value={order.status}
                            onChange={e => updateStatus(order.id, e.target.value)}
                            style={{
                              padding: '5px 8px', border: '1px solid #ddd', borderRadius: 4,
                              fontSize: 13, fontFamily: 'inherit', cursor: 'pointer',
                              color: STATUS_COLORS[order.status],
                              fontWeight: 600,
                            }}
                          >
                            {Object.entries(STATUS_LABELS).map(([val, lbl]) => (
                              <option key={val} value={val}>{lbl}</option>
                            ))}
                          </select>
                        </td>
                        <td className={styles.tdCenter} style={{ color: '#aaa', fontSize: 18 }}>
                          {expandedOrder === order.id ? '▲' : '▼'}
                        </td>
                      </tr>

                      {expandedOrder === order.id && (
                        <tr>
                          <td colSpan={7} style={{ padding: '12px 16px', background: '#f9f9f9', borderBottom: '1px solid #eee' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px 24px', fontSize: 13 }}>
                              {order.colors && (
                                <div><span style={{ fontWeight: 600 }}>Кольори: </span>{order.colors}</div>
                              )}
                              {order.appliances && (
                                <div><span style={{ fontWeight: 600 }}>Прилади: </span>{order.appliances}</div>
                              )}
                              {order.comment && (
                                <div style={{ gridColumn: '1 / -1' }}><span style={{ fontWeight: 600 }}>Коментар: </span>{order.comment}</div>
                              )}
                              {!order.colors && !order.appliances && !order.comment && (
                                <span className={styles.emptyText}>Додаткових даних немає</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ════ CARDS TAB ════ */}
      {tab === 'cards' && (
        <div>
          <div className={styles.pageHeader} style={{ marginBottom: 20 }}>
            <p style={{ margin: 0, fontSize: 14, color: '#666' }}>
              Картки відображаються в каруселі на сторінці Кухні
            </p>
            {!showForm && (
              <button className={styles.buttonPrimary} onClick={openAdd}>+ Додати картку</button>
            )}
          </div>

          {showForm && (
            <div className={styles.section} style={{ marginBottom: 24 }}>
              <h3 className={styles.sectionTitle}>{editCard ? 'Редагувати картку' : 'Нова картка'}</h3>

              <div className={styles.grid2} style={{ marginBottom: 16 }}>
                <div>
                  <label className={styles.label}>Назва *</label>
                  <input className={styles.input} value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Назва кухні" />
                </div>
                <div>
                  <label className={styles.label}>Ціна (грн)</label>
                  <input className={styles.input} type="number" min={0} value={form.price}
                    onChange={e => setForm(f => ({ ...f, price: parseInt(e.target.value) || 0 }))} />
                </div>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label className={styles.label}>Опис</label>
                <textarea className={styles.textarea} value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Короткий опис кухні" style={{ minHeight: 80 }} />
              </div>

              <div className={styles.grid2} style={{ marginBottom: 16 }}>
                <div>
                  <label className={styles.label}>Зображення картки</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                    {form.image_url && (
                      <Image src={form.image_url} alt="preview" width={64} height={64}
                        style={{ objectFit: 'cover', borderRadius: 4, border: '1px solid #ddd' }} unoptimized />
                    )}
                    <label style={{ display: 'inline-block', padding: '10px 16px', background: '#f5f5f5', border: '1px solid #ccc', borderRadius: 4, fontSize: 14, cursor: 'pointer' }}>
                      {form.image_url ? 'Замінити фото' : 'Обрати фото'}
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={onCardImage} />
                    </label>
                    {form.image_url && (
                      <button type="button" onClick={() => setForm(f => ({ ...f, image_url: '' }))}
                        className={styles.linkDanger} style={{ fontSize: 13 }}>Видалити фото</button>
                    )}
                  </div>
                </div>
                <div>
                  <label className={styles.label}>Порядок сортування</label>
                  <input className={styles.input} type="number" min={0} value={form.sort_order}
                    onChange={e => setForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} />
                </div>
              </div>

              {formError && <div className={styles.error} style={{ marginBottom: 12 }}>{formError}</div>}

              <div className={styles.submitSection} style={{ marginTop: 0 }}>
                <button className={styles.buttonPrimary} onClick={saveCard} disabled={saving}>
                  {saving ? 'Збереження...' : 'Зберегти'}
                </button>
                <button className={styles.buttonSecondary} onClick={cancelForm}>Скасувати</button>
              </div>
            </div>
          )}

          {cards.length === 0 ? (
            <div className={styles.card}>
              <p className={styles.emptyText}>Немає карток. Натисніть «Додати картку».</p>
            </div>
          ) : (
            <div className={styles.cardNoPadding}>
              <table className={styles.table}>
                <thead className={styles.tableHeader}>
                  <tr>
                    <th className={styles.th} style={{ width: 72 }}>Фото</th>
                    <th className={styles.th}>Назва</th>
                    <th className={styles.th}>Опис</th>
                    <th className={styles.th} style={{ width: 120 }}>Ціна</th>
                    <th className={styles.th} style={{ width: 80 }}>Порядок</th>
                    <th className={styles.th} style={{ width: 160 }}>Дії</th>
                  </tr>
                </thead>
                <tbody>
                  {cards.map(card => (
                    <tr key={card.id}>
                      <td className={styles.td}>
                        {card.image_url ? (
                          <Image src={card.image_url} alt={card.name} width={56} height={56}
                            style={{ objectFit: 'cover', borderRadius: 4, display: 'block' }} unoptimized />
                        ) : (
                          <div style={{ width: 56, height: 56, background: '#f0f0f0', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <span className={styles.emptyText} style={{ fontSize: 10 }}>Немає</span>
                          </div>
                        )}
                      </td>
                      <td className={styles.td}><strong>{card.name}</strong></td>
                      <td className={styles.tdSmall} style={{ maxWidth: 260 }}>{card.description}</td>
                      <td className={styles.td}>{card.price.toLocaleString('uk-UA')} грн</td>
                      <td className={styles.tdCenter}>{card.sort_order}</td>
                      <td className={styles.td}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button className={styles.link} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, padding: 0 }}
                            onClick={() => openEdit(card)}>Редагувати</button>
                          <span style={{ color: '#ccc' }}>|</span>
                          <button className={styles.linkDanger} onClick={() => deleteCard(card.id)}>Видалити</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ════ GALLERY TAB ════ */}
      {tab === 'gallery' && (
        <div>
          <div className={styles.section} style={{ marginBottom: 24 }}>
            <h3 className={styles.sectionTitle}>Завантажити фото</h3>
            <div
              onClick={() => galleryRef.current?.click()}
              style={{ border: '2px dashed #ccc', borderRadius: 4, padding: '32px 20px', textAlign: 'center', cursor: uploading ? 'default' : 'pointer', background: '#fafafa', transition: 'border-color 0.2s' }}
              onMouseOver={e => { if (!uploading) e.currentTarget.style.borderColor = '#999'; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = '#ccc'; }}
            >
              <input ref={galleryRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif"
                multiple style={{ display: 'none' }} onChange={onGalleryFiles} disabled={uploading} />
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#bbb" strokeWidth="1.5" style={{ display: 'block', margin: '0 auto 10px' }}>
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p style={{ margin: 0, fontSize: 14, color: '#555', fontWeight: 500 }}>
                {uploading ? 'Завантаження...' : 'Клікніть або перетягніть фото'}
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#999' }}>JPEG, PNG, WebP, GIF · макс. 4MB · можна кілька</p>
            </div>
          </div>

          {gallery.length === 0 ? (
            <div className={styles.card}><p className={styles.emptyText}>Галерея порожня.</p></div>
          ) : (
            <>
              <p style={{ fontSize: 14, color: '#666', marginBottom: 16 }}>{gallery.length} фото в галереї</p>
              <div className={styles.grid4}>
                {gallery.map(img => (
                  <div key={img.id} style={{ border: '1px solid #ddd', borderRadius: 4, overflow: 'hidden', background: '#fff' }}>
                    <div style={{ position: 'relative', aspectRatio: '4/3', background: '#f5f5f5' }}>
                      <Image src={img.image_url} alt={img.alt} fill style={{ objectFit: 'cover' }} unoptimized />
                    </div>
                    <div style={{ padding: '8px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 6 }}>
                      <span className={styles.slugText} style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                        {img.alt || `#${img.id}`}
                      </span>
                      <button className={styles.linkDanger} style={{ fontSize: 13, flexShrink: 0 }} onClick={() => deleteGallery(img.id)}>
                        Видалити
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
