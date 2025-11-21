import { NextResponse } from 'next/server';
import { createLiqPayPayment } from '@/app/lib/services/liqpay-service';
import { logger } from '@/app/lib/logger';
import * as Sentry from '@sentry/nextjs';

export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
    const {
      amount,
      orderId,
      orderNumber,
      description,
      customerEmail,
      resultUrl,
      cancelUrl,
      serverUrl
    } = body;

    return await Sentry.startSpan(
      {
        op: 'payment.create',
        name: 'Create LiqPay Payment',
        attributes: {
          provider: 'liqpay',
          orderId: orderId,
          amount: amount
        }
      },
      async () => {
        // Validate required fields
        if (!amount || !orderId || !orderNumber) {
          Sentry.metrics.increment('payment.failed', 1, { tags: { provider: 'liqpay', error: 'validation_failed' } });
          return NextResponse.json(
            { error: 'Відсутні обов\'язкові поля' },
            { status: 400 }
          );
        }

        // Create LiqPay payment on server-side (with private key)
        const payment = await createLiqPayPayment({
          amount,
          orderId,
          orderNumber,
          description,
          customerEmail,
          resultUrl,
          cancelUrl,
          serverUrl
        });

        if (!payment.success) {
          Sentry.metrics.increment('payment.failed', 1, { tags: { provider: 'liqpay', error: 'payment_creation_failed' } });
          return NextResponse.json(
            { error: 'Помилка при створенні платежу' },
            { status: 500 }
          );
        }

        // Track successful payment creation
        Sentry.metrics.increment('payment.created', 1, { tags: { provider: 'liqpay' } });
        Sentry.metrics.distribution('payment.amount', amount, { unit: 'uah', tags: { provider: 'liqpay' } });

        // Return payment data and signature to client
        return NextResponse.json({
          success: true,
          data: payment.data,
          signature: payment.signature,
          checkoutUrl: payment.checkoutUrl
        });
      }
    );

  } catch (error) {
    logger.error(
      'LiqPay payment creation error',
      error instanceof Error ? error : new Error(String(error)),
      {
        provider: 'liqpay',
        orderId: body?.orderId,
        amount: body?.amount,
        orderNumber: body?.orderNumber
      }
    );
    Sentry.metrics.increment('payment.failed', 1, { tags: { provider: 'liqpay', error: 'exception' } });
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Помилка при створенні платежу',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}
