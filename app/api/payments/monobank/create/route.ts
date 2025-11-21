// app/api/payments/monobank/create/route.ts
import { NextResponse } from 'next/server';
import { createMonobankInvoice } from '@/app/lib/services/monobank-service';
import { applyRateLimit, RateLimitConfig, addRateLimitHeaders } from '@/app/lib/rate-limiter';

/**
 * POST /api/payments/monobank/create
 * Creates a Monobank payment invoice
 */
export async function POST(request: Request) {
  try {
    // SECURITY: Apply strict rate limiting to prevent payment fraud
    const rateLimitResult = applyRateLimit(request, RateLimitConfig.PAYMENT);
    if (!rateLimitResult.success) {
      return rateLimitResult.response;
    }

    const body = await request.json();
    const {
      amount,
      orderId,
      orderNumber,
      customerEmail,
      resultUrl,
      cancelUrl,
      serverUrl
    } = body;

    // Validate required fields
    if (!amount || !orderId || !orderNumber) {
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

    const response = NextResponse.json({
      success: true,
      invoiceId: invoice.invoiceId,
      pageUrl: invoice.pageUrl
    });

    // Add rate limit headers to response
    return addRateLimitHeaders(response, rateLimitResult.headers);

  } catch (error) {
    console.error('Monobank payment creation error:', error);
    return NextResponse.json(
      {
        error: 'Помилка при створенні платежу Monobank',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
