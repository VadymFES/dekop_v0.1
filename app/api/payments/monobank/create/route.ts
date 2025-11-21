// app/api/payments/monobank/create/route.ts
import { NextResponse } from 'next/server';
import { createMonobankInvoice } from '@/app/lib/services/monobank-service';

/**
 * POST /api/payments/monobank/create
 * Creates a Monobank payment invoice
 */
export async function POST(request: Request) {
  try {
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

    return NextResponse.json({
      success: true,
      invoiceId: invoice.invoiceId,
      pageUrl: invoice.pageUrl
    });

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
