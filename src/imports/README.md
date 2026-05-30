# HolidayGet Backend Payment API

Документация описывает текущее поведение API из исходного кода проекта `holidayget-backend-payment`.

## Базовая информация

- **Framework:** FastAPI
- **Сервис:** Stripe Payment Service
- **Порты по `docker-compose`:**
  - `8100` - payment API (`app.main`)
  - `8101` - notification API (`app.notification`)
- **Префикс (root path):** берётся из `ROOT_PATH` (по умолчанию в коде `/payment`, в `env.example` — `/`)
- **Health endpoint:** `GET /health`

> Примеры базовых URL (локально):
> `http://localhost:8100` (payment)
> `http://localhost:8101` (notification)
>
> Если `ROOT_PATH=/payment`, фактический URL будет `http://localhost:8100/payment/...`

---

## Аутентификация

Для всех endpoint, кроме webhook, обязателен заголовок:

```http
x-api-key: <PAYMENT_API_KEY>
```

При неверном ключе возвращается:

- **401 Unauthorized**
```json
{
  "detail": "Invalid API key"
}
```

## Формат ошибок валидации

Для ошибок валидации FastAPI переопределён ответ:

- **422 Unprocessable Entity**
```json
{
  "error": "Validation failed",
  "details": [
    {
      "field": "body.amount",
      "message": "Field required"
    }
  ]
}
```

---

## 1) System

### `GET /health`
Проверка доступности сервиса.

**Response 200**
```json
{
  "status": "healthy",
  "service": "payment"
}
```

---

## 2) Accounts

### `GET /account`
Список подключённых Stripe-аккаунтов.

**Auth:** required (`x-api-key`)

**Response 200** — массив `AccountResponse`:
```json
[
  {
    "account_id": "acct_1ExampleID",
    "company_id": "00000000-0000-0000-0000-000000000000",
    "country": "US",
    "email": "example@example.com",
    "status": "active",
    "charges_enabled": true,
    "payouts_enabled": true,
    "details_submitted": true,
    "created_at": "2025-01-01T00:00:00Z"
  }
]
```

---

### `POST /account/create`
Создаёт Stripe Connect Express account и onboarding link, сохраняет связь с `company_id`.

**Auth:** required (`x-api-key`)

**Request body (`AccountCreate`)**
```json
{
  "country": "US",
  "email": "example@example.com",
  "company_id": "00000000-0000-0000-0000-000000000000",
  "refresh_url": "https://your-frontend.com/onboarding/refresh",
  "return_url": "https://your-frontend.com/onboarding/return"
}
```

**Response 200 (`AccountLinkResponse`)**
```json
{
  "company_id": "00000000-0000-0000-0000-000000000000",
  "onboarding_url": "https://connect.stripe.com/setup/s/acct_1ExampleID/onboarding/xyz",
  "expires_at": 1700000000
}
```

**Возможные ошибки**
- `400` — `Account already exists for this company_id`
- `500` — внутренняя ошибка

---

### `GET /account/status?company_id=<id>`
Возвращает статус аккаунта из локальной БД (значения обновляются webhook-событиями Stripe).

**Auth:** required (`x-api-key`)

**Query params**
- `company_id` (string, required)

**Response 200**
```json
{
  "id": "acct_1ExampleID",
  "status": "active",
  "accept_payments": true,
  "details": {
    "charges_enabled": true,
    "payouts_enabled": true,
    "card_payments": "active",
    "transfers": "active",
    "currently_due": [],
    "pending_verification": [],
    "disabled_reason": null
  }
}
```

### `GET /account/stripe-status?company_id=<id>`
Возвращает расчётный статус напрямую из Stripe (без сохранения в БД).

**Auth:** required (`x-api-key`)

**Query params**
- `company_id` (string, required)

**Возможные значения `status` (логика `get_account_status`)**
- `new`: аккаунт только создан, onboarding/детали ещё не отправлены (`details_submitted = false`)
- `requires_action`: аккаунт требует действий (`requirements.currently_due`)
- `pending`: аккаунт требует верификации (документы и т.п. `requirements.pending_verification`)
- `active`: платежи и payouts разрешены, и capability `card_payments` + `transfers` имеют `active`

**Возможные ошибки**
- `404` — `Account not found`
- `400` — Stripe error

---

### `POST /account/onboarding`
Генерирует новый onboarding link для существующего аккаунта.

**Auth:** required (`x-api-key`)

