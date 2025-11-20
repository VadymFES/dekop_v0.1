const express = require('express');
const app = express();

// Зберігаємо raw body для signature verification
app.use(express.raw({
  type: ['application/x-www-form-urlencoded', 'application/json'],
  limit: '10mb'
}));

// Конфігурація з environment variables
const config = {
  vercelDomain: process.env.VERCEL_DOMAIN || 'your-domain.vercel.app',
  bypassToken: process.env.VERCEL_PROTECTION_BYPASS_TOKEN,
  port: process.env.PORT || 3000
};

// Validate config
if (!config.bypassToken) {
  console.error('❌ ERROR: VERCEL_PROTECTION_BYPASS_TOKEN not set!');
  process.exit(1);
}

console.log('✅ Webhook Relay Configuration:');
console.log('   Vercel Domain:', config.vercelDomain);
console.log('   Bypass Token:', config.bypassToken ? '✅ Set' : '❌ Not set');
console.log('   Port:', config.port);

/**
 * Relay webhook to Vercel with bypass token
 */
async function relayWebhook(path, body, headers) {
  const url = `https://${config.vercelDomain}${path}`;

  console.log(`📨 Relaying webhook to: ${url}`);
  console.log(`   Headers:`, Object.keys(headers).join(', '));
  console.log(`   Body length:`, body.length);

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: body,
      headers: {
        // Forward original headers
        ...headers,
        // Add bypass token
        'x-vercel-protection-bypass': config.bypassToken,
        // Remove host header (will be set automatically)
        'host': undefined,
      }
    });

    const responseText = await response.text();

    console.log(`✅ Relayed successfully:`, {
      status: response.status,
      statusText: response.statusText,
      body: responseText.substring(0, 200)
    });

    return {
      status: response.status,
      body: responseText,
      headers: Object.fromEntries(response.headers.entries())
    };
  } catch (error) {
    console.error(`❌ Relay failed:`, error.message);
    throw error;
  }
}

/**
 * LiqPay webhook endpoint
 */
app.post('/liqpay', async (req, res) => {
  console.log('\n🔔 LiqPay webhook received');

  try {
    const result = await relayWebhook(
      '/api/webhooks/liqpay',
      req.body,
      {
        'content-type': req.headers['content-type'] || 'application/x-www-form-urlencoded',
        'user-agent': req.headers['user-agent'],
        'x-forwarded-for': req.headers['x-forwarded-for'] || req.ip,
      }
    );

    res.status(result.status).send(result.body);
  } catch (error) {
    console.error('❌ LiqPay relay error:', error);
    res.status(500).send('Relay error');
  }
});

/**
 * Monobank webhook endpoint
 */
app.post('/monobank', async (req, res) => {
  console.log('\n🔔 Monobank webhook received');

  try {
    const result = await relayWebhook(
      '/api/webhooks/monobank',
      req.body,
      {
        'content-type': req.headers['content-type'] || 'application/json',
        'x-sign': req.headers['x-sign'],
        'user-agent': req.headers['user-agent'],
        'x-forwarded-for': req.headers['x-forwarded-for'] || req.ip,
      }
    );

    res.status(result.status).send(result.body);
  } catch (error) {
    console.error('❌ Monobank relay error:', error);
    res.status(500).send('Relay error');
  }
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    config: {
      vercelDomain: config.vercelDomain,
      bypassTokenSet: !!config.bypassToken
    }
  });
});

/**
 * Root endpoint
 */
app.get('/', (req, res) => {
  res.send(`
    <h1>Webhook Relay Service</h1>
    <p>Relay webhooks from payment providers to Vercel with bot protection bypass.</p>
    <h2>Endpoints:</h2>
    <ul>
      <li><code>POST /liqpay</code> - LiqPay webhooks</li>
      <li><code>POST /monobank</code> - Monobank webhooks</li>
      <li><code>GET /health</code> - Health check</li>
    </ul>
    <h2>Configuration:</h2>
    <ul>
      <li>Vercel Domain: <code>${config.vercelDomain}</code></li>
      <li>Bypass Token: ${config.bypassToken ? '✅ Set' : '❌ Not set'}</li>
    </ul>
  `);
});

// Start server
app.listen(config.port, () => {
  console.log(`\n🚀 Webhook Relay running on port ${config.port}`);
  console.log(`\n📝 Configure webhooks:`);
  console.log(`   LiqPay: http://your-relay-domain.com/liqpay`);
  console.log(`   Monobank: http://your-relay-domain.com/monobank`);
});
