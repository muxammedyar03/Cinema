# Schema deltas (KAN-5 / KAN-6 / KAN-7)

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
