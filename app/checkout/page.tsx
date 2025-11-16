'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import CustomerInfoStep from './components/CustomerInfoStep';
import DeliveryInfoStep from './components/DeliveryInfoStep';
import PaymentInfoStep from './components/PaymentInfoStep';
import ReviewStep from './components/ReviewStep';
import OrderConfirmationModal from '@/app/components/order/OrderConfirmationModal';
import ConfirmCancelModal from './components/ConfirmCancelModal';
import ErrorModal from './components/ErrorModal';
import { CHECKOUT_STEPS, type CheckoutFormData } from './types';
import type { OrderWithItems, CartItem } from '@/app/lib/definitions';
import { formatUkrainianPrice } from '@/app/lib/order-utils';
import { useCart } from '@/app/context/CartContext';
import styles from './checkout.module.css';

// LocalStorage key for checkout form data
const CHECKOUT_STORAGE_KEY = 'dekop_checkout_form';
const CHECKOUT_STEP_KEY = 'dekop_checkout_step';
const STORAGE_EXPIRATION_MINUTES = 20; // Data expires after 20 minutes

// Helper to save form data to localStorage
const saveFormData = (data: CheckoutFormData, step: number) => {
  try {
    const storageData = {
      formData: data,
      currentStep: step,
      timestamp: Date.now(),
    };
    localStorage.setItem(CHECKOUT_STORAGE_KEY, JSON.stringify(storageData));
  } catch (error) {
    console.error('Error saving checkout data to localStorage:', error);
  }
};

// Helper to load form data from localStorage
const loadFormData = (): { formData: CheckoutFormData | null; currentStep: number } => {
  try {
    const saved = localStorage.getItem(CHECKOUT_STORAGE_KEY);
    if (!saved) return { formData: null, currentStep: 1 };

    const storageData = JSON.parse(saved);
    const { formData, currentStep, timestamp } = storageData;

    // Check if data is expired (older than 20 minutes)
    const minutesElapsed = (Date.now() - timestamp) / (1000 * 60);
    if (minutesElapsed > STORAGE_EXPIRATION_MINUTES) {
      // Data expired, clear it
      localStorage.removeItem(CHECKOUT_STORAGE_KEY);
      return { formData: null, currentStep: 1 };
    }

    return { formData, currentStep: currentStep || 1 };
  } catch (error) {
    console.error('Error loading checkout data from localStorage:', error);
    return { formData: null, currentStep: 1 };
  }
};

