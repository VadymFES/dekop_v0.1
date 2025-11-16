// app/lib/order-utils.ts
// Utility functions for order processing

/**
 * Generates a unique order number in format: #1234567890
 * Uses timestamp + random number to ensure uniqueness
 */
export function generateOrderNumber(): string {
  const timestamp = Date.now().toString(); // 13 digits
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0'); // 3 digits

  // Take last 10 digits to keep format consistent
  const orderNum = (timestamp + random).slice(-10);

  return `#${orderNum}`;
}

/**
 * Calculates order totals based on cart items and delivery options
 */
export function calculateOrderTotals(params: {
  subtotal: number;
  discountPercent?: number;
  deliveryCost?: number;
  prepaymentPercentage?: number;
}): {
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  deliveryCost: number;
  totalAmount: number;
  prepaymentAmount: number;
} {
  const {
    subtotal,
    discountPercent = 0,
    deliveryCost = 0,
    prepaymentPercentage = parseFloat(process.env.ORDER_PREPAYMENT_PERCENTAGE || '0.20')
  } = params;

  const discountAmount = Math.round((subtotal * discountPercent) / 100 * 100) / 100;
  const totalAmount = subtotal - discountAmount + deliveryCost;
  const prepaymentAmount = Math.round(totalAmount * prepaymentPercentage * 100) / 100;

  return {
    subtotal,
    discountPercent,
    discountAmount,
    deliveryCost,
    totalAmount,
    prepaymentAmount
  };
}

/**
 * Calculates payment deadline timestamp
 * @param hoursFromNow - Number of hours from current time (default: 48)
 */
export function calculatePaymentDeadline(hoursFromNow?: number): Date {
  const hours = hoursFromNow || parseInt(process.env.ORDER_PAYMENT_DEADLINE_HOURS || '48', 10);
  const deadline = new Date();
  deadline.setHours(deadline.getHours() + hours);
  return deadline;
}

/**
 * Formats Ukrainian date string
 * Example: "03 березня 2024"
 */
export function formatUkrainianDate(date: Date | string): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  const months = [
    'січня', 'лютого', 'березня', 'квітня', 'травня', 'червня',
    'липня', 'серпня', 'вересня', 'жовтня', 'листопада', 'грудня'
  ];

  const day = dateObj.getDate().toString().padStart(2, '0');
  const month = months[dateObj.getMonth()];
  const year = dateObj.getFullYear();

  return `${day} ${month} ${year}`;
}

/**
 * Formats price in Ukrainian currency format
 * Example: "16 000 грн"
 */
export function formatUkrainianPrice(amount: number): string {
  const formatted = amount.toLocaleString('uk-UA', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });

  return `${formatted} грн`;
}

/**
 * Gets Ukrainian delivery method name
 */
export function getDeliveryMethodName(method: string): string {
  const deliveryMethods: Record<string, string> = {
    'nova_poshta': 'Доставка Новою поштою',
    'store_delivery': 'Доставка кур\'єром',
    'pickup': 'Самовивіз з магазину'
  };

  return deliveryMethods[method] || method;
}

/**
 * Gets Ukrainian payment method name
 */
export function getPaymentMethodName(method: string): string {
  const paymentMethods: Record<string, string> = {
    'stripe': 'Оплата карткою (Stripe)',
    'monobank': 'Оплата через Monobank',
    'cash_on_delivery': 'Готівкою при отриманні'
  };

  return paymentMethods[method] || method;
}

/**
 * Gets Ukrainian order status name
 */
export function getOrderStatusName(status: string): string {
  const statuses: Record<string, string> = {
    'processing': 'В обробці',
    'confirmed': 'Підтверджено',
    'shipped': 'Відправлено',
    'delivered': 'Доставлено',
    'cancelled': 'Скасовано'
  };

  return statuses[status] || status;
}

/**
 * Gets Ukrainian payment status name
 */
export function getPaymentStatusName(status: string): string {
  const statuses: Record<string, string> = {
    'pending': 'Очікує оплати',
    'paid': 'Оплачено',
    'failed': 'Помилка оплати',
    'refunded': 'Повернуто'
  };

  return statuses[status] || status;
}

/**
 * Formats full delivery address
 */
export function formatDeliveryAddress(params: {
  city?: string;
  street?: string;
  building?: string;
  apartment?: string;
  postalCode?: string;
}): string {
  const parts: string[] = [];

  if (params.street) parts.push(`вул. ${params.street}`);
  if (params.building) parts.push(`буд. ${params.building}`);
  if (params.apartment) parts.push(`кв. ${params.apartment}`);
  if (params.city) parts.push(params.city);
  if (params.postalCode) parts.push(params.postalCode);

  return parts.join(', ');
}

/**
 * Generates article number from product ID
 * Format: Арт. №97695454-875676
 */
export function generateProductArticle(productId: number): string {
  const part1 = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  const part2 = productId.toString().padStart(6, '0');
  return `${part1}-${part2}`;
}
