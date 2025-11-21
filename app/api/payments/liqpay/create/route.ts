import { NextResponse } from 'next/server';
import { createLiqPayPayment } from '@/app/lib/services/liqpay-service';

export async function POST(request: Request) {
  try {
    const body = await request.json();
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

    // Validate required fields
    if (!amount || !orderId || !orderNumber) {
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
      return NextResponse.json(
        { error: 'Помилка при створенні платежу' },
        { status: 500 }
      );
    }

    // Return payment data and signature to client
    return NextResponse.json({
      success: true,
      data: payment.data,
      signature: payment.signature,
      checkoutUrl: payment.checkoutUrl
    });

  } catch (error) {
    console.error('LiqPay payment creation error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Помилка при створенні платежу',
        details: process.env.NODE_ENV === 'development' ? String(error) : undefined
      },
      { status: 500 }
    );
  }
}
