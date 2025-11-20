# Діагностика: Чому LiqPay Webhooks Не Працюють Після IP Allowlist

## Крок 1: Перевірте як додані IP в Vercel

### Правильний формат Firewall правила:

**Vercel Dashboard → Settings → Security → Firewall**

Має бути:
```
Rule Type: IP Address
Action: ALLOW (не Block!)
IP/CIDR: 91.206.201.XXX (кожна IP окремо)
Path: /api/webhooks/* (або залишити пустим для всіх шляхів)
```

### Типові помилки:

❌ **Помилка 1**: Додали як "Block" замість "Allow"
- Виправлення: Змініть Action на "Allow"

❌ **Помилка 2**: Неправильний формат IP
- Неправильно: `91.206.201.XXX/24` (якщо LiqPay дав просто IP)
- Правильно: `91.206.201.XXX` або `91.206.201.0/24` (якщо дали діапазон)

❌ **Помилка 3**: Firewall правило не активне
- Перевірте що є галочка "Enabled"

❌ **Помилка 4**: Bot Protection все ще ON і конфліктує
- Bot Protection може ігнорувати Firewall правила
- Спробуйте вимкнути Bot Protection навіть з IP allowlist

---

## Крок 2: Тест - Чи LiqPay взагалі відправляє вебхуки?

### Використайте webhook.site:

1. **Створіть тестовий endpoint:**
   - Йдіть на https://webhook.site
   - Скопіюйте URL: `https://webhook.site/abc-123-xyz`

2. **Змініть webhook URL в LiqPay:**
   - Зайдіть в LiqPay merchant панель
   - Знайдіть "Webhook URL" або "Server URL"
   - Вставте: `https://webhook.site/abc-123-xyz`
   - Збережіть

3. **Зробіть тестову оплату:**
   - Створіть тестовий платіж
   - Оплатіть через LiqPay (можна тестову картку)

4. **Перевірте webhook.site:**
   - Оновіть сторінку webhook.site
   - **Якщо вебхук прийшов** → LiqPay працює, проблема в Vercel
   - **Якщо НЕ прийшов** → LiqPay не налаштований або не відправляє

---

## Крок 3: Перевірте URL вебхука в LiqPay

### Правильний URL:

```
https://yourdomain.vercel.app/api/webhooks/liqpay
```

### Типові помилки:

❌ **Помилка 1**: HTTP замість HTTPS
- Неправильно: `http://yourdomain.vercel.app/...`
- Правильно: `https://yourdomain.vercel.app/...`

❌ **Помилка 2**: Неправильний шлях
- Неправильно: `/api/webhook/liqpay` (без 's')
- Правильно: `/api/webhooks/liqpay` (з 's')

❌ **Помилка 3**: Локальний URL
- Неправильно: `http://localhost:3000/...`
- Правильно: `https://yourdomain.vercel.app/...`

---

## Крок 4: Перевірте Vercel Deployment Logs

### Де шукати:

1. **Vercel Dashboard** → **Deployments**
2. Клік на останній deployment
3. **Functions** таб → знайдіть `api/webhooks/liqpay`
4. **Runtime Logs**

### Що шукати:

**Якщо вебхук доходить але блокується:**
```
403 Forbidden
или
Bot Protection Challenge
```

**Якщо вебхук НЕ доходить взагалі:**
```
(немає жодних логів про /api/webhooks/liqpay)
```

---

## Крок 5: Швидке рішення - Вимкніть Bot Protection

Якщо IP allowlist не працює, найпростіше:

### Vercel Dashboard:

```
Settings → Security → Attack Challenge Mode → OFF
```

### Чому це OK:

1. ✅ Вебхуки мають signature verification (криптографічний захист)
2. ✅ LiqPay перевіряє підпис через `LIQPAY_PRIVATE_KEY`
3. ✅ Без валідного приватного ключа ніхто не може підробити вебхук
4. ✅ Для e-commerce DDoS рідко проблема

---

## Діагностична команда для LiqPay

### Перевірте чи LiqPay може достукатися до вашого сервера:

```bash
# В LiqPay merchant панелі зазвичай є кнопка "Test Webhook"
# Або створіть справжню тестову оплату
```

---

## Можливі причини + Рішення

| Проблема | Як перевірити | Рішення |
|----------|---------------|---------|
| IP неправильно додані | Vercel Firewall Rules | Перевірте формат, Action=Allow |
| Bot Protection блокує | Logs показують 403 | Вимкніть Bot Protection |
| LiqPay не відправляє | webhook.site не отримує | Перевірте URL в LiqPay панелі |
| Неправильний URL | Перевірте в LiqPay | https://domain.com/api/webhooks/liqpay |
| Firewall не активний | Vercel Settings | Увімкніть правило |

---

## Рекомендований план дій:

### Зараз (5 хвилин):

1. **Тест через webhook.site:**
   ```
   - Змініть URL в LiqPay на webhook.site
   - Зробіть тестову оплату
   - Якщо прийшов → LiqPay працює
   - Якщо НЕ прийшов → проблема в LiqPay налаштуваннях
   ```

2. **Якщо LiqPay відправляє вебхуки:**
   ```
   - Вимкніть Bot Protection в Vercel
   - Поверніть URL на ваш Vercel domain
   - Зробіть тестову оплату
   - Має запрацювати
   ```

### Якщо все одно не працює:

**Можливість 1**: Firewall правила застосовуються з затримкою
- Почекайте 5-10 хвилин після збереження
- Спробуйте ще раз

**Можливість 2**: Bot Protection конфліктує з Firewall
- Вимкніть Bot Protection навіть якщо є IP allowlist
- На практиці Bot Protection + Firewall можуть конфліктувати

**Можливість 3**: IP адреси змінилися
- LiqPay може використовувати різні IP для різних запитів
- Додайте всі IP що дав LiqPay (можуть бути десятки)

---

## Моя рекомендація:

**Найпростіше і найнадійніше:**

```bash
# 1. Вимкніть Bot Protection
Vercel → Settings → Security → Attack Challenge Mode → OFF

# 2. Все одразу запрацює
Вебхуки мають власний захист через signature verification
```

**Чому це безпечно:**
- LiqPay вебхуки перевіряють криптографічний підпис
- Без `LIQPAY_PRIVATE_KEY` ніхто не може підробити вебхук
- Це той самий рівень безпеки що і з Bot Protection

---

## Що спробувати далі?

1. Спочатку webhook.site тест - з'ясувати чи LiqPay відправляє
2. Якщо відправляє → вимкнути Bot Protection на Vercel
3. Якщо не відправляє → перевірити налаштування в LiqPay панелі

Які IP адреси вам дав LiqPay? Скільки їх? Як саме ви їх додали в Vercel?
