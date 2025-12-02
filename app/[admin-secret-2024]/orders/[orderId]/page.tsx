/**
 * Admin Order Details Page
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
    redirect('/admin-secret-2024/login');
  }

  if (!admin.permissions.includes('orders.read')) {
    redirect('/admin-secret-2024');
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
        <Link href="/admin-secret-2024/orders" style={{ color: '#1976d2' }}>
          &larr; Back to Orders
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '30px' }}>
        <div>
          <h1 style={{ fontSize: '24px', margin: 0 }}>Order {order.order_number}</h1>
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
        {/* Left Column */}
        <div>
          {/* Order Items */}
          <div style={cardStyle}>
            <h2 style={headingStyle}>Order Items</h2>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <th style={thStyle}>Product</th>
                  <th style={thStyle}>Color</th>
                  <th style={thStyle}>Qty</th>
                  <th style={thStyle}>Price</th>
                  <th style={thStyle}>Total</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: OrderItem) => (
                  <tr key={item.id}>
                    <td style={tdStyle}>
                      <div>{item.product_name}</div>
                      {item.product_article && (
                        <div style={{ fontSize: '12px', color: '#666' }}>Art: {item.product_article}</div>
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
                  <td colSpan={4} style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold' }}>Subtotal:</td>
                  <td style={tdStyle}>{formatCurrency(order.subtotal)}</td>
                </tr>
                {order.discount_amount > 0 && (
                  <tr>
                    <td colSpan={4} style={{ ...tdStyle, textAlign: 'right' }}>Discount ({order.discount_percent}%):</td>
                    <td style={{ ...tdStyle, color: '#4caf50' }}>-{formatCurrency(order.discount_amount)}</td>
                  </tr>
                )}
                <tr>
                  <td colSpan={4} style={{ ...tdStyle, textAlign: 'right' }}>Delivery:</td>
                  <td style={tdStyle}>{formatCurrency(order.delivery_cost)}</td>
                </tr>
                <tr style={{ backgroundColor: '#f5f5f5' }}>
                  <td colSpan={4} style={{ ...tdStyle, textAlign: 'right', fontWeight: 'bold', fontSize: '16px' }}>Total:</td>
                  <td style={{ ...tdStyle, fontWeight: 'bold', fontSize: '16px' }}>{formatCurrency(order.total_amount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Customer Notes */}
          {order.customer_notes && (
            <div style={{ ...cardStyle, marginTop: '20px' }}>
              <h2 style={headingStyle}>Customer Notes</h2>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{order.customer_notes}</p>
            </div>
          )}

          {/* Update Status Form */}
          {canUpdate && (
            <div style={{ ...cardStyle, marginTop: '20px' }}>
              <h2 style={headingStyle}>Update Order</h2>
              <OrderStatusForm
                orderId={order.id}
                currentStatus={order.order_status}
                currentPaymentStatus={order.payment_status}
                currentNotes={order.admin_notes || ''}
              />
            </div>
          )}
        </div>

        {/* Right Column */}
        <div>
          {/* Customer Info */}
          <div style={cardStyle}>
            <h2 style={headingStyle}>Customer</h2>
            <div style={infoRow}>
              <strong>Name:</strong> {order.user_name} {order.user_surname}
            </div>
            <div style={infoRow}>
              <strong>Email:</strong> <a href={`mailto:${order.user_email}`}>{order.user_email}</a>
            </div>
            <div style={infoRow}>
              <strong>Phone:</strong> <a href={`tel:${order.user_phone}`}>{order.user_phone}</a>
            </div>
          </div>

          {/* Delivery Info */}
          <div style={{ ...cardStyle, marginTop: '20px' }}>
            <h2 style={headingStyle}>Delivery</h2>
            <div style={infoRow}>
              <strong>Method:</strong> {formatDeliveryMethod(order.delivery_method)}
            </div>
            {order.delivery_city && (
              <div style={infoRow}>
                <strong>City:</strong> {order.delivery_city}
              </div>
            )}
            {order.delivery_address && (
              <div style={infoRow}>
                <strong>Address:</strong> {order.delivery_address}
              </div>
            )}
            {order.delivery_street && (
              <div style={infoRow}>
                <strong>Street:</strong> {order.delivery_street}
                {order.delivery_building && `, ${order.delivery_building}`}
                {order.delivery_apartment && `, apt. ${order.delivery_apartment}`}
              </div>
            )}
            {order.store_location && (
              <div style={infoRow}>
                <strong>Store:</strong> {order.store_location}
              </div>
            )}
          </div>

          {/* Payment Info */}
          <div style={{ ...cardStyle, marginTop: '20px' }}>
            <h2 style={headingStyle}>Payment</h2>
            <div style={infoRow}>
              <strong>Method:</strong> {formatPaymentMethod(order.payment_method)}
            </div>
            <div style={infoRow}>
              <strong>Status:</strong> <PaymentBadge status={order.payment_status} />
            </div>
            {order.prepayment_amount > 0 && (
              <div style={infoRow}>
                <strong>Prepayment:</strong> {formatCurrency(order.prepayment_amount)}
              </div>
            )}
            {order.payment_deadline && (
              <div style={infoRow}>
                <strong>Deadline:</strong> {formatDate(order.payment_deadline)}
              </div>
            )}
          </div>

          {/* Timestamps */}
          <div style={{ ...cardStyle, marginTop: '20px' }}>
            <h2 style={headingStyle}>Timeline</h2>
            <div style={infoRow}>
              <strong>Created:</strong> {formatDate(order.created_at)}
            </div>
            {order.shipped_at && (
              <div style={infoRow}>
                <strong>Shipped:</strong> {formatDate(order.shipped_at)}
              </div>
            )}
            {order.delivered_at && (
              <div style={infoRow}>
                <strong>Delivered:</strong> {formatDate(order.delivered_at)}
              </div>
            )}
            {order.cancelled_at && (
              <div style={infoRow}>
                <strong>Cancelled:</strong> {formatDate(order.cancelled_at)}
              </div>
            )}
          </div>

          {/* Admin Notes */}
          {order.admin_notes && (
            <div style={{ ...cardStyle, marginTop: '20px' }}>
              <h2 style={headingStyle}>Admin Notes</h2>
              <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{order.admin_notes}</p>
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

function StatusBadge({ status }: { status: string }) {
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
      {status.toUpperCase()}
    </span>
  );
}

function PaymentBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: '#ff9800',
    paid: '#4caf50',
    failed: '#f44336',
    refunded: '#9c27b0',
  };
  return <span style={{ color: colors[status] || '#333', fontWeight: 'bold' }}>{status}</span>;
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
    nova_poshta: 'Nova Poshta',
    store_delivery: 'Store Delivery',
    pickup: 'Pickup',
  };
  return methods[method] || method;
}

function formatPaymentMethod(method: string): string {
  const methods: Record<string, string> = {
    liqpay: 'LiqPay',
    monobank: 'Monobank',
    cash_on_delivery: 'Cash on Delivery',
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