**Request body (`AccountLinkCreate`)**
```json
{
  "company_id": "00000000-0000-0000-0000-000000000000",
  "refresh_url": "https://your-frontend.com/onboarding/refresh",
  "return_url": "https://your-frontend.com/onboarding/return"
}
```

**Response 200 (`AccountLinkResponse`)**
```json
{
  "company_id": "00000000-0000-0000-0000-000000000000",
  "onboarding_url": "https://connect.stripe.com/setup/s/acct_1ExampleID/onboarding/xyz",
  "expires_at": 1700000000
}
```

**Возможные ошибки**
- `404` — `Account not found`
- `400` — Stripe error

---

## 3) Payments & Invoices

### `POST /invoices/create`
Создаёт invoice в Stripe, локальную запись платежа и checkout URL для оплаты.

**Auth:** required (`x-api-key`)

**Request body (`InvoiceCreate`)**
```json
{
  "company_id": "00000000-0000-0000-0000-000000000000",
  "client_id": "11111111-1111-1111-1111-111111111111",
  "client_email": "client@example.com",
  "amount": 5000,
  "fee_amount": 500,
  "fee_amount_percent": null,
  "currency": "eur",
  "description": "Invoice for booking #123",
  "send_email": true,
  "ttl": 15,
  "success_url": "https://your-frontend.com/payment/success",
  "cancel_url": "https://your-frontend.com/payment/cancel"
}
```

> `fee_amount`/`fee_amount_percent` применяются только при наличии `company_id` (подключенный Connect account).
>
> `ttl` задаётся в минутах и используется и для `due_date` Invoice, и для `expires_at` Checkout Session.

**Response 200 (`InvoiceResponse`)**
```json
{
  "payment_id": "00000000-0000-0000-0000-000000000000",
  "payment_url": "https://checkout.stripe.com/c/pay/cs_test_ExampleID",
  "document_url": "https://pay.stripe.com/invoice/in_1ExampleID/pdf"
}
```

**Возможные ошибки**
- `404` — `Account not found`
- `400` — `The connected account does not have transfers capability enabled. Please complete onboarding.`
- `400` — Stripe error

---

### `POST /payments/create-intent`
Создаёт Stripe PaymentIntent и сохраняет связь с локальным платежом.

**Auth:** required (`x-api-key`)

**Request body (`PaymentIntentCreate`)**
```json
{
  "order_id": "order-123",
  "amount": 5000,
  "currency": "eur",
  "company_id": "00000000-0000-0000-0000-000000000000",
  "amount_fee": 500,
  "amount_fee_percent": null
}
```

**Response 200 (`PaymentIntentResponse`)**
```json
{
  "client_secret": "pi_1ExampleID_secret_ExampleSecret",
  "payment_intent_id": "pi_1ExampleID"
}
```

**Возможные ошибки**
- `404` — `Account not found`
- `400` — `The connected account does not have transfers capability enabled. Please complete onboarding.`
- `400` — Stripe error

---

### `POST /refund`
Создаёт полный или частичный refund.

**Auth:** required (`x-api-key`)

**Request body (`RefundCreate`)**
```json
{
  "payment_id": "00000000-0000-0000-0000-000000000000",
  "amount": 2500
}
```

> `amount` опционален:
> - если не передан, выполняется полный refund
> - если передан, выполняется частичный refund

**Response 200 (`RefundResponse`)**
```json
{
  "refund_id": "re_1ExampleID",
  "payment_id": "00000000-0000-0000-0000-000000000000",
  "payment_intent_id": "pi_1ExampleID",
  "amount": 2500,
  "currency": "eur",
  "status": "succeeded"
}
```

**Логика по типу платежа (`payment_type`)**
- `payment_intent`: refund по локальному `payment_intent_id`
- `invoice`: сначала refund по локально сохранённому `payment_intent_id` из checkout webhook, при отсутствии - fallback через Stripe Invoice (`charge` или `payment_intent`)

**Возможные ошибки**
- `400` — `invalid_payment_id`
- `400` — `invalid_refund_amount`
- `404` — `payment_not_found`
- `404` — `payment_intent_not_found`
- `404` — `invoice_not_found`
- `400` — `invoice_not_paid`
- `400` — Stripe refund error

---

### `GET /payments/history`
Возвращает историю локальных платежей.

**Auth:** required (`x-api-key`)

