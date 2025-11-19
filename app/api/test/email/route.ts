import { NextResponse } from 'next/server';
import { sendOrderConfirmationEmail } from '@/app/lib/services/email-service';

/**
 * Email Configuration Diagnostic Tool
 *
 * GET /api/test/email - Check email configuration
 * POST /api/test/email - Send test email (requires test_email query param)
 *
 * Usage:
 * - GET: curl https://your-domain.com/api/test/email
 * - POST: curl -X POST "https://your-domain.com/api/test/email?test_email=test@example.com"
 */

export async function GET() {
  const diagnostics = {
    mailchimpKeyConfigured: !!process.env.MAILCHIMP_TRANSACTIONAL_API_KEY,
    fromEmail: process.env.MAILCHIMP_FROM_EMAIL || 'NOT CONFIGURED (defaults to orders@dekop.com)',
    fromName: process.env.MAILCHIMP_FROM_NAME || 'NOT CONFIGURED (defaults to Dekop)',
    nodeEnv: process.env.NODE_ENV,
  };

  return NextResponse.json({
    status: 'Email configuration check',
    config: diagnostics,
    webhookFlow: {
      liqpay: 'POST /api/webhooks/liqpay → handleLiqPayPaymentSuccess → sendOrderConfirmationEmail',
      monobank: 'POST /api/webhooks/monobank → handleMonobankPaymentSuccess → sendOrderConfirmationEmail',
      manual: 'POST /api/orders/send-confirmation → sendOrderConfirmationEmail'
    },
    message: diagnostics.mailchimpKeyConfigured
      ? '✅ Mailchimp API key is configured - email service should work'
      : '⚠️ MAILCHIMP_TRANSACTIONAL_API_KEY is not configured - emails will not be sent',
    recommendation: diagnostics.mailchimpKeyConfigured
      ? 'Use POST /api/test/email?test_email=YOUR_EMAIL to send a test email'
      : 'Please configure MAILCHIMP_TRANSACTIONAL_API_KEY in your environment variables'
  });
}

export async function POST(request: Request) {
  const { searchParams } = new URL(request.url);
  const testEmail = searchParams.get('test_email');

  if (!testEmail) {
    return NextResponse.json({
      error: 'Missing test_email query parameter',
      usage: 'POST /api/test/email?test_email=your@email.com'
    }, { status: 400 });
  }

  if (!process.env.MAILCHIMP_TRANSACTIONAL_API_KEY) {
    return NextResponse.json({
      error: 'Email service not configured',
      message: 'MAILCHIMP_TRANSACTIONAL_API_KEY is not set',
      config: {
        mailchimpKeyConfigured: false,
        fromEmail: process.env.MAILCHIMP_FROM_EMAIL || 'NOT CONFIGURED',
      }
    }, { status: 500 });
  }

  // Create a test order object
  const testOrder = {
    id: 'test-' + Date.now(),
    order_number: 'TEST-' + Math.floor(Math.random() * 10000),
    user_name: 'Тестовий',
    user_surname: 'Користувач',
    user_email: testEmail,
    user_phone: '+380123456789',
    delivery_city: 'Київ',
    delivery_address: 'вул. Тестова, 1',
    delivery_method: 'Нова Пошта',
    payment_method: 'Тестова оплата',
    total_amount: '1234.56',
    created_at: new Date().toISOString(),
    order_status: 'confirmed',
    payment_status: 'paid',
    items: [
      {
        product_name: 'Тестовий товар',
        quantity: 1,
        price: '1234.56',
        image_url: 'https://via.placeholder.com/150'
      }
    ]
  };

  try {
    const result = await sendOrderConfirmationEmail({
      order: testOrder as any,
      to: testEmail,
      customerName: 'Тестовий Користувач'
    });

    if (result.success) {
      return NextResponse.json({
        success: true,
        message: `Test email sent successfully to ${testEmail}`,
        messageId: result.messageId,
        testOrder: {
          order_number: testOrder.order_number,
          total_amount: testOrder.total_amount
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Email sending failed',
        error: result.error
      }, { status: 500 });
    }
  } catch (error) {
    console.error('Error sending test email:', error);
    return NextResponse.json({
      success: false,
      message: 'Email sending failed',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
