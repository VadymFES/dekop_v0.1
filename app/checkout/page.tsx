'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CustomerInfoStep from './components/CustomerInfoStep';
import DeliveryInfoStep from './components/DeliveryInfoStep';
import PaymentInfoStep from './components/PaymentInfoStep';
import OrderConfirmationModal from '@/app/components/order/OrderConfirmationModal';
import { CHECKOUT_STEPS, type CheckoutFormData } from './types';
import type { OrderWithItems, CartItem } from '@/app/lib/definitions';
import { formatUkrainianPrice } from '@/app/lib/order-utils';
import styles from './checkout.module.css';

export default function CheckoutPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartTotal, setCartTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<OrderWithItems | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [formData, setFormData] = useState<CheckoutFormData>({
    customerInfo: {
      firstName: '',
      lastName: '',
      phone: '',
      email: ''
    },
    deliveryInfo: {
      method: 'nova_poshta',
      city: '',
      street: '',
      building: '',
      apartment: '',
      postalCode: ''
    },
    paymentInfo: {
      method: 'cash_on_delivery'
    },
    customerNotes: ''
  });

  // Fetch cart data on mount
  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      const response = await fetch('/cart/api');
      if (response.ok) {
        const data = await response.json();
        setCart(data.items || []);

        // Calculate total
        const total = (data.items || []).reduce((sum: number, item: CartItem) => {
          return sum + (item.price * item.quantity);
        }, 0);
        setCartTotal(total);
      }
    } catch (error) {
      console.error('Error fetching cart:', error);
    }
  };

  const handleFieldChange = (section: keyof CheckoutFormData, field: string, value: string) => {
    if (section === 'customerInfo' || section === 'deliveryInfo' || section === 'paymentInfo') {
      setFormData({
        ...formData,
        [section]: {
          ...formData[section],
          [field]: value
        }
      });
    } else {
      setFormData({
        ...formData,
        [field]: value
      });
    }

    // Clear error for this field
    if (errors[field]) {
      setErrors({ ...errors, [field]: '' });
    }
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      // Validate customer info
      if (!formData.customerInfo.firstName.trim()) {
        newErrors.firstName = 'Введіть ваше ім\'я';
      }
      if (!formData.customerInfo.lastName.trim()) {
        newErrors.lastName = 'Введіть ваше прізвище';
      }
      if (!formData.customerInfo.phone.trim()) {
        newErrors.phone = 'Введіть номер телефону';
      } else if (!/^\+380\d{9}$/.test(formData.customerInfo.phone)) {
        newErrors.phone = 'Формат: +380501234567';
      }
      if (!formData.customerInfo.email.trim()) {
        newErrors.email = 'Введіть email';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.customerInfo.email)) {
        newErrors.email = 'Некоректний email';
      }
    }

    if (step === 2) {
      // Validate delivery info
      if (formData.deliveryInfo.method === 'nova_poshta' || formData.deliveryInfo.method === 'store_delivery') {
        if (!formData.deliveryInfo.city?.trim()) {
          newErrors.city = 'Введіть місто';
        }
        if (!formData.deliveryInfo.street?.trim()) {
          newErrors.street = 'Введіть вулицю';
        }
        if (!formData.deliveryInfo.building?.trim()) {
          newErrors.building = 'Введіть номер будинку';
        }
      }
      if (formData.deliveryInfo.method === 'pickup') {
        if (!formData.deliveryInfo.storeLocation?.trim()) {
          newErrors.storeLocation = 'Оберіть магазин';
        }
      }
    }

    if (step === 3) {
      // Validate payment info
      if (!formData.paymentInfo.method) {
        newErrors.method = 'Оберіть спосіб оплати';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 3) {
        setCurrentStep(currentStep + 1);
      } else {
        handleSubmitOrder();
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmitOrder = async () => {
    setIsLoading(true);

    try {
      // Create order (cart ID will be read from cookies on server-side)
      const orderResponse = await fetch('/api/orders/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_name: formData.customerInfo.firstName,
          user_surname: formData.customerInfo.lastName,
          user_phone: formData.customerInfo.phone,
          user_email: formData.customerInfo.email,
          delivery_method: formData.deliveryInfo.method,
          delivery_city: formData.deliveryInfo.city,
          delivery_street: formData.deliveryInfo.street,
          delivery_building: formData.deliveryInfo.building,
          delivery_apartment: formData.deliveryInfo.apartment,
          delivery_postal_code: formData.deliveryInfo.postalCode,
          store_location: formData.deliveryInfo.storeLocation,
          payment_method: formData.paymentInfo.method,
          customer_notes: formData.customerNotes
        })
      });

      if (!orderResponse.ok) {
        const errorData = await orderResponse.json();
        throw new Error(errorData.error || 'Failed to create order');
      }

      const { order } = await orderResponse.json();

      // Handle different payment methods
      if (formData.paymentInfo.method === 'liqpay') {
        // For LiqPay: create payment and redirect to checkout
        try {
          // Call server-side API to create payment (keeps private key secure)
          const paymentResponse = await fetch('/api/payments/liqpay/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: cartTotal,
              orderId: order.id,
              orderNumber: order.order_number,
              description: `Оплата замовлення ${order.order_number}`,
              customerEmail: formData.customerInfo.email,
              resultUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/order-success?orderId=${order.id}`,
              serverUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/liqpay`
            })
          });

          if (!paymentResponse.ok) {
            const errorData = await paymentResponse.json();
            throw new Error(errorData.error || 'Помилка при створенні платежу');
          }

          const liqpayPayment = await paymentResponse.json();

          if (liqpayPayment.success && liqpayPayment.checkoutUrl) {
            // Create a form and submit it to redirect to LiqPay
            const form = document.createElement('form');
            form.method = 'POST';
            form.action = liqpayPayment.checkoutUrl;
            form.style.display = 'none';

            const dataInput = document.createElement('input');
            dataInput.name = 'data';
            dataInput.value = liqpayPayment.data;
            form.appendChild(dataInput);

            const signatureInput = document.createElement('input');
            signatureInput.name = 'signature';
            signatureInput.value = liqpayPayment.signature;
            form.appendChild(signatureInput);

            document.body.appendChild(form);
            form.submit();
          } else {
            throw new Error('Failed to create LiqPay payment');
          }
        } catch (liqpayError) {
          console.error('LiqPay payment error:', liqpayError);
          throw new Error('Помилка при створенні платежу LiqPay');
        }
      } else if (formData.paymentInfo.method === 'monobank') {
        // For Monobank: create invoice and redirect
        alert('Monobank payment - will redirect to Monobank');
        // In production: call Monobank API and redirect

        // For demo: simulate successful payment
        await handlePaymentSuccess(order);
      } else {
        // Cash on delivery: order is complete
        await handlePaymentSuccess(order);
      }

    } catch (error) {
      console.error('Order submission error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Помилка при створенні замовлення. Спробуйте ще раз.';
      alert(errorMessage);
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = async (order: OrderWithItems) => {
    // Send confirmation email
    try {
      await fetch('/api/orders/send-confirmation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId: order.id })
      });
      console.log('Confirmation email sent');
    } catch (emailError) {
      console.error('Error sending confirmation email:', emailError);
      // Don't block the flow if email fails
    }

    // Clear cart
    try {
      await fetch('/cart/api/clear', { method: 'POST' });
      // Refresh cart state to reflect cleared cart
      setCart([]);
      setCartTotal(0);
    } catch (error) {
      console.error('Error clearing cart:', error);
    }

    // Show confirmation modal
    setCompletedOrder(order);
    setShowConfirmation(true);
    setIsLoading(false);
  };

  const handleContinueShopping = () => {
    setShowConfirmation(false);
    // Small delay to allow modal to close before navigation
    setTimeout(() => {
      router.push('/');
    }, 100);
  };

  if (cart.length === 0 && !isLoading) {
    return (
      <div className={styles.emptyCart}>
        <h1>Ваш кошик порожній</h1>
        <p>Додайте товари до кошика, щоб оформити замовлення</p>
        <button
          className={styles.primaryButton}
          onClick={() => router.push('/catalog')}
        >
          Перейти до каталогу
        </button>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.checkoutWrapper}>
        {/* Progress Stepper */}
        <div className={styles.stepper}>
          {CHECKOUT_STEPS.map((step, index) => (
            <div
              key={step.id}
              className={`${styles.stepItem} ${
                currentStep === step.id ? styles.stepItemActive : ''
              } ${currentStep > step.id ? styles.stepItemCompleted : ''}`}
            >
              <div className={styles.stepNumber}>
                {currentStep > step.id ? '✓' : step.id}
              </div>
              <div className={styles.stepInfo}>
                <div className={styles.stepLabel}>{step.title}</div>
                <div className={styles.stepDesc}>{step.description}</div>
              </div>
              {index < CHECKOUT_STEPS.length - 1 && (
                <div className={styles.stepLine} />
              )}
            </div>
          ))}
        </div>

        {/* Form Content */}
        <div className={styles.formSection}>
          <div className={styles.formContainer}>
            {currentStep === 1 && (
              <CustomerInfoStep
                formData={formData.customerInfo}
                onChange={(field, value) => handleFieldChange('customerInfo', field, value)}
                errors={errors}
              />
            )}

            {currentStep === 2 && (
              <DeliveryInfoStep
                formData={formData.deliveryInfo}
                onChange={(field, value) => handleFieldChange('deliveryInfo', field, value)}
                errors={errors}
              />
            )}

            {currentStep === 3 && (
              <PaymentInfoStep
                formData={formData.paymentInfo}
                onChange={(field, value) => handleFieldChange('paymentInfo', field, value)}
                errors={errors}
              />
            )}

            {/* Navigation Buttons */}
            <div className={styles.buttonGroup}>
              {currentStep > 1 && (
                <button
                  type="button"
                  className={styles.secondaryButton}
                  onClick={handleBack}
                  disabled={isLoading}
                >
                  Назад
                </button>
              )}
              <button
                type="button"
                className={styles.primaryButton}
                onClick={handleNext}
                disabled={isLoading}
              >
                {isLoading ? (
                  'Обробка...'
                ) : currentStep === 3 ? (
                  'Оформити замовлення'
                ) : (
                  'Далі'
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Order Summary Sidebar */}
        <div className={styles.sidebar}>
          <div className={styles.orderSummary}>
            <h3 className={styles.summaryTitle}>Ваше замовлення</h3>

            <div className={styles.cartItems}>
              {cart.map((item) => (
                <div key={item.id} className={styles.cartItem}>
                  <div className={styles.itemInfo}>
                    <span className={styles.itemName}>{item.name}</span>
                    {item.color && (
                      <span className={styles.itemColor}>Колір: {item.color}</span>
                    )}
                  </div>
                  <div className={styles.itemPrice}>
                    <span className={styles.itemQuantity}>×{item.quantity}</span>
                    <span className={styles.itemTotal}>
                      {formatUkrainianPrice(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            <div className={styles.summaryTotals}>
              <div className={styles.totalRow}>
                <span>Підсумок:</span>
                <span>{formatUkrainianPrice(cartTotal)}</span>
              </div>
              <div className={styles.totalRow}>
                <span>Доставка:</span>
                <span>За тарифами перевізника</span>
              </div>
              <div className={`${styles.totalRow} ${styles.grandTotal}`}>
                <span>Всього:</span>
                <span>{formatUkrainianPrice(cartTotal)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Order Confirmation Modal */}
      {completedOrder && (
        <OrderConfirmationModal
          order={completedOrder}
          isOpen={showConfirmation}
          onClose={() => setShowConfirmation(false)}
          onContinueShopping={handleContinueShopping}
        />
      )}
    </div>
  );
}
