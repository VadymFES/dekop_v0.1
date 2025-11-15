// app/lib/services/monobank-service.ts

/**
 * Monobank Acquiring API Integration
 * Documentation: https://api.monobank.ua/docs/acquiring.html
 */

const MONOBANK_API_BASE = 'https://api.monobank.ua/api/merchant';

export interface CreateMonobankInvoiceParams {
  amount: number; // Amount in hryvnias
  orderId: string;
  orderNumber: string;
  customerEmail?: string;
  redirectUrl: string;
  webhookUrl: string;
}

export interface MonobankInvoiceResponse {
  invoiceId: string;
  pageUrl: string;
}

/**
 * Creates a Monobank payment invoice
 */
export async function createMonobankInvoice(
  params: CreateMonobankInvoiceParams
): Promise<MonobankInvoiceResponse> {
  try {
    const token = process.env.MONOBANK_TOKEN;

    if (!token) {
      throw new Error('Monobank token is not configured');
    }

    const {
      amount,
      orderId,
      orderNumber,
      customerEmail,
      redirectUrl,
      webhookUrl
    } = params;

    // Convert to kopiykas (smallest unit, 1 UAH = 100 kopiykas)
    const amountInKopiykas = Math.round(amount * 100);

    const body = {
      amount: amountInKopiykas,
      ccy: 980, // UAH currency code (ISO 4217)
      merchantPaymInfo: {
        reference: orderId, // Internal order ID
        destination: `Оплата замовлення ${orderNumber}`,
        comment: `Dekop Furniture - Замовлення ${orderNumber}`,
        customerEmails: customerEmail ? [customerEmail] : undefined,
      },
      redirectUrl,
      webHookUrl: webhookUrl,
      validity: 3600, // Invoice validity in seconds (1 hour)
    };

    const response = await fetch(`${MONOBANK_API_BASE}/invoice/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Token': token,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Monobank API error: ${response.status} - ${JSON.stringify(errorData)}`
      );
    }

    const data = await response.json();

    return {
      invoiceId: data.invoiceId,
      pageUrl: data.pageUrl,
    };
  } catch (error) {
    console.error('Monobank invoice creation error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to create Monobank invoice'
    );
  }
}

/**
 * Retrieves invoice status from Monobank
 */
export async function getMonobankInvoiceStatus(invoiceId: string) {
  try {
    const token = process.env.MONOBANK_TOKEN;

    if (!token) {
      throw new Error('Monobank token is not configured');
    }

    const response = await fetch(
      `${MONOBANK_API_BASE}/invoice/status?invoiceId=${invoiceId}`,
      {
        method: 'GET',
        headers: {
          'X-Token': token,
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Monobank API error: ${response.status} - ${JSON.stringify(errorData)}`
      );
    }

    const data = await response.json();

    return {
      status: data.status, // created, processing, hold, success, failure, reversed
      amount: data.amount,
      ccy: data.ccy,
      createdDate: data.createdDate,
      modifiedDate: data.modifiedDate,
      reference: data.reference,
    };
  } catch (error) {
    console.error('Monobank get invoice status error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to get invoice status'
    );
  }
}

/**
 * Cancels a Monobank invoice
 */
export async function cancelMonobankInvoice(invoiceId: string) {
  try {
    const token = process.env.MONOBANK_TOKEN;

    if (!token) {
      throw new Error('Monobank token is not configured');
    }

    const response = await fetch(`${MONOBANK_API_BASE}/invoice/cancel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Token': token,
      },
      body: JSON.stringify({ invoiceId }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        `Monobank API error: ${response.status} - ${JSON.stringify(errorData)}`
      );
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Monobank cancel invoice error:', error);
    throw new Error(
      error instanceof Error ? error.message : 'Failed to cancel invoice'
    );
  }
}

/**
 * Verifies Monobank webhook signature using X.509 public key
 * Monobank sends X-Sign header with webhook requests
 * Documentation: https://api.monobank.ua/docs/acquiring.html#webhook
 */
export function verifyMonobankWebhook(
  publicKeyPem: string,
  xSignBase64: string,
  bodyString: string
): boolean {
  try {
    if (!xSignBase64 || !bodyString || !publicKeyPem) {
      console.error('Missing parameters for Monobank webhook verification');
      return false;
    }

    // Import crypto module
    const crypto = require('crypto');

    // Create verifier with SHA-256
    const verifier = crypto.createVerify('SHA256');
    verifier.update(bodyString);

    // Verify signature using Monobank's public key
    const isValid = verifier.verify(
      publicKeyPem,
      xSignBase64,
      'base64'
    );

    if (!isValid) {
      console.error('Monobank webhook signature verification failed');
      console.error('Body length:', bodyString.length);
    }

    return isValid;
  } catch (error) {
    console.error('Monobank webhook verification error:', error);
    return false;
  }
}

/**
 * Converts Monobank payment status to our internal payment status
 */
export function mapMonobankStatus(monobankStatus: string): 'pending' | 'paid' | 'failed' | 'refunded' {
  switch (monobankStatus) {
    case 'success':
      return 'paid';
    case 'failure':
    case 'expired':
      return 'failed';
    case 'reversed':
      return 'refunded';
    case 'created':
    case 'processing':
    case 'hold':
    default:
      return 'pending';
  }
}
