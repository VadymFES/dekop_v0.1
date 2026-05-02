/**
 * Admin Login API Route
 * POST /[admin-path-57fyg]/api/auth/login
 */

import { NextRequest, NextResponse } from 'next/server';
import { authenticateAdmin, setSessionCookie, hashToken } from '@/app/lib/admin-auth';
import { adminLoginSchema, safeValidateInput, formatValidationErrors } from '@/app/lib/admin-validation';
import { generateCsrfToken, setCsrfCookie } from '@/app/lib/csrf-protection';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validate input
    const validation = safeValidateInput(adminLoginSchema, body);
    if (!validation.success) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        errors: formatValidationErrors(validation.error),
      }, { status: 400 });
    }

    const { email, password } = validation.data;

    // Get request metadata
    const ipAddress = request.headers.get('x-forwarded-for') ||
                      request.headers.get('x-real-ip') ||
                      'unknown';
    const userAgent = request.headers.get('user-agent');

    // Authenticate
    const result = await authenticateAdmin(email, password, ipAddress, userAgent);

    if (!result.success) {
      return NextResponse.json({
        success: false,
        error: result.error,
      }, { status: 401 });
    }

    // Set session cookie
    await setSessionCookie(result.token!);

    // Generate and set CSRF token (Task 6)
    const sessionTokenHash = hashToken(result.token!);
    const csrfToken = generateCsrfToken(sessionTokenHash);
    await setCsrfCookie(csrfToken);

    return NextResponse.json({
      success: true,
      user: {
        id: result.user!.id,
        email: result.user!.email,
        first_name: result.user!.first_name,
        last_name: result.user!.last_name,
      },
      csrfToken, // Include CSRF token in response for immediate client use
    });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({
      success: false,
      error: 'An error occurred during login',
    }, { status: 500 });
  }
}
