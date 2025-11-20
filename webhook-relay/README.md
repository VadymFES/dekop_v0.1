# Webhook Relay Service

Простий проміжний сервіс для пересилання вебхуків від LiqPay/Monobank на Vercel з bot protection bypass токеном.

## Навіщо це потрібно?

Vercel Bot Protection блокує вебхуки від платіжних систем. Цей relay:
1. Приймає вебхуки від LiqPay/Monobank (без bot protection)
2. Додає `x-vercel-protection-bypass` header
3. Пересилає на ваш Vercel endpoint
4. Повертає відповідь назад

## Як працює

```
LiqPay/Monobank → Webhook Relay → Vercel (з bypass токеном) → Email надіслано ✅
```

## Швидкий старт (Deploy на Railway)

Railway - безкоштовний хостинг для простих сервісів.

### 1. Створіть акаунт на Railway

1. Йдіть на https://railway.app
2. Sign up (GitHub login)
3. Безкоштовно: $5 credit/місяць (достатньо для relay)

### 2. Deploy

**Варіант А: З GitHub**

1. Запуште код у свій GitHub repo
2. Railway → New Project → Deploy from GitHub
3. Виберіть папку `webhook-relay`
4. Railway автоматично розпізнає Dockerfile

**Варіант Б: З CLI**

```bash
# Встановити Railway CLI
npm install -g @railway/cli

# Login
railway login

# В папці webhook-relay
cd webhook-relay
railway init
railway up
```

### 3. Налаштувати Environment Variables

В Railway dashboard → вашому проекту → Variables:

```bash
VERCEL_DOMAIN=your-domain.vercel.app
VERCEL_PROTECTION_BYPASS_TOKEN=secret_your_bypass_token_here
PORT=3000
```

### 4. Отримати публічний URL

Railway → Settings → Generate Domain

Отримаєте URL типу: `https://webhook-relay-production.up.railway.app`

### 5. Налаштувати вебхуки

**LiqPay Dashboard:**
```
Webhook URL: https://your-relay.up.railway.app/liqpay
```

**Monobank Dashboard:**
```
Webhook URL: https://your-relay.up.railway.app/monobank
```

## Альтернативні платформи для deploy

### Render.com (безкоштовно)

1. https://render.com → New Web Service
2. Connect GitHub repo
3. Docker runtime environment
4. Add environment variables
5. Deploy

### Fly.io (безкоштовно)

```bash
# Встановити CLI
curl -L https://fly.io/install.sh | sh

# Deploy
cd webhook-relay
fly launch
fly deploy
```

### Heroku (був безкоштовний, тепер $5/міс)

```bash
heroku create webhook-relay
heroku container:push web
heroku container:release web
heroku config:set VERCEL_DOMAIN=your-domain.vercel.app
heroku config:set VERCEL_PROTECTION_BYPASS_TOKEN=secret_xxx
```

## Локальне тестування

```bash
cd webhook-relay
npm install

# Налаштувати .env
echo "VERCEL_DOMAIN=your-domain.vercel.app" > .env
echo "VERCEL_PROTECTION_BYPASS_TOKEN=secret_xxx" >> .env

# Запустити
npm start

# Тест
curl http://localhost:3000/health
```

## Endpoints

- `POST /liqpay` - приймає LiqPay вебхуки
- `POST /monobank` - приймає Monobank вебхуки
- `GET /health` - перевірка статусу
- `GET /` - інформаційна сторінка

## Security

**Захист:**
- ✅ Relay НЕ зберігає дані
- ✅ Просто пересилає запит з bypass токеном
- ✅ Signature verification відбувається на Vercel
- ✅ Без валідного `LIQPAY_PRIVATE_KEY` вебхук не пройде

**Bypass токен:**
- Зберігається тільки в Railway environment variables
- Не логується в консоль
- Передається тільки в headers до Vercel

## Monitoring

**Railway Dashboard:**
- View logs в реальному часі
- Metrics (CPU, Memory, Network)
- Restart/Redeploy

**Що логується:**
```
✅ Webhook Relay running on port 3000
🔔 LiqPay webhook received
📨 Relaying webhook to: https://your-domain.vercel.app/api/webhooks/liqpay
✅ Relayed successfully: { status: 200 }
```

## Troubleshooting

### Webhook не доходить на relay

- Перевірте URL в LiqPay/Monobank dashboard
- Перевірте Railway deployment status
- Перевірте Railway logs

### Relay не може достукатися до Vercel

- Перевірте `VERCEL_DOMAIN` в Railway variables
- Перевірте `VERCEL_PROTECTION_BYPASS_TOKEN`
- Перевірте Vercel deployment logs

### Email все одно не приходить

- Перевірте що вебхук дійшов до Vercel (Vercel logs)
- Перевірте signature verification не падає
- Перевірте email service налаштований

## Вартість

**Railway (Рекомендую):**
- $5 credit безкоштовно щомісяця
- Webhook relay використовує ~$0.50/міс
- Достатньо для 1000+ вебхуків

**Render:**
- Безкоштовний tier (750 годин/міс)
- Sleep після 15 хв неактивності
- First webhook може бути повільний (wake up)

**Fly.io:**
- Безкоштовно до 3 маленьких apps
- Без sleep режиму

## Переваги цього підходу

✅ **Bot Protection залишається ввімкненим на Vercel**
✅ **Безкоштовно** (Railway free tier)
✅ **Просто** (1 файл Node.js)
✅ **Швидко** (deploy за 5 хвилин)
✅ **Надійно** (Railway 99.9% uptime)
✅ **Безпечно** (signature verification на Vercel)

## Альтернатива: Managed Service

Якщо не хочете деплоїти сервіс, можна використати:

**Zapier** ($20/міс):
- Webhook trigger → HTTP request
- Додає bypass header автоматично

**Make.com** (був Integromat, $9/міс):
- Webhook → HTTP module
- Конфігурація headers

Але власний relay на Railway **безкоштовний** і дає повний контроль.
