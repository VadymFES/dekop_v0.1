/**
 * Сторінка деталей замовлення
 */

import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getCurrentAdmin } from '@/app/lib/admin-auth';
import { db } from '@/app/lib/db';
import OrderStatusForm from './OrderStatusForm';

interface PageProps {
  params: Promise<{ orderId: string }>;
}

export default async function OrderDetailsPage({ params }: PageProps) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    redirect('/admin-path-57fyg/login');
  }

  if (!admin.permissions.includes('orders.read')) {
    redirect('/admin-path-57fyg');
  }

  const { orderId } = await params;

  // Validate UUID format
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(orderId)) {
    notFound();
  }

  // Get order
  const orderResult = await db.query`
    SELECT * FROM orders WHERE id = ${orderId}
  `;

  if (orderResult.rows.length === 0) {
    notFound();
  }

  const order = orderResult.rows[0];

  // Get order items
  const itemsResult = await db.query`
    SELECT * FROM order_items WHERE order_id = ${orderId}
  `;

  const items = itemsResult.rows;
  const canUpdate = admin.permissions.includes('orders.update');

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <Link href="/admin-path-57fyg/orders" style={{ color: '#1976d2' }}>
          &larr; Назад до замовлень
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
        <div>
          <h1 style={{ fontSize: '24px', margin: 0 }}>Замовлення {order.order_number}</h1>
          <div style={{ color: '#666', marginTop: '5px' }}>{formatDate(order.created_at)}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <StatusBadge status={order.order_status} />
          <div style={{ marginTop: '5px' }}>
            <PaymentBadge status={order.payment_status} />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px' }}>
        {/* Ліва колонка */}
        <div>
          {/* Товари замовлення */}
          <div style={cardStyle}>
            <h2 style={headingStyle}>Товари замовлення</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={thStyle}>Товар</th>
                  <th style={thStyle}>Колір</th>
                  <th style={thStyle}>К-сть</th>
                  <th style={thStyle}>Ціна</th>
                  <th style={thStyle}>Сума</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: OrderItem) => (
                  <tr key={item.id}>
                    <td style={tdStyle}>
                      <div>{item.product_name}</div>
                      {item.product_article && (
                        <div style={{ fontSize: '12px', color: '#666' }}>Арт: {item.product_article}</div>
                      )}
                    </td>
                    <td style={tdStyle}>{item.color || '-'}</td>
                    <td style={tdStyle}>{item.quantity}</td>
                    <td style={tdStyle}>{formatCurrency(item.unit_price)}</td>
                    <td style={tdStyle}>{formatCurrency(item.total_price)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4} style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>Підсумок:</td>
                  <td style={tdStyle}>{formatCurrency(order.subtotal)}</td>
                </tr>
                {order.discount_amount > 0 && (
                  <tr>
                    <td colSpan={4} style={{ ...tdStyle, textAlign: 'right' }}>Знижка ({order.discount_percent}%):</td>
                    <td style={{ ...tdStyle, color: '#4caf50' }}>-{formatCurrency(order.discount_amount)}</td>
                  </tr>
                )}
                <tr>
                  <td colSpan={4} style={{ ...tdStyle, textAlign: 'right' }}>Доставка:</td>
                  <td style={tdStyle}>{formatCurrency(order.delivery_cost)}</td>
                </tr>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <td colSpan={4} style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold', fontSize: '16px' }}>Всього:</td>
                  <td style={{ ...tdStyle, fontWeight: 'bold', fontSize: '16px' }}>{formatCurrency(order.total_amount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Примітки клієнта */}
          {order.customer_notes && (
            <div style={{ ...cardStyle, marginTop: '20px' }}>
              <h2 style={headingStyle}>Примітки клієнта</h2>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{order.customer_notes}</p>
            </div>
          )}

          {/* Форма оновлення статусу */}
          {canUpdate && (
            <div style={{ ...cardStyle, marginTop: '20px' }}>
              <h2 style={headingStyle}>Оновити замовлення</h2>
              <OrderStatusForm
                orderId={order.id}
                currentStatus={order.order_status}
                currentPaymentStatus={order.payment_status}
                currentNotes={order.admin_notes || ''}
                adminEmail={admin.email}
              />
            </div>
          )}
        </div>

        {/* Права колонка */}
        <div>
          {/* Інформація про клієнта */}
          <div style={cardStyle}>
            <h2 style={headingStyle}>Клієнт</h2>
            <div style={infoRow}>
              <strong>Ім'я:</strong> {order.user_name} {order.user_surname}
            </div>
            <div style={infoRow}>
              <strong>Email:</strong> <a href={`mailto:${order.user_email}`}>{order.user_email}</a>
            </div>
            <div style={infoRow}>
              <strong>Телефон:</strong> <a href={`tel:${order.user_phone}`}>{order.user_phone}</a>
            </div>
          </div>

          {/* Інформація про доставку */}
          <div style={{ ...cardStyle, marginTop: '20px' }}>
            <h2 style={headingStyle}>Доставка</h2>
            <div style={infoRow}>
              <strong>Спосіб:</strong> {formatDeliveryMethod(order.delivery_method)}
            </div>
            {order.delivery_city && (
              <div style={infoRow}>
                <strong>Місто:</strong> {order.delivery_city}
              </div>
            )}
            {order.delivery_address && (
              <div style={infoRow}>
                <strong>Адреса:</strong> {order.delivery_address}
              </div>
            )}
            {order.delivery_street && (
              <div style={infoRow}>
                <strong>Вулиця:</strong> {order.delivery_street}
                {order.delivery_building && `, ${order.delivery_building}`}
                {order.delivery_apartment && `, кв. ${order.delivery_apartment}`}
              </div>
            )}
            {order.store_location && (
              <div style={infoRow}>
                <strong>Магазин:</strong> {order.store_location}
              </div>
            )}
          </div>

          {/* Інформація про оплату */}
          <div style={{ ...cardStyle, marginTop: '20px' }}>
            <h2 style={headingStyle}>Оплата</h2>
            <div style={infoRow}>
              <strong>Спосіб:</strong> {formatPaymentMethod(order.payment_method)}
            </div>
            <div style={infoRow}>
              <strong>Статус:</strong> <PaymentBadge status={order.payment_status} />
            </div>
            {order.prepayment_amount > 0 && (
              <div style={infoRow}>
                <strong>Передоплата:</strong> {formatCurrency(order.prepayment_amount)}
              </div>
            )}
            {order.payment_deadline && (
              <div style={infoRow}>
                <strong>Термін оплати:</strong> {formatDate(order.payment_deadline)}
              </div>
            )}
          </div>

          {/* Хронологія */}
          <div style={{ ...cardStyle, marginTop: '20px' }}>
            <h2 style={headingStyle}>Хронологія</h2>
            <div style={infoRow}>
              <strong>Створено:</strong> {formatDate(order.created_at)}
            </div>
            {order.shipped_at && (
              <div style={infoRow}>
                <strong>Відправлено:</strong> {formatDate(order.shipped_at)}
              </div>
            )}
            {order.delivered_at && (
              <div style={infoRow}>
                <strong>Доставлено:</strong> {formatDate(order.delivered_at)}
              </div>
            )}
            {order.cancelled_at && (
              <div style={infoRow}>
                <strong>Скасовано:</strong> {formatDate(order.cancelled_at)}
              </div>
            )}
          </div>

          {/* Примітки адміна */}
          {order.admin_notes && (
            <div style={{ ...cardStyle, marginTop: '20px' }}>
              <h2 style={headingStyle}>Примітки адміністратора</h2>
              <AdminNotesDisplay notes={order.admin_notes} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface OrderItem {
  id: string;
  product_name: string;
  product_article?: string;
  color?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface AdminNote {
  text: string;
  author: string;
  timestamp: string;
}

function AdminNotesDisplay({ notes }: { notes: string }) {
  let parsedNotes: AdminNote[] = [];

  try {
    const parsed = JSON.parse(notes);
    if (Array.isArray(parsed)) {
      parsedNotes = parsed;
    }
  } catch {
    // Old format: plain text
    if (notes.trim()) {
      return <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{notes}</p>;
    }
    return null;
  }

  if (parsedNotes.length === 0) {
    return <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{notes}</p>;
  }

  return (
    <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
      {parsedNotes.map((note, index) => (
        <div
          key={index}
          style={{
            padding: '10px 0',
            borderBottom: index < parsedNotes.length - 1 ? '1px solid #eee' : 'none',
          }}
        >
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: '4px',
            fontSize: '12px',
            color: '#666'
          }}>
            <span style={{ fontWeight: '500' }}>{note.author}</span>
            <span>{formatDate(note.timestamp)}</span>
          </div>
          <div style={{
            fontSize: '14px',
            color: '#333',
            whiteSpace: 'pre-wrap',
            lineHeight: '1.4'
          }}>
            {note.text}
          </div>
        </div>
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    processing: 'В обробці',
    confirmed: 'Підтверджено',
    shipped: 'Відправлено',
    delivered: 'Доставлено',
    cancelled: 'Скасовано',
  };
  const colors: Record<string, { bg: string; text: string }> = {
    processing: { bg: '#fff3e0', text: '#e65100' },
    confirmed: { bg: '#e3f2fd', text: '#1565c0' },
    shipped: { bg: '#f3e5f5', text: '#7b1fa2' },
    delivered: { bg: '#e8f5e9', text: '#2e7d32' },
    cancelled: { bg: '#ffebee', text: '#c62828' },
  };
  const color = colors[status] || { bg: '#f5f5f5', text: '#333' };
  return (
    <span style={{
      backgroundColor: color.bg,
      color: color.text,
      padding: '5px 15px',
      fontWeight: 'bold',
      fontSize: '14px',
    }}>
      {labels[status] || status}
    </span>
  );
}

function PaymentBadge({ status }: { status: string }) {
  const labels: Record<string, string> = {
    pending: 'Очікує',
    paid: 'Оплачено',
    failed: 'Помилка',
    refunded: 'Повернення',
  };
  const colors: Record<string, string> = {
    pending: '#ff9800',
    paid: '#4caf50',
    failed: '#f44336',
    refunded: '#9c27b0',
  };
  return <span style={{ color: colors[status] || '#333', fontWeight: 'bold' }}>{labels[status] || status}</span>;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('uk-UA', {
    style: 'currency',
    currency: 'UAH',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('uk-UA', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDeliveryMethod(method: string): string {
  const methods: Record<string, string> = {
    nova_poshta: 'Нова Пошта',
    store_delivery: 'Доставка з магазину',
    pickup: 'Самовивіз',
  };
  return methods[method] || method;
}

function formatPaymentMethod(method: string): string {
  const methods: Record<string, string> = {
    liqpay: 'LiqPay',
    monobank: 'Monobank',
    cash_on_delivery: 'Післяплата',
  };
  return methods[method] || method;
}

const cardStyle = {
  backgroundColor: 'white',
  border: '1px solid #ccc',
  padding: '20px',
};

const headingStyle = {
  fontSize: '16px',
  margin: '0 0 15px 0',
  paddingBottom: '10px',
  borderBottom: '1px solid #eee',
};

const infoRow = {
  marginBottom: '10px',
  fontSize: '14px',
};

const thStyle = {
  padding: '10px',
  textAlign: 'left' as const,
  borderBottom: '2px solid #ccc',
  fontSize: '14px',
};

const tdStyle = {
  padding: '10px',
  borderBottom: '1px solid #eee',
  fontSize: '14px',
};
