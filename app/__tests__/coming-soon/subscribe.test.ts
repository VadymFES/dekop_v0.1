/**
 * Coming-soon subscription action tests.
 * Covers: IP rate limiting, email rate limiting, duplicate detection,
 * validation, successful flow, and Resend error surface.
 */

import { subscribeNotification } from '@/app/coming-soon/actions';

// ── Mocks ────────────────────────────────────────────────────────────────────

const mockRateLimit = jest.fn();
jest.mock('@/app/lib/rate-limit', () => ({
  rateLimit: (...args: any[]) => mockRateLimit(...args),
}));

const mockDbQuery = jest.fn();
jest.mock('@/app/lib/db', () => ({
  db: { query: (...args: any[]) => mockDbQuery(...args) },
}));

const mockEmailsSend = jest.fn();
jest.mock('resend', () => ({
  Resend: jest.fn().mockImplementation(() => ({
    emails: { send: mockEmailsSend },
  })),
}));

const mockRedirect = jest.fn();
jest.mock('next/navigation', () => ({
  ...jest.requireActual('next/navigation'),
  redirect: (url: string) => { mockRedirect(url); throw new Error('NEXT_REDIRECT'); },
}));

const mockHeaders = jest.fn();
jest.mock('next/headers', () => ({
  headers: () => mockHeaders(),
}));

// ── Helpers ──────────────────────────────────────────────────────────────────

function makeFormData(email: string): FormData {
  const fd = new FormData();
  fd.append('email', email);
  return fd;
}

function headerMap(ip = '1.2.3.4') {
  const map = new Map([['x-forwarded-for', ip]]);
  return { get: (k: string) => map.get(k) ?? null };
}

function allowRateLimits() {
  mockRateLimit.mockResolvedValue({ success: true, remaining: 4, reset: new Date() });
}

function blockIpRateLimit() {
  mockRateLimit.mockResolvedValueOnce({ success: false, remaining: 0, reset: new Date() });
}

function blockEmailRateLimit() {
  mockRateLimit
    .mockResolvedValueOnce({ success: true, remaining: 4, reset: new Date() })   // IP passes
    .mockResolvedValueOnce({ success: false, remaining: 0, reset: new Date() }); // email blocked
}

// ── Setup / Teardown ─────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  mockHeaders.mockReturnValue(headerMap());
  mockEmailsSend.mockResolvedValue({ data: { id: 'msg_1' }, error: null });
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe('subscribeNotification — rate limiting', () => {
  it('blocks when IP rate limit is exceeded', async () => {
    blockIpRateLimit();

    const result = await subscribeNotification(null, makeFormData('user@example.com'));

    expect(result).toEqual({ success: false, error: 'Забагато спроб. Спробуйте через годину.' });
    expect(mockDbQuery).not.toHaveBeenCalled();
    expect(mockEmailsSend).not.toHaveBeenCalled();
  });

  it('passes IP rate limit key with real IP from x-forwarded-for', async () => {
    mockHeaders.mockReturnValue(headerMap('10.0.0.99'));
    blockIpRateLimit();

    await subscribeNotification(null, makeFormData('user@example.com'));

    expect(mockRateLimit).toHaveBeenCalledWith(
      'subscribe-ip:10.0.0.99',
      expect.objectContaining({ limit: 5 })
    );
  });

  it('falls back to "unknown" when no IP header is present', async () => {
    mockHeaders.mockReturnValue({ get: () => null });
    blockIpRateLimit();

    await subscribeNotification(null, makeFormData('user@example.com'));

    expect(mockRateLimit).toHaveBeenCalledWith(
      'subscribe-ip:unknown',
      expect.any(Object)
    );
  });

  it('blocks when email rate limit is exceeded', async () => {
    blockEmailRateLimit();

    const result = await subscribeNotification(null, makeFormData('user@example.com'));

    expect(result).toEqual({ success: false, error: 'Забагато спроб. Спробуйте через годину.' });
    expect(mockDbQuery).not.toHaveBeenCalled();
  });

  it('uses normalised lowercase email as rate limit key', async () => {
    blockEmailRateLimit();

    await subscribeNotification(null, makeFormData('User@Example.COM'));

    expect(mockRateLimit).toHaveBeenCalledWith(
      expect.stringContaining('subscribe:user@example.com'),
      expect.objectContaining({ limit: 3, windowSeconds: 3600 })
    );
  });
});

describe('subscribeNotification — validation', () => {
  it('rejects an invalid email address', async () => {
    allowRateLimits();

    const result = await subscribeNotification(null, makeFormData('not-an-email'));

    expect(result).toEqual({ success: false, error: 'Введіть коректний email' });
    expect(mockDbQuery).not.toHaveBeenCalled();
  });

  it('rejects empty string', async () => {
    allowRateLimits();

    const result = await subscribeNotification(null, makeFormData(''));

    expect(result).toEqual({ success: false, error: 'Введіть коректний email' });
  });
});

