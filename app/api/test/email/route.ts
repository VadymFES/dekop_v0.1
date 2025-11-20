import { NextResponse } from 'next/server';
import { sendOrderConfirmationEmail } from '@/app/lib/services/email-service';
import { validateInternalApiKey, getUnauthorizedResponse } from '@/app/lib/api-auth';

/**
 * Email Configuration Diagnostic Tool
 *
 * GET /api/test/email - Check email configuration (no auth required)
 * POST /api/test/email - Send test email (requires API key and test_email query param)
 *
 * Usage:
 * - GET: curl https://your-domain.com/api/test/email
 * - POST: curl -X POST "https://your-domain.com/api/test/email?test_email=test@example.com" -H "x-api-key: your-key"
 */

export async function GET() {
  const diagnostics = {
    resendKeyConfigured: !!process.env.RESEND_API_KEY,
    fromEmail: process.env.RESEND_FROM_EMAIL || 'NOT CONFIGURED (defaults to noreply@dekop.com.ua)',
    fromName: process.env.RESEND_FROM_NAME || 'NOT CONFIGURED (defaults to Dekop Furniture Store)',
    nodeEnv: process.env.NODE_ENV,
  };

  return NextResponse.json(
    {
      status: 'Email configuration check',
      emailService: 'Resend',
      config: diagnostics,
      webhookFlow: {
        liqpay: 'POST /api/webhooks/liqpay → handleLiqPayPaymentSuccess → sendOrderConfirmationEmail',
        monobank: 'POST /api/webhooks/monobank → handleMonobankPaymentSuccess → sendOrderConfirmationEmail',
        manual: 'POST /api/orders/send-confirmation → sendOrderConfirmationEmail'
      },
      message: diagnostics.resendKeyConfigured
        ? '✅ Resend API key is configured - email service should work'
        : '⚠️ RESEND_API_KEY is not configured - emails will not be sent',
      recommendation: diagnostics.resendKeyConfigured
        ? 'Use POST /api/test/email?test_email=YOUR_EMAIL to send a test email'
        : 'Please configure RESEND_API_KEY in your environment variables (see RESEND_SETUP.md)'
    },
    {
      headers: {
        'X-Robots-Tag': 'noindex',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      }
    }
  );
}

export async function POST(request: Request) {
  // Validate API key
  if (!validateInternalApiKey(request)) {
    const errorResponse = getUnauthorizedResponse();
    return NextResponse.json(
      { error: errorResponse.error, message: errorResponse.message },
      {
        status: errorResponse.status,
        headers: {
          'X-Robots-Tag': 'noindex',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        }
      }
    );
  }

  const { searchParams } = new URL(request.url);
  const testEmail = searchParams.get('test_email');

  if (!testEmail) {
    return NextResponse.json(
      {
        error: 'Missing test_email query parameter',
        usage: 'POST /api/test/email?test_email=your@email.com'
      },
      {
        status: 400,
        headers: {
          'X-Robots-Tag': 'noindex',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        }
      }
    );
  }

  if (!process.env.RESEND_API_KEY) {
    return NextResponse.json(
      {
        error: 'Email service not configured',
        message: 'RESEND_API_KEY is not set',
        help: 'See RESEND_SETUP.md for setup instructions',
        config: {
          resendKeyConfigured: false,
          fromEmail: process.env.RESEND_FROM_EMAIL || 'NOT CONFIGURED',
        }
      },
      {
        status: 500,
        headers: {
          'X-Robots-Tag': 'noindex',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        }
      }
    );
  }

  // Create a test order object with proper types
  const testOrder = {
    id: 'test-' + Date.now(),
    order_number: 'TEST-' + Math.floor(Math.random() * 10000),
    user_name: 'Тестовий',
    user_surname: 'Користувач',
    user_email: testEmail,
    user_phone: '+380123456789',
    delivery_method: 'nova_poshta',
    delivery_city: 'Київ',
    delivery_street: 'вул. Тестова',
    delivery_building: '1',
    delivery_apartment: '42',
    delivery_postal_code: '01001',
    store_location: null,

    // Pricing - must be numbers, not strings
    subtotal: 15000,
    discount_percent: 0,
    discount_amount: 0,
    delivery_cost: 0,
    total_amount: 15000,
    prepayment_amount: 0,

    payment_method: 'liqpay',
    payment_status: 'paid',
    order_status: 'confirmed',
    customer_notes: 'Це тестове замовлення для перевірки email',

    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),

    items: [
      {
        id: 'item-1',
        order_id: 'test-' + Date.now(),
        product_id: 'prod-test-1',
        product_name: 'Тестовий диван "Комфорт"',
        product_slug: 'test-sofa-comfort',
        product_article: 'TST-001',
        quantity: 1,
        color: 'Сірий',
        unit_price: 15000,
        total_price: 15000,
        product_image_url: 'https://via.placeholder.com/150',
        product_category: 'sofas',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ]
  };

  try {
    const result = await sendOrderConfirmationEmail({
      order: testOrder as any,
      to: testEmail,
      customerName: 'Тестовий Користувач'
    });

    // If we reach here, email was sent successfully (otherwise it would throw)
    return NextResponse.json(
      {
        success: true,
        message: `Test email sent successfully to ${testEmail}`,
        messageId: result.messageId,
        status: result.status,
        testOrder: {
          order_number: testOrder.order_number,
          total_amount: testOrder.total_amount
        }
      },
      {
        headers: {
          'X-Robots-Tag': 'noindex',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        }
      }
    );
  } catch (error) {
    console.error('Error sending test email:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Email sending failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      {
        status: 500,
        headers: {
          'X-Robots-Tag': 'noindex',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        }
      }
    );
  }
}
