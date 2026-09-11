# `@cinema/worker` — BullMQ jobs (KAN-26)

Consumes `telegram-notify` and delivers follow-cinema afisha messages via Telegram Bot API.

## Run

```bash
# needs Postgres + Redis (docker compose) and TELEGRAM_BOT_TOKEN
pnpm --filter @cinema/worker dev
```

## Queue

| Name | Job | Source |
| --- | --- | --- |
| `telegram-notify` | `notify.cinema.session_published` | API on Session → PUBLISHED |

Idempotency: BullMQ `jobId` = `notify:session.published:{sessionId}:{userId}`.
