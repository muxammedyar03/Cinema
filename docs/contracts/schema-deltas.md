# Schema deltas (KAN-5 / KAN-6 / KAN-7 / KAN-19)

Proposed Prisma changes only — **not applied** in this PR. Source of truth today: `apps/api/prisma/schema.prisma`.

## 1. PaymentProvider — add RAHMAT (KAN-6)

```prisma
enum PaymentProvider {
  RAHMAT   // MVP sole provider
  CLICK    // deprecated for MVP — keep for historical rows
  PAYME    // deprecated for MVP — keep for historical rows
}
```

- Existing `Payment @@unique([provider, providerPaymentId])` stays.
- New payments MUST use `provider = RAHMAT`.
- `providerPaymentId` for Rahmat: prefer Rahmat payment `id` (stringified) or `uuid` — pick one in implementation and store consistently; see [rahmat-payment.md](./rahmat-payment.md).

Optional Payment fields (recommended):

```prisma
model Payment {
  // ... existing ...
  providerInvoiceUuid String?  // Rahmat invoice UUID when createInvoice returns one
  deeplinkUrl         String?  // last issued pay URL / deeplink for UX retry
  paidAt              DateTime?
}
```

## 2. Refund — initiator + partial ticket linkage (KAN-7)

Current `Refund` lacks initiator and which tickets were refunded.

```prisma
enum RefundInitiator {
  SELF    // customer Mini App self-refund
  STAFF   // cinema staff via admin mobile web
  SYSTEM  // session cancel / hold expiry / reconciliation
}

model Refund {
  id               String          @id @default(cuid())
  paymentId        String
  orderId          String
  amountUzs        Int
  reason           String?
  status           RefundStatus    @default(PENDING)
  providerRefundId String?
  errorMessage     String?
  initiator        RefundInitiator
  initiatedByUserId String?        // staff or customer user id when applicable
  idempotencyKey   String          @unique
  createdAt        DateTime        @default(now())
  updatedAt        DateTime        @updatedAt

  payment Payment       @relation(fields: [paymentId], references: [id])
  order   Order         @relation(fields: [orderId], references: [id])
  items   RefundItem[]
  initiatedBy User?     @relation("RefundInitiator", fields: [initiatedByUserId], references: [id])
}

model RefundItem {
  id        String @id @default(cuid())
  refundId  String
  ticketId  String
  amountUzs Int

  refund Refund @relation(fields: [refundId], references: [id])
  ticket Ticket @relation(fields: [ticketId], references: [id])

  @@unique([refundId, ticketId])
  @@index([ticketId])
}
```

Also add on `Ticket` / `User` the reverse relations:

```prisma
model Ticket {
  // ... existing ...
  refundItems RefundItem[]
}

model User {
  // ... existing ...
  refundsInitiated Refund[] @relation("RefundInitiator")
}
```

### Partial refund invariants

- Sum of `RefundItem.amountUzs` for a refund = `Refund.amountUzs`.
- Sum of successful refund amounts for an order ≤ original `Payment.amountUzs` (PAID).
- Ticket linked by `RefundItem` transitions `ACTIVE` → `REFUNDED` (never from `USED` without explicit staff override policy — default: **reject** refund of `USED` tickets).
- Order status:
  - all tickets refunded → `REFUNDED`
  - some tickets remain `ACTIVE`/`USED` after partial → stay `PAID` (or introduce `PARTIALLY_REFUNDED` in a later migration — **MVP assumption: keep `PAID` + ticket-level truth**)

## 3. Notification types (KAN-7 jobs)

No schema change required; use existing `Notification`:

| `type` | When |
| --- | --- |
| `PAYMENT_SUCCEEDED` | Order PAID |
| `REFUND_SUCCEEDED` | Refund SUCCEEDED |
| `REFUND_FAILED` | Refund FAILED |
| `SESSION_CANCELLED` | Session cancel → tickets refunded |
| `TICKET_USED` | Staff QR verify marks USED (optional) |

## 4. Out of scope for this delta set

- Changing `OrderStatus` / `TicketStatus` enum values (already sufficient).
- Worker / BullMQ tables (use Redis queues; no Prisma models).


---

## KAN-19 — Cinema profile & follow

Proposed Prisma changes only — **not applied** in this PR. Append-only relative to KAN-5/6/7 deltas above; **do not** rewrite Rahmat / refund sections.

### 1. MapProvider enum

```prisma
enum MapProvider {
  google
  yandex
}
```