**Response 200** — массив `PaymentResponse`:
```json
[
  {
    "payment_intent_id": "pi_1ExampleID",
    "amount": 5000,
    "currency": "eur",
    "status": "succeeded",
    "created_at": "2025-01-01T00:00:00Z"
  }
]
```

---

## 4) Webhooks

### `POST /webhook`
Основной webhook Stripe для платежных событий.

### `POST /webhook/account`
Webhook для account/capability событий Stripe Connect.

**Auth:** `x-api-key` не требуется.

**Headers (required)**
- `stripe-signature`

**Response 200 (`WebhookResponse`)**
```json
{
  "status": "success"
}
```

Или при повторной обработке одного и того же события (`event.id`):
```json
{
  "status": "already_processed"
}
```

**Возможные ошибки**
- `400` — `Invalid payload`
- `400` — `Invalid signature`

### Обрабатываемые события webhook

- Account:
  - `account.updated`
  - `account.application.authorized`
  - `account.application.deauthorized`
  - `capability.updated`
- PaymentIntent:
  - `payment_intent.succeeded`
  - `payment_intent.payment_failed`
- Checkout:
  - `checkout.session.completed`
  - `checkout.session.expired`
- Invoice:
  - `invoice.payment_succeeded`
  - `invoice.paid`
  - `invoice.payment_failed`
- Refunds:
  - `charge.refunded`

> После обработки события сервис обновляет локальный статус и отправляет callback в backend (`BACKEND_ENDPOINT`) по маршрутам `/account` или `/payment`.
>
> Подробности callback-механизма:
> - Метод: `POST {BACKEND_ENDPOINT}/{route}`
> - Заголовок: `x-api-key: {BACKEND_API_KEY}`
> - Отправка выполняется асинхронно через `send_backend(...)`
>
> Callback на `/account` отправляется при account-событиях (`account.updated`, `account.application.*`, `capability.updated`) с payload:
> ```json
> {
>   "company_id": "<company_id>",
>   "charges_enabled": true,
>   "payouts_enabled": true
> }
> ```
>
> При account-событиях сервис также сохраняет в таблицу `accounts` поля:
> - `status` (из `get_account_status`)
> - `accept_payments` (bool)
> - `details` (jsonb с capability/requirements)
>
> Callback на `/payment` отправляется при изменении статуса платежа (успех/ошибка/возврат) с payload:
> ```json
> {
>   "payment_id": "<uuid>",
>   "status": "succeeded"
> }
> ```
>
> Возможные значения `status` для `/payment`: `succeeded`, `failed`, `refunded`.
>
> Для сценария Invoice + Checkout: при `checkout.session.completed` сервис сохраняет связь `payment_id -> payment_intent_id`, помечает Stripe Invoice как оплаченный через `stripe.Invoice.pay(..., paid_out_of_band=True)` и синхронизирует локальные `invoices.status`/`invoices.document_url`.
>
> Если `BACKEND_ENDPOINT` не задан — callback не отправляется (событие логируется как `send_skipped`).
> Если запрос в backend завершился ошибкой — webhook не падает, ошибка callback логируется как `send_failed`.

---

## 5) Logs

### `GET /logs`
Возвращает логи с пагинацией и фильтрацией.

**Auth:** required (`x-api-key`)

**Query params**
- `page` (int, optional, default `1`)
- `per_page` (int, optional, default `20`)
- `category` (string, optional)
- `status` (string, optional)

**Response 200**
```json
{
  "logs": [
    {
      "id": 1,
      "category": "payment",
      "event_type": "create_payment",
      "event_id": "order-123",
      "message": "Payment intent created",
      "status": "success",
      "details": {
        "payment_id": "00000000-0000-0000-0000-000000000000"
      },
      "created_at": "2026-02-18T10:00:00"
    }
  ],
  "pagination": {
    "page": 1,
    "per_page": 20,
    "total_count": 1,
    "total_pages": 1,
    "has_next": false,
    "has_prev": false
  },
  "filters": {
    "category": "payment",
    "status": "success"
  }
}
```

---

## Примеры `curl`

### Проверка health
```bash
curl -X GET "http://localhost:8100/health"
```

### Создание PaymentIntent
```bash
curl -X POST "http://localhost:8100/payments/create-intent" \
  -H "Content-Type: application/json" \
  -H "x-api-key: secret-api-key" \
  -d '{
    "order_id": "order-123",
    "amount": 5000,
    "currency": "eur"
  }'
```

