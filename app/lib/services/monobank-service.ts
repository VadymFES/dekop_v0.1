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
  cancelUrl?: string; // URL to redirect if payment is cancelled
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
      cancelUrl,
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
      ...(cancelUrl && { cancelUrl }), // Optional cancel URL
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
 * Verifies Monobank webhook signature
 * Monobank sends X-Sign header with webhook requests
 *
 * SECURITY: This function verifies that webhook requests actually come from Monobank
 * by validating the RSA-SHA256 signature using Monobank's public key
 *
 * @param publicKey - Monobank's public key in PEM format
 * @param xSignBase64 - Base64-encoded signature from X-Sign header
 * @param bodyString - Raw request body as string
 * @returns true if signature is valid, false otherwise
 */
export function verifyMonobankWebhook(
  publicKey: string,
  xSignBase64: string,
  bodyString: string
): boolean {
  try {
    // Validate required parameters
    if (!publicKey || !xSignBase64 || !bodyString) {
      console.error('Monobank webhook verification failed: Missing required parameters', {
        hasPublicKey: !!publicKey,
        hasSignature: !!xSignBase64,
        hasBody: !!bodyString
      });
      return false;
    }

    // Import crypto module
    const crypto = require('crypto');

    // Create verifier with SHA256 algorithm
    const verifier = crypto.createVerify('SHA256');

    // Update with request body
    verifier.update(bodyString);

    // Verify signature using Monobank's public key
    // The signature is base64-encoded, so we specify 'base64' as the encoding
    const isValid = verifier.verify(publicKey, xSignBase64, 'base64');

    if (!isValid) {
      console.error('Monobank webhook signature verification failed: Invalid signature');
    }

    return isValid;
  } catch (error) {
    console.error('Monobank webhook verification error:', error);
    if (error instanceof Error) {
      console.error('Error details:', {
        message: error.message,
        stack: error.stack
      });
    }
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