### 2. Cinema — profile / geo / completion flags

Additive fields on existing `Cinema` (keep `phone` for backward compat):

```prisma
model Cinema {
  // ... existing fields unchanged ...
  lat                     Decimal?     @db.Decimal(10, 7)
  lng                     Decimal?     @db.Decimal(10, 7)
  mapProvider             MapProvider?
  instagramUrl            String?
  telegramContact         String?
  phones                  String[]     @default([])
  stepPhotosDone          Boolean      @default(false)
  stepLocationDone        Boolean      @default(false)
  stepInstagramDone       Boolean      @default(false)
  stepPhonesDone          Boolean      @default(false)
  stepTelegramContactDone Boolean      @default(false)
  stepSecurityEmailDone   Boolean      @default(false)
  profileComplete         Boolean      @default(false)

  photos  CinemaPhoto[]
  follows CinemaFollow[]
}
```

`profileComplete` is derived:

```
photos && location && instagram && phones && telegramContact && securityEmail
```

Persist on write; see [cinema-profile.md](./cinema-profile.md).

### 3. CinemaPhoto

```prisma
model CinemaPhoto {
  id        String   @id @default(cuid())
  cinemaId  String
  url       String
  sortOrder Int      @default(0)
  createdAt DateTime @default(now())

  cinema Cinema @relation(fields: [cinemaId], references: [id], onDelete: Cascade)

  @@index([cinemaId, sortOrder])
}
```

### 4. CinemaFollow

```prisma
model CinemaFollow {
  id        String   @id @default(cuid())
  userId    String
  cinemaId  String
  createdAt DateTime @default(now())

  user   User   @relation(fields: [userId], references: [id], onDelete: Cascade)
  cinema Cinema @relation(fields: [cinemaId], references: [id], onDelete: Cascade)

  @@unique([userId, cinemaId])
  @@index([cinemaId])
  @@index([userId])
}
```

Reverse relations:

```prisma
model User {
  // ... existing ...
  follows CinemaFollow[]
  // notifications Notification[]  — already present
}

model Cinema {
  // ... see above ...
  follows CinemaFollow[]
}
```

### 5. User — email verification (security step)

MVP needs a verified-email signal for `stepSecurityEmailDone`. Prefer additive nullable fields (avoid new table unless token store required):

```prisma
model User {
  // ... existing email String? @unique ...
  emailVerifiedAt DateTime?
  // optional one-time token store — pick ONE in implementation:
  // emailVerifyTokenHash String?
  // emailVerifyExpiresAt DateTime?
}
```

If tokens should be multi-use / rotatable, a small `EmailVerificationToken` model is acceptable in the implementation PR; not required for contract lock.

### 6. Notification types (KAN-19 / KAN-24 / KAN-26)

No schema change required; use existing `Notification`:

| `type` | When |
| --- | --- |
| `CINEMA_SESSION_PUBLISHED` | Session transitioned to `PUBLISHED`; user follows cinema |
| `CINEMA_AFISHA_DIGEST` | Optional debounced digest of multiple publishes |

Payload / job shapes: [follow-notify.md](./follow-notify.md).

### 7. Out of scope for KAN-19 deltas

- Changing `SessionStatus` / `MovieStatus` enums (already sufficient; trigger = enter `PUBLISHED`).
- Bitmask integer for profile steps (explicit booleans locked).
- Storing raw `String[]` photos on Cinema (use `CinemaPhoto`).
- Worker / BullMQ tables (Redis queues; no Prisma models).

## Design v2 (KAN-32) — proposed, not applied

All optional / nullable, additive only. Details and consumers: [design-v2-gaps.md](./design-v2-gaps.md) §5.

| Model | Field | Why (v2 screen) |
| --- | --- | --- |
| `Cinema` | `city String?` | Super Admin «Кинотеатры» city column, admin sidebar, Mini App header |
| `Cinema` | `tagline String?` | Mini App cinema card short line (optional) |
| `Hall` | `format String?` | Admin «Залы» badge (e.g. `3D · Dolby`) |
| `CinemaPhoto` | `caption String? @db.VarChar(160)` | Mini App photo dialog caption |
| `Movie` | `isFeatured Boolean @default(false)` | Mini App «В центре внимания» (phase 2) |
| `Session` | `audioLanguage String?` | Mini App «Зал 01 · Русский» (optional) |

`Lead` model is defined in KAN-31 (`landing-leads.md`), not here.

