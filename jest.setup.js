// Learn more: https://github.com/testing-library/jest-dom
// Note: jest-dom is primarily for React component testing
// For API/service tests, we don't need it
// import '@testing-library/jest-dom'

// Mock environment variables for tests
process.env.LIQPAY_PUBLIC_KEY = 'test_public_key'
process.env.LIQPAY_PRIVATE_KEY = 'test_private_key'
process.env.MONOBANK_TOKEN = 'test_monobank_token'
process.env.MONOBANK_WEBHOOK_PUBLIC_KEY = `-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAtest
-----END PUBLIC KEY-----`
process.env.API_KEY = 'test_api_key'
process.env.RESEND_API_KEY = 'test_resend_key'
process.env.POSTGRES_URL = 'postgresql://test:test@localhost:5432/test'
process.env.NEXT_PUBLIC_SITE_URL = 'http://localhost:3000'
process.env.DISABLE_WEBHOOK_IP_VALIDATION = 'true' // Disable IP validation for tests

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      pathname: '/',
      query: {},
      asPath: '/',
    }
  },
  usePathname() {
    return '/'
  },
  useSearchParams() {
    return new URLSearchParams()
  },
}))

// Mock window.matchMedia (only needed for browser/React component tests)
// For Node.js API tests, window is not defined
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: jest.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  })
}

// Suppress console errors in tests (optional - can be helpful to reduce noise)
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      (args[0].includes('Warning: ReactDOM.render') ||
       args[0].includes('Not implemented: HTMLFormElement.prototype.submit'))
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

afterAll(() => {
  console.error = originalError
})
