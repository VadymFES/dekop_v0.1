// app/lib/services/stripe-service.ts
import Stripe from 'stripe';

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-11-20.acacia',
});

export interface CreatePaymentIntentParams {
  amount: number; // Amount in hryvnias
  orderId: string;
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  description?: string;
}

/**
 * Creates a Stripe Payment Intent for an order
 * Converts UAH to smallest currency unit (kopiykas)
 */
export async function createPaymentIntent(params: CreatePaymentIntentParams) {
  try {
    const {
      amount,
      orderId,
      orderNumber,
      customerEmail,
      customerName,
      description
    } = params;

    // Convert to kopiykas (UAH smallest unit, 1 UAH = 100 kopiykas)
    const amountInKopiykas = Math.round(amount * 100);

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInKopiykas,
      currency: 'uah',
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        order_id: orderId,
        order_number: orderNumber,
      },
      receipt_email: customerEmail,
      description: description || `Оплата замовлення ${orderNumber} - Dekop Furniture`,
    });

    return {
      success: true,
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
    };
  } catch (error) {
    console.error('Stripe payment intent creation error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to create payment intent'
    );
  }
}

/**
 * Retrieves a payment intent by ID
 */
export async function getPaymentIntent(paymentIntentId: string) {
  try {
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    return paymentIntent;
  } catch (error) {
    console.error('Stripe get payment intent error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to retrieve payment intent'
    );
  }
}

/**
 * Confirms a payment intent
 */
export async function confirmPaymentIntent(paymentIntentId: string) {
  try {
    const paymentIntent = await stripe.paymentIntents.confirm(paymentIntentId);
    return paymentIntent;
  } catch (error) {
    console.error('Stripe confirm payment intent error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to confirm payment intent'
    );
  }
}

/**
 * Cancels a payment intent
 */
export async function cancelPaymentIntent(paymentIntentId: string) {
  try {
    const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);
    return paymentIntent;
  } catch (error) {
    console.error('Stripe cancel payment intent error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to cancel payment intent'
    );
  }
}

/**
 * Verifies Stripe webhook signature
 */
export function verifyWebhookSignature(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

  if (!webhookSecret) {
    throw new Error('Stripe webhook secret is not configured');
  }

  try {
    const event = stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret
    );
    return event;
  } catch (error) {
    console.error('Stripe webhook verification error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Webhook signature verification failed'
    );
  }
}

/**
 * Creates a refund for a payment
 */
export async function createRefund(paymentIntentId: string, amount?: number) {
  try {
    const refund = await stripe.refunds.create({
      payment_intent: paymentIntentId,
      amount: amount ? Math.round(amount * 100) : undefined, // Partial or full refund
    });

    return {
      success: true,
      refundId: refund.id,
      amount: refund.amount,
      status: refund.status,
    };
  } catch (error) {
    console.error('Stripe refund creation error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to create refund'
    );
  }
}

export { stripe };