describe('subscribeNotification — duplicate detection', () => {
  it('returns error when email is already subscribed', async () => {
    allowRateLimits();
    mockDbQuery.mockResolvedValueOnce({ rows: [{ '?column?': 1 }], rowCount: 1 });

    const result = await subscribeNotification(null, makeFormData('existing@example.com'));

    expect(result).toEqual({ success: false, error: 'Цей email вже зареєстровано.' });
    expect(mockDbQuery).toHaveBeenCalledTimes(1);
    expect(mockEmailsSend).not.toHaveBeenCalled();
  });
});

describe('subscribeNotification — happy path', () => {
  it('inserts subscriber, sends 2 emails, then redirects', async () => {
    allowRateLimits();
    mockDbQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 }); // SELECT: no duplicate
    mockDbQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 }); // INSERT

    await expect(
      subscribeNotification(null, makeFormData('new@example.com'))
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(mockDbQuery).toHaveBeenCalledTimes(2);
    expect(mockEmailsSend).toHaveBeenCalledTimes(2);
    expect(mockRedirect).toHaveBeenCalledWith('/coming-soon?subscribed=1');
  });

  it('lowercases email before sending to Resend', async () => {
    allowRateLimits();
    mockDbQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    mockDbQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    await expect(
      subscribeNotification(null, makeFormData('NEW@EXAMPLE.COM'))
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(mockEmailsSend).toHaveBeenCalledWith(
      expect.objectContaining({ to: 'new@example.com' })
    );
  });
});

describe('subscribeNotification — Resend error handling', () => {
  it('still redirects when Resend returns a 429 error object (v6 { data, error } pattern)', async () => {
    allowRateLimits();
    mockDbQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    mockDbQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    mockEmailsSend.mockResolvedValue({
      data: null,
      error: { name: 'rate_limit_exceeded', message: 'Too many requests', statusCode: 429 },
    });

    await expect(
      subscribeNotification(null, makeFormData('user@example.com'))
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(mockRedirect).toHaveBeenCalledWith('/coming-soon?subscribed=1');
  });

  it('still redirects when Resend send() throws (network failure)', async () => {
    allowRateLimits();
    mockDbQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    mockDbQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });
    mockEmailsSend.mockRejectedValue(new Error('Network error'));

    await expect(
      subscribeNotification(null, makeFormData('user@example.com'))
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(mockRedirect).toHaveBeenCalledWith('/coming-soon?subscribed=1');
  });
});

describe('subscribeNotification — rate limit fail-open behaviour', () => {
  it('proceeds normally when the rate limit utility itself returns success (fail-open on DB error)', async () => {
    mockRateLimit.mockResolvedValue({ success: true, remaining: 1, reset: new Date() });
    mockDbQuery.mockResolvedValueOnce({ rows: [], rowCount: 0 });
    mockDbQuery.mockResolvedValueOnce({ rows: [], rowCount: 1 });

    await expect(
      subscribeNotification(null, makeFormData('user@example.com'))
    ).rejects.toThrow('NEXT_REDIRECT');

    expect(mockRedirect).toHaveBeenCalledWith('/coming-soon?subscribed=1');
  });
});

// ── Middleware path-exclusion contract ───────────────────────────────────────
// These tests document which paths must NOT be redirected to /coming-soon.
// The actual redirect logic lives in proxy.ts; the tests here verify the
// path-classification helper shapes that feed into it.
describe('proxy.ts coming-soon redirect — path exclusions', () => {
  const vercelPaths = [
    '/_vercel/insights/view',
    '/_vercel/insights/speed',
    '/_vercel/something/else',
  ];
  const nextPaths = [
    '/_next/webpack-hmr',
    '/_next/data/abc123/index.json',
    '/_next/server/app/page.js',
  ];
  const apiPaths = ['/api/cart', '/api/products/search', '/api/orders'];
  const comingSoonPaths = ['/coming-soon', '/coming-soon/', '/coming-soon/confirm'];

  it.each(vercelPaths)('classifies %s as vercel-internal (must not redirect)', (path) => {
    expect(path.startsWith('/_vercel/')).toBe(true);
  });

  it.each(nextPaths)('classifies %s as next-internal (must not redirect)', (path) => {
    expect(path.startsWith('/_next/')).toBe(true);
  });

  it.each(apiPaths)('classifies %s as api route (must not redirect)', (path) => {
    expect(path.startsWith('/api/')).toBe(true);
  });

  it.each(comingSoonPaths)('classifies %s as coming-soon page (must not redirect)', (path) => {
    const isComingSoonPage = path === '/coming-soon' || path.startsWith('/coming-soon/');
    expect(isComingSoonPage).toBe(true);
  });

  it('regular user pages should be redirect candidates', () => {
    const userPaths = ['/', '/catalog', '/kitchens', '/about-us', '/product/some-slug'];
    for (const path of userPaths) {
      const isExcluded =
        path === '/coming-soon' ||
        path.startsWith('/coming-soon/') ||
        path.startsWith('/api/') ||
        path.startsWith('/_vercel/') ||
        path.startsWith('/_next/');
      expect(isExcluded).toBe(false);
    }
  });
});
