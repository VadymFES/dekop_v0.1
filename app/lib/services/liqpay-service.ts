// app/lib/services/liqpay-service.ts
import crypto from 'crypto';

/**
 * LiqPay Payment Integration
 * Documentation: https://www.liqpay.ua/documentation/api/aquiring/checkout/doc
 */

const LIQPAY_API_URL = 'https://www.liqpay.ua/api/request';
const LIQPAY_CHECKOUT_URL = 'https://www.liqpay.ua/api/3/checkout';

export interface CreateLiqPayPaymentParams {
  amount: number; // Amount in UAH
  orderId: string;
  orderNumber: string;
  description: string;
  customerEmail?: string;
  resultUrl?: string; // URL to redirect after payment
  cancelUrl?: string; // URL to redirect if payment is cancelled
  serverUrl?: string; // Webhook URL for server callback
}

export interface LiqPayPaymentResponse {
  success: boolean;
  data: string; // Base64 encoded payment data
  signature: string; // Payment signature
  checkoutUrl?: string; // URL for payment page
}

/**
 * Generates LiqPay signature
 */
function generateSignature(data: string): string {
  const privateKey = process.env.LIQPAY_PRIVATE_KEY || '';
  const signString = privateKey + data + privateKey;
  return crypto.createHash('sha1').update(signString).digest('base64');
}

/**
 * Encodes data to base64
 */
function encodeData(data: object): string {
  const jsonString = JSON.stringify(data);
  return Buffer.from(jsonString, 'utf-8').toString('base64');
}

/**
 * Decodes base64 data
 */
function decodeData(encodedData: string): any {
  const jsonString = Buffer.from(encodedData, 'base64').toString('utf-8');
  return JSON.parse(jsonString);
}

/**
 * Creates a LiqPay payment
 */
export async function createLiqPayPayment(
  params: CreateLiqPayPaymentParams
): Promise<LiqPayPaymentResponse> {
  try {
    const publicKey = process.env.LIQPAY_PUBLIC_KEY;
    const privateKey = process.env.LIQPAY_PRIVATE_KEY;

    if (!publicKey || !privateKey) {
      throw new Error('LiqPay credentials are not configured');
    }

    const {
      amount,
      orderId,
      orderNumber,
      description,
      customerEmail,
      resultUrl,
      cancelUrl,
      serverUrl
    } = params;

    // Prepare payment data
    // Note: LiqPay doesn't have a separate cancel_url parameter
    // Cancelled payments will redirect to result_url with status='failure' or 'error'
    const paymentData = {
      public_key: publicKey,
      version: '3',
      action: 'pay',
      amount: amount,
      currency: 'UAH',
      description: description || `Оплата замовлення ${orderNumber}`,
      order_id: orderId,
      result_url: resultUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/order-success`,
      server_url: serverUrl || `${process.env.NEXT_PUBLIC_BASE_URL}/api/webhooks/liqpay`,
      language: 'uk',
      ...(customerEmail && { sender_email: customerEmail })
    };

    // Encode data and generate signature
    const data = encodeData(paymentData);
    const signature = generateSignature(data);

    return {
      success: true,
      data,
      signature,
      checkoutUrl: LIQPAY_CHECKOUT_URL
    };
  } catch (error) {
    console.error('LiqPay payment creation error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to create LiqPay payment'
    );
  }
}

/**
 * Verifies LiqPay callback signature
 */
export function verifyLiqPayCallback(data: string, signature: string): boolean {
  try {
    const expectedSignature = generateSignature(data);
    return signature === expectedSignature;
  } catch (error) {
    console.error('LiqPay signature verification error:', error);
    return false;
  }
}

/**
 * Parses LiqPay callback data
 */
export function parseLiqPayCallback(data: string): any {
  try {
    return decodeData(data);
  } catch (error) {
    console.error('LiqPay callback parsing error:', error);
    throw new Error('Failed to parse LiqPay callback data');
  }
}

/**
 * Converts LiqPay payment status to our internal payment status
 */
export function mapLiqPayStatus(liqpayStatus: string): 'pending' | 'paid' | 'failed' | 'refunded' {
  switch (liqpayStatus) {
    case 'success':
    case 'sandbox': // Sandbox mode success
      return 'paid';
    case 'failure':
    case 'error':
      return 'failed';
    case 'reversed':
      return 'refunded';
    case 'processing':
    case 'wait_accept':
    case 'wait_lc':
    case 'wait_reserve':
    case 'wait_compensation':
    default:
      return 'pending';
  }
}

/**
 * Checks payment status via LiqPay API
 */
export async function checkLiqPayPaymentStatus(orderId: string) {
  try {
    const publicKey = process.env.LIQPAY_PUBLIC_KEY;
    const privateKey = process.env.LIQPAY_PRIVATE_KEY;

    if (!publicKey || !privateKey) {
      throw new Error('LiqPay credentials are not configured');
    }

    const requestData = {
      public_key: publicKey,
      version: '3',
      action: 'status',
      order_id: orderId
    };

    const data = encodeData(requestData);
    const signature = generateSignature(data);

    const response = await fetch(LIQPAY_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({ data, signature })
    });

    if (!response.ok) {
      throw new Error(`LiqPay API error: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('LiqPay status check error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to check payment status'
    );
  }
}

/**
 * Generates LiqPay checkout form HTML
 */
export function generateLiqPayCheckoutForm(data: string, signature: string): string {
  return `
    <form method="POST" action="${LIQPAY_CHECKOUT_URL}" accept-charset="utf-8" id="liqpay-form">
      <input type="hidden" name="data" value="${data}" />
      <input type="hidden" name="signature" value="${signature}" />
    </form>
  `;
}
