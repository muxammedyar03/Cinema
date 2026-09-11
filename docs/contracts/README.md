# System Designer Contracts

Docs-first contracts for Cinema MVP payment, auth, and refund flows.

| Doc | Jira | Summary |
| --- | --- | --- |
| [telegram-auth.md](./telegram-auth.md) | **KAN-5** | Telegram Mini App auth with real `initData` HMAC; session cookie; upsert by `telegramId` |
| [rahmat-payment.md](./rahmat-payment.md) | **KAN-6** | Rahmat (rhmt.uz) as sole MVP payment provider; cinema-as-merchant (Model A) |
| [qr-refund.md](./qr-refund.md) | **KAN-7** | Ticket QR / staff verify; full & partial refunds; self-refund; session-cancel jobs |
| [schema-deltas.md](./schema-deltas.md) | KAN-5/6/7 | Prisma deltas: `PaymentProvider.RAHMAT`, refund initiator, ticket linkage |

## Product locks (do not regress)

- Payment provider for MVP = **Rahmat** only — Click / Payme are **deprecated** for MVP (enum values may remain for migration compatibility).
- Merchant model **A**: cinema holds a Rahmat merchant / store account.
- Partial refund: **yes**. User self-refund: **yes**. Staff QR verify: **admin mobile web only**.
- Telegram Mini App auth: real HMAC verification of `initData`; prefer header `X-Telegram-Init-Data`.

## Related code (current)

- `POST /auth/telegram` → `AuthService.telegramStub` (requires `initData` if `TELEGRAM_BOT_TOKEN` set, but **does not** verify HMAC).
- Admin auth: email/password + Redis session cookie.
- Booking: `PENDING_PAYMENT` orders with **600s** hold (`HOLD_TTL_SEC`).
- `apps/worker`: stub — BullMQ Phase 09+.
- Prisma: `PaymentProvider = CLICK | PAYME`; `Payment @@unique([provider, providerPaymentId])`.

## Implementation order

1. KAN-5 — Telegram HMAC auth (unblocks Mini App identity)
2. KAN-6 — Rahmat provider + Order→PAID→Ticket ACTIVE
3. KAN-7 — QR verify + refund state machines + worker jobs
