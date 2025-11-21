// app/api/payments/monobank/create/route.ts
import { NextResponse } from 'next/server';
import { createMonobankInvoice } from '@/app/lib/services/monobank-service';
import { logger } from '@/app/lib/logger';
import * as Sentry from '@sentry/nextjs';

/**
 * POST /api/payments/monobank/create
 * Creates a Monobank payment invoice
 */
export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
    const {
      amount,
      orderId,
      orderNumber,
      customerEmail,
      resultUrl,
      cancelUrl,
      serverUrl
    } = body;

    return await Sentry.startSpan(
      {
        op: 'payment.create',
        name: 'Create Monobank Payment',
        attributes: {
          provider: 'monobank',
          orderId: orderId,
          amount: amount
        }
      },
      async () => {
        // Validate required fields
        if (!amount || !orderId || !orderNumber) {
          Sentry.metrics.increment('payment.failed', 1, { tags: { provider: 'monobank', error: 'validation_failed' } });
          return NextResponse.json(
            { error: 'Missing required fields' },
            { status: 400 }
          );
        }

        // Create Monobank invoice
        const invoice = await createMonobankInvoice({
          amount,
          orderId,
          orderNumber,
          customerEmail,
          redirectUrl: resultUrl,
          cancelUrl: cancelUrl,
          webhookUrl: serverUrl
        });

        // Track successful payment creation
        Sentry.metrics.increment('payment.created', 1, { tags: { provider: 'monobank' } });
        Sentry.metrics.distribution('payment.amount', amount, { unit: 'uah', tags: { provider: 'monobank' } });

        return NextResponse.json({
          success: true,
          invoiceId: invoice.invoiceId,
          pageUrl: invoice.pageUrl
        });
      }
    );

  } catch (error) {
    logger.error(
      'Monobank payment creation error',
      error instanceof Error ? error : new Error(String(error)),
      {
        provider: 'monobank',
        orderId: body?.orderId,
        amount: body?.amount,
        orderNumber: body?.orderNumber
      }
    );
    Sentry.metrics.increment('payment.failed', 1, { tags: { provider: 'monobank', error: 'exception' } });
    return NextResponse.json(
      {
        error: 'Помилка при створенні платежу Monobank',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
