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
| `follow-digest` | `notify.cinema.digest_flush` | API on Session → PUBLISHED (KAN-35, delayed + deduplicated by `notify:cinema:{cinemaId}`) |
| `telegram-notify` | `notify.cinema.afisha_digest` | `follow-digest` worker, one job per follower |
| `telegram-notify` | `notify.cinema.session_published` | legacy (pre-KAN-35), still processed |

Idempotency: digest sessions are stamped with `Session.notifiedAt`; send jobs use `jobId` = `notify.afisha.digest.{cinemaId}.{windowId}.{userId}` (BullMQ forbids `:` in custom ids).
Window: `FOLLOW_NOTIFY_DEBOUNCE_MS` (default `300000`). Queue name, job options and the `notify:cinema:{cinemaId}` key are shared with the API via [`@cinema/queue-contracts`](../../packages/queue-contracts/src/follow-digest.ts). Contract: [`docs/contracts/follow-notify.md`](../../docs/contracts/follow-notify.md#kan-35--per-cinema-digest-debounce).

## Tests

```bash
pnpm --filter @cinema/worker test:unit
```
