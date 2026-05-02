// app/checkout/types.ts

import type { DeliveryMethod, PaymentMethod } from '@/app/lib/definitions';

export type { DeliveryMethod, PaymentMethod };

export interface CheckoutFormData {
  // Step 1: Customer Information
  customerInfo: {
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
  };

  // Step 2: Delivery Information
  deliveryInfo: {
    method: DeliveryMethod;
    city?: string;
    street?: string;
    building?: string;
    apartment?: string;
    postalCode?: string;
    storeLocation?: string;
  };

  // Step 3: Payment Information
  paymentInfo: {
    method: PaymentMethod;
  };

  // Additional
  customerNotes?: string;
}

export interface CheckoutStep {
  id: number;
  title: string;
  description: string;
}

export const CHECKOUT_STEPS: CheckoutStep[] = [
  {
    id: 1,
    title: 'Особисті дані',
    description: 'Введіть ваші контактні дані'
  },
  {
    id: 2,
    title: 'Доставка',
    description: 'Оберіть спосіб доставки'
  },
  {
    id: 3,
    title: 'Оплата',
    description: 'Оберіть спосіб оплати'
  },
  {
    id: 4,
    title: 'Перевірка',
    description: 'Перевірте ваше замовлення'
  }
];

export interface DeliveryOption {
  value: DeliveryMethod;
  label: string;
  description: string;
  icon: string;
}

export const DELIVERY_OPTIONS: DeliveryOption[] = [
  {
    value: 'nova_poshta',
    label: 'Нова Пошта',
    description: 'Доставка у відділення або поштомат',
    icon: '📦'
  },
  {
    value: 'store_delivery',
    label: 'Кур\'єрська доставка',
    description: 'Доставка за вказаною адресою',
    icon: '🚚'
  },
  {
    value: 'pickup',
    label: 'Самовивіз',
    description: 'Забрати самостійно з магазину',
    icon: '🏪'
  }
];

export interface PaymentOption {
  value: PaymentMethod;
  label: string;
  description: string;
  icon: string;
}

export const PAYMENT_OPTIONS: PaymentOption[] = [
  {
    value: 'liqpay',
    label: 'LiqPay',
    description: 'Повна оплата банківською карткою через LiqPay',
    icon: '💳'
  },
  {
    value: 'cash_on_delivery',
    label: 'Готівкою при отриманні',
    description: 'Передплата 20% онлайн + решта при отриманні',
    icon: '💵'
  }
];