### Получение логов
```bash
curl -X GET "http://localhost:8100/logs?page=1&per_page=20&category=payment&status=success" \
  -H "x-api-key: secret-api-key"
```

---

## Примечания по интеграции

- Суммы (`amount`, `fee_amount`) передаются в **минимальных единицах валюты** (например, евроценты).
- Для Connect-платежей и инвойсов аккаунт получателя должен иметь активную capability `transfers`.
- Webhook-обработчик поддерживает идемпотентность через хранение `event_id` в таблице `processed_events`.
- При запуске приложения автоматически вызывается `Base.metadata.create_all(bind=engine)`.

---

## Notification Service

Сервис нотификаций работает отдельно от payment API.

- API: `http://localhost:8101`
- Worker: `notification-worker` (обрабатывает очередь `notification_jobs`)
- Каналы: `email`, `sms`, `push` (`push-notification`)

### Аутентификация Notification API

Для endpoint notification используется:

```http
x-api-key: <NOTIFICATION_API_KEY>
```

### Проверка провайдеров (`GET /test`)

Endpoint проверяет текущие провайдеры из env и возвращает статус по каждому каналу:

```json
{
  "email": {
    "provider": "smtp",
    "status": "ok",
    "details": "SMTP connection successful"
  },
  "sms": {
    "provider": "twilio",
    "status": "ok",
    "details": "Twilio test credentials detected: limited API access (connection is valid)"
  },
  "push": {
    "provider": "fcm",
    "status": "error",
    "details": "FCM_CREDENTIALS_FILE is not set"
  }
}
```

Что проверяется:

- `smtp`: реальное подключение (EHLO, TLS при `SMTP_USE_TLS=true`, login при наличии user/password)
- `amazon-ses`: `SES_FROM_EMAIL` + подключение к SES API
- `amazon-sns`: подключение к SNS API
- `twilio`: обязательные переменные + подключение к Twilio API
- `fcm`: наличие `FCM_CREDENTIALS_FILE`, существование файла, инициализация Firebase SDK

### Формат запроса на отправку

`POST /send`

Поля `NoficationCreate`:

- `channel` (required, string): `email`, `sms`, `push`
- `message` (required, string)
- `title` (optional, string)
- `recipient` (optional):

- для `email`: строка email или список email
- для `sms`: строка телефона или список телефонов
- для `push` (FCM): объект, например `{"token": "..."}` или `{"topic": "..."}` или `{"condition": "..."}`
- для `push` (SNS): объект с `topic_arn` / `target_arn` / `endpoint_arn`

- `priority` (optional): `low`, `default`, `high` или число
- `template_id` (optional, int)
- `data` (optional, object)

`recipient` - единое поле адресации:

- `email`: строка email или список email
- `sms`: строка телефона или список телефонов
- `push` (FCM): объект, например `{"token": "..."}` или `{"topic": "..."}` или `{"condition": "..."}`

Пример:

```json
{
  "title": "Booking updated",
  "message": "Your booking status changed",
  "channel": "email",
  "recipient": ["user@example.com", "ops@example.com"],
  "priority": "high"
}
```

Минимальный валидный пример:

```json
{
  "message": "Your booking status changed",
  "channel": "sms",
  "recipient": "+380501112233"
}
```

### Priority

`priority` поддерживает строковые и числовые значения.

- `low` -> `-10`
- `default` -> `0`
- `high` -> `10`
- также можно передать число (например `5`)

В БД сохраняется числовое значение в `notification_jobs.priority`.

### Выбор провайдеров через ENV

- `NOTIFICATION_EMAIL_PROVIDER`: `amazon-ses` или `smtp`
- `NOTIFICATION_SMS_PROVIDER`: `amazon-sns` или `twilio`
- `NOTIFICATION_PUSH_PROVIDER`: `amazon-sns` или `fcm`

Основные переменные:

- `NOTIFICATION_API_KEY`
- `NOTIFICATION_ROOT_PATH`
- `SES_FROM_EMAIL`
- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`, `SMTP_USE_TLS`, `SMTP_FROM_EMAIL`
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`
- `FCM_CREDENTIALS_FILE`
- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `SNS_DEFAULT_TOPIC_ARN`, `SNS_SMS_SENDER_ID`

### Значения SNS

`NOTIFICATION_SMS_PROVIDER=amazon-sns`