// Helper to clear saved form data
const clearFormData = () => {
  try {
    localStorage.removeItem(CHECKOUT_STORAGE_KEY);
  } catch (error) {
    console.error('Error clearing checkout data from localStorage:', error);
  }
};

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, isLoading: isCartLoading, clearCart } = useCart();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [completedOrder, setCompletedOrder] = useState<OrderWithItems | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isFormLoaded, setIsFormLoaded] = useState(false);

  // Modal states
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showError, setShowError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Calculate cart total from CartContext data
  const cartTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

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
      method: 'cash_on_delivery',
      depositPaymentMethod: 'liqpay'
    },
    customerNotes: ''
  });

  // Load saved form data on mount
  useEffect(() => {
    const { formData: savedFormData, currentStep: savedStep } = loadFormData();

    if (savedFormData) {
      setFormData(savedFormData);
      setCurrentStep(savedStep);
    }

    setIsFormLoaded(true);
  }, []);

  // Redirect to cart page if cart becomes empty
  useEffect(() => {
    if (!isCartLoading && cart.length === 0) {
      router.push('/cart');
    }
  }, [cart.length, isCartLoading, router]);

  // Save form data to localStorage whenever it changes
  useEffect(() => {
    // Only save after initial load to avoid overwriting with empty data
    if (isFormLoaded) {
      saveFormData(formData, currentStep);
    }
  }, [formData, currentStep, isFormLoaded]);

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
      // Validate deposit payment method for cash_on_delivery
      if (formData.paymentInfo.method === 'cash_on_delivery' && !formData.paymentInfo.depositPaymentMethod) {
        newErrors.depositPaymentMethod = 'Оберіть спосіб оплати передплати';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      if (currentStep < 4) {
        setCurrentStep(currentStep + 1);
      } else {
        handleSubmitOrder();
      }
    }
  };

  const handleEdit = (step: number) => {
    setCurrentStep(step);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleCancel = () => {
    setShowCancelConfirm(true);
  };

  const handleConfirmCancel = () => {
    // Clear form data to initial state
    setFormData({
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
        method: 'cash_on_delivery',
        depositPaymentMethod: 'liqpay'
      },
      customerNotes: ''
    });

    // Clear localStorage checkout data
    clearFormData();

    // Reset to step 1
    setCurrentStep(1);

    // Clear any errors
    setErrors({});

    // Close modal
    setShowCancelConfirm(false);

    // Redirect to cart page
    router.push('/cart');
  };

  const handleSubmitOrder = async () => {
    setIsSubmitting(true);

    try {
      // Calculate prepayment amount for cash on delivery (20% deposit)
      const prepaymentAmount = formData.paymentInfo.method === 'cash_on_delivery'
        ? Math.round(cartTotal * 0.2)
        : 0;

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
          customer_notes: formData.customerNotes,
          prepayment_amount: prepaymentAmount
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
        await createLiqPayPayment(order, cartTotal, `Оплата замовлення ${order.order_number}`);
      } else if (formData.paymentInfo.method === 'monobank') {
        // For Monobank: create invoice and redirect
        await createMonobankPayment(order, cartTotal, `Оплата замовлення ${order.order_number}`);
      } else if (formData.paymentInfo.method === 'cash_on_delivery') {
        // Cash on delivery: require 20% deposit payment
        const depositMethod = formData.paymentInfo.depositPaymentMethod;
        if (depositMethod === 'liqpay') {
          await createLiqPayPayment(
            order,
            prepaymentAmount,
            `Передплата 20% замовлення ${order.order_number} (оплата при отриманні)`
          );
        } else if (depositMethod === 'monobank') {
          await createMonobankPayment(
            order,
            prepaymentAmount,
            `Передплата 20% замовлення ${order.order_number} (оплата при отриманні)`
          );
        }
      }

    } catch (error) {
      console.error('Order submission error:', error);
      const errMsg = error instanceof Error ? error.message : 'Помилка при створенні замовлення. Спробуйте ще раз.';
      setErrorMessage(errMsg);
      setShowError(true);
      setIsSubmitting(false);
    }
  };

  const createLiqPayPayment = async (order: OrderWithItems, amount: number, description: string) => {
    try {
      // Call server-side API to create payment (keeps private key secure)
      const paymentResponse = await fetch('/api/payments/liqpay/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amount,
          orderId: order.id,
          orderNumber: order.order_number,
          description: description,
          customerEmail: formData.customerInfo.email,
          resultUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/order-success?orderId=${order.id}`,
          cancelUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/payment-cancelled?orderId=${order.id}`,
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
  };

  const createMonobankPayment = async (order: OrderWithItems, amount: number, description: string) => {
    try {
      // Call server-side API to create Monobank invoice
      const paymentResponse = await fetch('/api/payments/monobank/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amount,
          orderId: order.id,
          orderNumber: order.order_number,
          customerEmail: formData.customerInfo.email,
          resultUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/order-success?orderId=${order.id}`,
          cancelUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/payment-cancelled?orderId=${order.id}`,
          serverUrl: `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/monobank`
        })
      });

      if (!paymentResponse.ok) {
        const errorData = await paymentResponse.json();
        throw new Error(errorData.error || 'Помилка при створенні платежу');
      }

      const monobankPayment = await paymentResponse.json();

      if (monobankPayment.success && monobankPayment.pageUrl) {
        // Redirect to Monobank payment page
        window.location.href = monobankPayment.pageUrl;
      } else {
        throw new Error('Failed to create Monobank payment');
      }
    } catch (monobankError) {
      console.error('Monobank payment error:', monobankError);
      throw new Error('Помилка при створенні платежу Monobank');
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

    // Clear cart using CartContext (which properly invalidates React Query cache)
    try {
      clearCart();
    } catch (error) {
      console.error('Error clearing cart:', error);
    }

    // Clear saved checkout form data from localStorage
    clearFormData();

    // Show confirmation modal
    setCompletedOrder(order);
    setShowConfirmation(true);
    setIsSubmitting(false);
  };

  const handleContinueShopping = () => {
    setShowConfirmation(false);
    // Small delay to allow modal to close before navigation
    setTimeout(() => {
      router.push('/');
    }, 100);
  };

  // Show loading state while cart is being fetched
  if (isCartLoading) {
    return (
      <div className={styles.emptyCart}>
        <p>Завантаження кошика...</p>
      </div>
    );
  }

  // Redirect to cart page if cart is empty (redirecting happens in useEffect)
  if (cart.length === 0) {
    return (
      <div className={styles.emptyCart}>
        <p>Переадресація...</p>
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

            {currentStep === 4 && (
              <ReviewStep
                formData={formData}
                cart={cart}
                cartTotal={cartTotal}
                onEdit={handleEdit}
              />
            )}

            {/* Navigation Buttons */}
            <div className={styles.buttonGroup}>
              <button
                type="button"
                className={styles.cancelButton}
                onClick={handleCancel}
                disabled={isSubmitting}
              >
                Скасувати замовлення
              </button>
              <div className={styles.navButtons}>
                {currentStep > 1 && (
                  <button
                    type="button"
                    className={styles.secondaryButton}
                    onClick={handleBack}
                    disabled={isSubmitting}
                  >
                    Назад
                  </button>
                )}
                <button
                  type="button"
                  className={styles.primaryButton}
                  onClick={handleNext}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    'Обробка...'
                  ) : currentStep === 4 ? (
                    'Підтвердити та оплатити'
                  ) : (
                    'Далі'
                  )}
                </button>
              </div>
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

      {/* Cancel Confirmation Modal */}
      <ConfirmCancelModal
        isOpen={showCancelConfirm}
        onConfirm={handleConfirmCancel}
        onCancel={() => setShowCancelConfirm(false)}
      />

      {/* Error Modal */}
      <ErrorModal
        isOpen={showError}
        message={errorMessage}
        onClose={() => setShowError(false)}
      />
    </div>
  );
}
