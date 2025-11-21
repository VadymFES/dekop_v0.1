/**
 * Test endpoint to verify Sentry integration
 * GET /api/test-sentry - Test logging
 * GET /api/test-sentry?error=true - Test error capturing
 * GET /api/test-sentry?security=true - Test security event logging
 * GET /api/test-sentry?payment=true - Test payment audit logging
 */

import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/app/lib/logger';
import { createPaymentError, handleError } from '@/app/lib/error-handler';
import * as Sentry from '@sentry/nextjs';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const testType = searchParams.get('type') || 'info';

  try {
    // Test 1: Basic Info Logging
    if (testType === 'info') {
      logger.info('Sentry integration test - INFO level', {
        test: true,
        timestamp: new Date().toISOString(),
        endpoint: '/api/test-sentry',
      });

      return NextResponse.json({
        success: true,
        message: 'Info log sent to Sentry',
        sentryConfigured: !!process.env.SENTRY_DSN || !!process.env.NEXT_PUBLIC_SENTRY_DSN,
        timestamp: new Date().toISOString(),
      });
    }

    // Test 2: Error Capturing
    if (testType === 'error') {
      const testError = new Error('Test error for Sentry integration');
      logger.error('Sentry integration test - ERROR level', testError, {
        test: true,
        errorType: 'test',
      });

      return NextResponse.json({
        success: true,
        message: 'Error captured and sent to Sentry',
        error: testError.message,
      });
    }

    // Test 3: Security Event
    if (testType === 'security') {
      logger.security({
        type: 'other',
        severity: 'low',
        details: 'Test security event for Sentry integration',
        metadata: {
          test: true,
          source: 'test-endpoint',
        },
      }, {
        ip: request.headers.get('x-forwarded-for') || 'unknown',
      });

      return NextResponse.json({
        success: true,
        message: 'Security event sent to Sentry',
      });
    }

    // Test 4: Payment Audit Log
    if (testType === 'payment') {
      logger.paymentLog({
        event: 'success',
        provider: 'liqpay',
        orderId: 'TEST-ORDER-123',
        amount: 9999,
        transactionId: 'TEST-TXN-456',
      });

      return NextResponse.json({
        success: true,
        message: 'Payment audit log sent to Sentry',
      });
    }

    // Test 5: Handled Error
    if (testType === 'handled-error') {
      throw createPaymentError('Test payment error', {
        orderId: 'TEST-ORDER-789',
        test: true,
      });
    }

    // Test 6: Direct Sentry Test
    if (testType === 'direct') {
      Sentry.captureMessage('Direct Sentry test message', {
        level: 'info',
        tags: {
          test: true,
          endpoint: '/api/test-sentry',
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Direct Sentry message sent',
      });
    }

    // Test 7: Sentry Span/Performance
    if (testType === 'performance') {
      const result = await logger.withSpan(
        {
          op: 'test.operation',
          name: 'Sentry Performance Test',
          attributes: { test: true },
        },
        async () => {
          await new Promise(resolve => setTimeout(resolve, 100));
          return { completed: true };
        }
      );

      return NextResponse.json({
        success: true,
        message: 'Performance span sent to Sentry',
        result,
      });
    }

    // Default: Show available tests
    return NextResponse.json({
      success: true,
      message: 'Sentry integration test endpoint',
      availableTests: {
        info: '/api/test-sentry?type=info',
        error: '/api/test-sentry?type=error',
        security: '/api/test-sentry?type=security',
        payment: '/api/test-sentry?type=payment',
        'handled-error': '/api/test-sentry?type=handled-error',
        direct: '/api/test-sentry?type=direct',
        performance: '/api/test-sentry?type=performance',
      },
      configuration: {
        sentryDsnConfigured: !!process.env.SENTRY_DSN,
        publicSentryDsnConfigured: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
        nodeEnv: process.env.NODE_ENV,
      },
    });

  } catch (error) {
    return handleError(error instanceof Error ? error : new Error('Unknown error'), {
      endpoint: '/api/test-sentry',
      testType,
    });
  }
}