- `recipient` для `sms`: строка телефона или список телефонов в E.164 формате
- пример: `"recipient": "+380501112233"` или `"recipient": ["+380501112233", "+380671234567"]`

`NOTIFICATION_PUSH_PROVIDER=amazon-sns`

- `recipient` для `push`: объект c адресацией SNS
- поддерживаемые поля в объекте: `topic_arn`, `target_arn`, `endpoint_arn`
- `topic_arn` можно не передавать в payload, если задан `SNS_DEFAULT_TOPIC_ARN`

Дополнительно для SNS:

- `AWS_REGION` - AWS регион для клиента SNS
- `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` - AWS credentials (опционально, если используются IAM role/instance profile)
- `SNS_SMS_SENDER_ID` - sender id для SMS (где поддерживается оператором)

### Docker Compose

В `docker-compose.yml` добавлен сервис:

- `notification-worker` -> `python -m app.notification.worker`

Для FCM credentials используется монтирование файла в worker:

- в `notification` (для `/test` endpoint)
- в `notification-worker` (для фактической отправки)

- host: `./secrets/fcm_service_account.json`
- container: `/run/secrets/fcm_service_account.json`

Соответствующая env в обоих сервисах:

- `FCM_CREDENTIALS_FILE=/run/secrets/fcm_service_account.json`

---

## Message Center Service

Сервис чатов реализован как изолированный модуль сообщений без WebSocket и без бизнес-логики booking/payment.

- API: `http://localhost:8102`
- Auth: `Authorization: Bearer <JWT>`
- Поддерживаются оба варианта путей:
- основной: `/conversations`, `/messages/...`, `/group-...`
- совместимость: `/chat/conversations`, `/chat/messages/...`, `/chat/group-...`

### Scope модуля

Хранит только messaging entities:

- conversations
- group conversations
- messages
- participants
- unread counters
- attachments (S3 links)

Не содержит:

- booking business logic
- payment logic
- pricing
- subscriptions
- experience management

Связь с внешними доменами через `source_type/source_id` (например booking, experience, experience_slot, booking_slot).

### Поддерживаемые endpoints

- `GET /conversations`
- `POST /conversations`
- `POST /conversations/{conversation_id}/read`
- `POST /conversations/{conversation_id}/archive`
- `GET /messages/{conversation_id}`
- `POST /messages/send`
- `GET /group-conversations`
- `GET /group-messages/{conversation_id}`
- `POST /group-messages/send`

### Примеры сообщений

Создание conversation со стартовым сообщением (`POST /conversations`):

```json
{
  "conversation_type": "direct",
  "participant_ids": ["user-2"],
  "topic": "Support chat",
  "message": {
    "body": "Hello! I need help with booking #A123",
    "event_type": "new_message",
    "attachments": []
  }
}
```

Отправка сообщения в существующий conversation (`POST /messages/send`):

```json
{
  "conversation_id": "11111111-1111-1111-1111-111111111111",
  "body": "Thanks, issue resolved",
  "event_type": "new_message",
  "attachments": [
    {
      "url": "https://cdn.example.com/files/invoice.pdf",
      "kind": "file",
      "name": "invoice.pdf",
      "mime_type": "application/pdf",
      "size": 248120
    }
  ]
}
```

Пример `curl` для `CHAT_AUTH_MODE=none` (user_id передается явно):

```bash
curl -X POST "http://localhost:8102/conversations?user_id=user-1" \
  -H "Content-Type: application/json" \
  -d '{
    "conversation_type": "direct",
    "participant_ids": ["user-2"],
    "message": {
      "body": "Hi from none auth mode"
    }
  }'
```

В режимах `CHAT_AUTH_MODE=local|cognito` используйте Bearer token:

```bash
curl -X POST "http://localhost:8102/messages/send" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <JWT>" \
  -d '{
    "conversation_id": "11111111-1111-1111-1111-111111111111",
    "body": "Message from JWT user"
  }'
```

### Polling и pagination

Сервис рассчитан на polling только пока экран открыт.

- conversation list: каждые `20-30s`
- chat screen: каждые `10-15s`

Параметры пагинации сообщений:

- `limit` (по умолчанию `30`, максимум `30`)
- `before` (cursor для подгрузки старых сообщений при scroll)
- `since` (инкрементальное обновление новых сообщений)

Ответ истории сообщений содержит:

- `messages`
- `has_more`
- `next_before`
- `next_since`

### Group chat logic

