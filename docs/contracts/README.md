# System Designer Contracts

Docs-first contracts for Cinema MVP auth, payment, refund, cinema profile, and follow/notify flows.

| Doc | Jira | Summary |
| --- | --- | --- |
| [telegram-auth.md](./telegram-auth.md) | **KAN-5** | Telegram Mini App auth with real `initData` HMAC; session cookie; upsert by `telegramId` |
| [rahmat-payment.md](./rahmat-payment.md) | **KAN-6** | Rahmat (rhmt.uz) as sole MVP payment provider; cinema-as-merchant (Model A) |
| [qr-refund.md](./qr-refund.md) | **KAN-7** | Ticket QR / staff verify; full & partial refunds; self-refund; session-cancel jobs |
| [cinema-profile.md](./cinema-profile.md) | **KAN-19** | Cinema profile fields, map provider, photos, admin onboarding wizard, Mini App public profile + map |
| [follow-notify.md](./follow-notify.md) | **KAN-19** | `CinemaFollow`; session→PUBLISHED event; Notification + Telegram bot job payloads (KAN-24/26) |
| [design-v2-gaps.md](./design-v2-gaps.md) | **KAN-32** | Design v2 (KAN-27) screens vs current API: per-screen yes/partial/no, additive proposals, hide/show rules for KAN-29/30/33/34 |
| [schema-deltas.md](./schema-deltas.md) | KAN-5/6/7/19/32 | Prisma deltas: Rahmat, refunds, cinema profile/geo/photos, CinemaFollow; Design v2 proposals (KAN-32) |

## Product locks (do not regress)

- Payment provider for MVP = **Rahmat** only — Click / Payme are **deprecated** for MVP (enum values may remain for migration compatibility).
- Merchant model **A**: cinema holds a Rahmat merchant / store account.
- Partial refund: **yes**. User self-refund: **yes**. Staff QR verify: **admin mobile web only**.
- Telegram Mini App auth: real HMAC verification of `initData`; prefer header `X-Telegram-Init-Data`.
- Locale MVP = **ru**. Channel = **Telegram Mini App + Bot**.
- Cinema photos = structured **`CinemaPhoto`** (not `String[]`). Map payload = `{ provider, lat, lng, address, embedHint }` with `provider ∈ {google, yandex}`.
- Follow notify trigger = **`Session` → `PUBLISHED`** (not movie ACTIVE alone).

## Related code (current)

- `POST /auth/telegram` → `AuthService.telegramStub` (requires `initData` if `TELEGRAM_BOT_TOKEN` set, but **does not** verify HMAC).
- Admin auth: email/password + Redis session cookie.
- Admin cinemas: `apps/api/src/cinema` → `@Controller("admin/cinemas")`.
- Public catalog: `apps/api/src/public` → `@Controller("public")` (`/catalog`, `/cinemas`, `/movies/:id`, `/sessions/:id`).
- Booking: `PENDING_PAYMENT` orders with **600s** hold (`HOLD_TTL_SEC`).
- `apps/worker`: stub — BullMQ Phase 09+.
- Prisma: `Cinema` lacks lat/lng/photos/instagram/phones[]; `Notification` exists; no `CinemaFollow` yet.
- `PaymentProvider = CLICK | PAYME` today; contracts add `RAHMAT` (KAN-6) — still not applied until implementation PRs.

## Design v2 (KAN-27) notes

- Gap review: [design-v2-gaps.md](./design-v2-gaps.md) — frontend tasks KAN-29/30/33/34 hide any element marked ❌ until its API exists (no fake data).
- Implemented-vs-contracted: Rahmat payment, ticket verify and refund endpoints (KAN-6/7) are called by `apps/mini-app` / `apps/admin` but are **not yet implemented** in `apps/api` (see gap doc §0).
- Landing lead form + Super Admin «Обращения»: **KAN-31** → `landing-leads.md` (planned).
- Mini App route URLs must not change (bot menu + follow notifications deep-link to them).

## Implementation order

1. KAN-5 — Telegram HMAC auth (unblocks Mini App identity)
2. KAN-6 — Rahmat provider + Order→PAID→Ticket ACTIVE
3. KAN-7 — QR verify + refund state machines + worker jobs
4. KAN-19 contracts (this epic) → KAN-20 admin wizard FE, KAN-21 Mini App profile/map, KAN-24 follow APIs, KAN-26 bot notify worker
