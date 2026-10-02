# `@cinema/bot` — Telegram Bot (KAN-24)

Russian `/start` welcome, reply + inline menus (Mini App, afisha, tickets, help).
Click payments: `pre_checkout_query` and `successful_payment` are confirmed through the Cinema API.

## Env

Copy `.env.example` → `.env` (or export vars). Required:

| Variable | Purpose |
| --- | --- |
| `TELEGRAM_BOT_TOKEN` | BotFather token |
| `TELEGRAM_MINI_APP_URL` or `TELEGRAM_BOT_USERNAME` | Mini App open buttons |
| `BOT_MODE` | `polling` (local) or `webhook` |
| `API_URL` | Cinema API used to confirm Click payments (default `http://localhost:3001`) |
| `INTERNAL_API_SECRET` | Same secret as the API. Required for `pre_checkout_query` / `successful_payment` |
| `TELEGRAM_PAYMENT_PROVIDER_TOKEN` | BotFather Click TEST token. Same value as the API; empty hides Click |

## Local (long-polling)

```bash
# from monorepo root
pnpm --filter @cinema/bot dev
# or
pnpm --filter @cinema/bot start:polling
```

## Webhook (production)

1. Expose HTTPS to `BOT_WEBHOOK_URL` (must match path `BOT_WEBHOOK_PATH`).
2. Set `BOT_MODE=webhook`, optional `BOT_WEBHOOK_SECRET`.
3. `pnpm --filter @cinema/bot start:webhook`

On boot the bot calls `setWebhook` when `BOT_WEBHOOK_URL` is set.

## Menus

- **Открыть Mini App** — URL / deep-link to Mini App
- **Афиша** — Mini App `startapp=afisha`
- **Мои билеты** — Mini App `startapp=tickets`
- **Помощь** — Russian help text

Follow-cinema publish notifications are delivered by `@cinema/worker` (KAN-26), not this interactive bot process.