Group conversation должна быть привязана к source entity (`source_type` + `source_id`).

Участники поддерживаются ролями:

- owner
- manager
- member (tourist)

Ограничение отправки в `POST /group-messages/send`:

- отправка разрешена только `owner`/`manager`

После завершения тура/ивента conversation можно архивировать через `POST /conversations/{conversation_id}/archive`.

### JWT и безопасность

Сервис валидирует JWT самостоятельно и использует `sub` как `user_id`.

Проверки backend:

- принадлежность пользователя к conversation
- участие в group chat (membership + role)
- опционально проверка source participation по claims (`booking_ids`, `experience_ids`, ...)

Для строгой проверки source access:

- `CHAT_ENFORCE_SOURCE_CLAIMS=true`

Режимы JWT:

- `CHAT_AUTH_MODE=local` - shared secret (`CHAT_JWT_SECRET`, `HS256`)
- `CHAT_AUTH_MODE=cognito` - проверка Cognito JWT по JWKS (опционально)
- `CHAT_AUTH_MODE=none` - авторизация отключена, `user_id` передается явно через `user_id` query-параметр или `X-User-Id`

Параметры Cognito:

- `CHAT_COGNITO_REGION`
- `CHAT_COGNITO_USER_POOL_ID`
- `CHAT_COGNITO_APP_CLIENT_ID`
- `CHAT_COGNITO_JWKS_URL` (если нужен явный URL)
- `CHAT_COGNITO_ISSUER` (если нужен явный issuer)

### Attachments

Изображения и файлы отправляются как ссылки (обычно presigned S3 URL) в `attachments` поля сообщения.

### Push notifications

После отправки сообщения сервис инициирует push событие через Notification API (best effort: ошибка push не ломает запись сообщения).

Типы событий, поддерживаемые полем `event_type`:

- `new_message`
- `new_group_message`
- `booking_approved`
- `booking_cancelled`
- `dispute_update`

### ENV Message Center

- `MESSAGER_ROOT_PATH`
- `CHAT_AUTH_MODE`
- `CHAT_JWT_SECRET`
- `CHAT_JWT_ALGORITHM` (default: `HS256`)
- `CHAT_JWT_AUDIENCE` (optional)
- `CHAT_JWT_ISSUER` (optional)
- `CHAT_COGNITO_REGION`
- `CHAT_COGNITO_USER_POOL_ID`
- `CHAT_COGNITO_APP_CLIENT_ID`
- `CHAT_COGNITO_JWKS_URL`
- `CHAT_COGNITO_ISSUER`
- `CHAT_NOTIFICATION_ENDPOINT` (default: `http://notification:8101/send`)
- `CHAT_PUSH_ENABLED` (`true|false`)
- `CHAT_PUSH_TIMEOUT_SECONDS`
- `CHAT_ENFORCE_SOURCE_CLAIMS` (`true|false`)
- `CHAT_DEFAULT_MESSAGES_PAGE_SIZE` (default: `30`)
- `CHAT_MAX_MESSAGES_PAGE_SIZE` (default: `30`)

### Optional WebSocket (parallel to polling)

Для постепенного перехода на realtime добавлен опциональный websocket канал.

Endpoints:

- `/ws`
- `/chat/ws` (legacy path)

По умолчанию websocket отключен и polling продолжает работать как основной канал.

WS env:

- `CHAT_WS_ENABLED`
- `CHAT_WS_REQUIRE_AUTH`
- `CHAT_WS_UPGRADE_ENABLED`
- `CHAT_WS_UPGRADE_TTL_SECONDS`

При `CHAT_AUTH_MODE=none` websocket подключается через `?user_id=...` или `X-User-Id`.

WS auth upgrade endpoint (для mobile/Cognito):

- `POST /ws/auth/upgrade`
- `POST /chat/ws/auth/upgrade` (legacy path)

Ответ:

- `ws_token` - одноразовый short-lived token
- `expires_at`
- `ttl_seconds`

Использование:

1. Выполнить `POST /ws/auth/upgrade` с обычным Bearer JWT.
2. Подключиться к websocket: `/ws?token=<ws_token>`.
3. Токен одноразовый: после успешного handshake повторно не используется.

Протокол websocket:

- client -> `{ "action": "ping" }`
- client -> `{ "action": "subscribe", "conversation_ids": ["..."] }`
- server <- `{ "type": "message.new", "conversation_id": "...", "message": {...} }`

