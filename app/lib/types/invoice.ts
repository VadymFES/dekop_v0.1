// app/lib/types/invoice.ts

import { Order, OrderItem } from '../definitions';

/**
 * Supported languages for invoice generation
 */
export type InvoiceLanguage = 'uk' | 'en';

/**
 * Company information for invoice header
 */
export interface CompanyInfo {
  name: string;
  address: string;
  city: string;
  postalCode: string;
  phone: string;
  email: string;
  website: string;
  taxId?: string; // ЄДРПОУ / Tax ID
  vatNumber?: string; // ІПН / VAT number
  bankAccount?: string;
  bankName?: string;
  logoUrl?: string;
}

/**
 * Customer information for invoice
 */
export interface InvoiceCustomer {
  name: string;
  surname: string;
  fullName: string;
  phone: string;
  email: string;
  address?: string;
  city?: string;
  postalCode?: string;
}

/**
 * Invoice item details
 */
export interface InvoiceItem {
  id: string;
  name: string;
  article?: string;
  quantity: number;
  color?: string;
  unitPrice: number;
  totalPrice: number;
  imageUrl?: string;
  category?: string;
}

/**
 * Invoice pricing breakdown
 */
export interface InvoicePricing {
  subtotal: number;
  discountPercent: number;
  discountAmount: number;
  deliveryCost: number;
  taxRate?: number; // VAT rate (e.g., 20 for 20%)
  taxAmount?: number;
  total: number;
  prepaymentAmount?: number;
  remainingAmount?: number;
  currency: string;
}

/**
 * Delivery information for invoice
 */
export interface InvoiceDelivery {
  method: string;
  methodLabel: string;
  address?: string;
  city?: string;
  street?: string;
  building?: string;
  apartment?: string;
  postalCode?: string;
  storeLocation?: string;
}

/**
 * Payment information for invoice
 */
export interface InvoicePayment {
  method: string;
  methodLabel: string;
  status: string;
  statusLabel: string;
  paidAmount?: number;
  paymentDate?: string;
  deadline?: string;
}

/**
 * Complete invoice data structure
 */
export interface InvoiceData {
  // Invoice metadata
  invoiceNumber: string;
  orderNumber: string;
  issueDate: string;
  dueDate?: string;

  // Company information
  company: CompanyInfo;

  // Customer information
  customer: InvoiceCustomer;

  // Invoice items
  items: InvoiceItem[];

  // Pricing details
  pricing: InvoicePricing;

  // Delivery information
  delivery: InvoiceDelivery;

  // Payment information
  payment: InvoicePayment;

  // Additional information
  notes?: string;
  termsAndConditions?: string;

  // Language
  language: InvoiceLanguage;
}

/**
 * Invoice template style options
 */
export type InvoiceTemplate = 'basic' | 'professional' | 'modern';

/**
 * Invoice generation options
 */
export interface InvoiceGenerationOptions {
  template?: InvoiceTemplate;
  language?: InvoiceLanguage;
  includeImages?: boolean;
  includeCompanyLogo?: boolean;
  includeTerms?: boolean;
}

/**
 * Helper function to transform Order to InvoiceData
 */
export function orderToInvoiceData(
  order: Order & { items: OrderItem[] },
  companyInfo: CompanyInfo,
  options?: InvoiceGenerationOptions
): InvoiceData {
  const language = options?.language || 'uk';

  // Map delivery method to label
  const deliveryMethodLabels: Record<string, { uk: string; en: string }> = {
    nova_poshta: { uk: 'Нова Пошта', en: 'Nova Poshta' },
    store_delivery: { uk: 'Доставка кур\'єром', en: 'Courier Delivery' },
    pickup: { uk: 'Самовивіз', en: 'Pickup' },
  };

  // Map payment method to label
  const paymentMethodLabels: Record<string, { uk: string; en: string }> = {
    liqpay: { uk: 'LiqPay (Онлайн)', en: 'LiqPay (Online)' },
    monobank: { uk: 'Monobank (Онлайн)', en: 'Monobank (Online)' },
    cash_on_delivery: { uk: 'Оплата при отриманні', en: 'Cash on Delivery' },
  };

  // Map payment status to label
  const paymentStatusLabels: Record<string, { uk: string; en: string }> = {
    pending: { uk: 'Очікується', en: 'Pending' },
    paid: { uk: 'Оплачено', en: 'Paid' },
    failed: { uk: 'Не вдалося', en: 'Failed' },
    refunded: { uk: 'Повернено', en: 'Refunded' },
  };

  // Transform order items to invoice items
  const items: InvoiceItem[] = order.items.map((item) => ({
    id: item.id,
    name: item.product_name,
    article: item.product_article,
    quantity: item.quantity,
    color: item.color,
    unitPrice: item.unit_price,
    totalPrice: item.total_price,
    imageUrl: item.product_image_url,
    category: item.product_category,
  }));

  // Build delivery address
  let deliveryAddress = '';
  if (order.delivery_method === 'nova_poshta' && order.delivery_address) {
    deliveryAddress = order.delivery_address;
  } else if (order.delivery_method === 'store_delivery') {
    const parts = [
      order.delivery_street,
      order.delivery_building,
      order.delivery_apartment ? `кв. ${order.delivery_apartment}` : '',
    ].filter(Boolean);
    deliveryAddress = parts.join(', ');
  } else if (order.delivery_method === 'pickup' && order.store_location) {
    deliveryAddress = order.store_location;
  }

  return {
    invoiceNumber: order.order_number, // Using order number as invoice number for now
    orderNumber: order.order_number,
    issueDate: order.created_at,
    dueDate: order.payment_deadline,

    company: companyInfo,

    customer: {
      name: order.user_name,
      surname: order.user_surname,
      fullName: `${order.user_name} ${order.user_surname}`,
      phone: order.user_phone,
      email: order.user_email,
      address: deliveryAddress,
      city: order.delivery_city,
      postalCode: order.delivery_postal_code,
    },

    items,

    pricing: {
      subtotal: order.subtotal,
      discountPercent: order.discount_percent,
      discountAmount: order.discount_amount,
      deliveryCost: order.delivery_cost,
      total: order.total_amount,
      prepaymentAmount: order.prepayment_amount,
      remainingAmount: order.total_amount - (order.payment_status === 'paid' ? order.total_amount : order.prepayment_amount),
      currency: 'UAH',
    },

    delivery: {
      method: order.delivery_method,
      methodLabel: deliveryMethodLabels[order.delivery_method]?.[language] || order.delivery_method,
      address: deliveryAddress,
      city: order.delivery_city,
      street: order.delivery_street,
      building: order.delivery_building,
      apartment: order.delivery_apartment,
      postalCode: order.delivery_postal_code,
      storeLocation: order.store_location,
    },

    payment: {
      method: order.payment_method,
      methodLabel: paymentMethodLabels[order.payment_method]?.[language] || order.payment_method,
      status: order.payment_status,
      statusLabel: paymentStatusLabels[order.payment_status]?.[language] || order.payment_status,
      paidAmount: order.payment_status === 'paid' ? order.total_amount : order.prepayment_amount,
      paymentDate: order.payment_status === 'paid' ? order.updated_at : undefined,
      deadline: order.payment_deadline,
    },

    notes: order.customer_notes,
    language,
  };
}
