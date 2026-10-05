# Rahmat / Multicard merchant integration

Implemented against docs.multicard.uz, reviewed 2026-10-05. This replaces the earlier speculative payment-app contract: Cinema is a merchant, not a Rahmat payment application. Authentication is application_id + secret at POST /auth, followed by Bearer tokens.

## Two independent obligations

Ticket payments use the split kassa. The customer binds a card on Multicard's hosted form, returns to the order, explicitly creates the split payment and confirms it (SMS where required). No PAN, CVV, card token, or OTP is stored in Cinema. Binding session IDs are scoped to the signed-in user and expire after 15 minutes. For now, split payments accept Uzcard/Humo only: Visa/MasterCard tariffs and 3DS require additional configuration and testing.

Subscriptions use a separate kassa. Cinema admins open `/billing/my` and pay monthly invoices using the hosted checkout; locked cinemas can pay from the lock screen. A verified successful payment closes the invoice. Unlocking occurs only when no other locked outstanding invoice remains, and never enables a DISABLED cinema.

There is no unattended recurring debit in this change. Each monthly subscription invoice is paid explicitly; card binding alone is not authorization for future recurring charges.

## Split accounting

All provider amounts are integer tiyin (UZS × 100). Platform commission uses the existing per-ticket setting, counting each general admission ticket. Seller proceeds = gross ticket price − acquiring fee − platform commission. Fees are calculated with integer ceiling; a non-positive seller allocation is rejected. Zero platform commission omits its split entry.

`RAHMAT_TICKET_FEE_BPS` must match the signed **fee-down** acquiring contract. The 2% acquiring fee belongs to Multicard and is separate from the platform's own commission. Do not use the 2% setting for Visa/MasterCard transactions. `RAHMAT_CINEMA_RECIPIENTS` maps cinema IDs to recipient account UUIDs issued by Multicard; these are not raw bank account numbers. The platform recipient is configured separately. Fiscal identifiers and the legal entity TIN must be agreed with Multicard for the marketplace/commissioner fiscalization model before production.

The documented `POST /payment/invoice` request has no split property. Therefore the implementation does **not** invent split+deeplink support. Tickets use the documented token-based `POST /payment` split request. Subscriptions receive the documented checkout URL and deeplink. Ask support to confirm a documented hosted split/deeplink method if that ticket UX is required.

## API

| Cinema route | Authorization / purpose |
| --- | --- |
| POST /payments/rahmat/bind `{orderId}` | Order owner; returns hosted card form and sessionId |
| POST /payments/rahmat/create `{orderId,bindingId}` | Order owner; checks bound session and creates one split attempt |
| POST /payments/:id/confirm `{otp?}` | Order owner; explicit debit confirmation |
| GET /payments/:id | Owner / invoice cinema admin; sanitized local state |
| POST /payments/:id/sync | Owner / invoice cinema admin; provider reconciliation |
| GET /orders/:id/payment | Order owner |
| GET /admin/billing/my-invoices | Cinema admin; own invoices only (super admin: all) |
| POST /admin/billing/invoices/:id/rahmat | Cinema admin / super admin; subscription checkout |
| POST /webhooks/rahmat/ticket/success | Signed success callback for split kassa |
| POST /webhooks/rahmat/subscription/success | Signed success callback for subscription kassa |
| POST /webhooks/rahmat/{ticket,subscription}/events | Optional signed status webhooks |

Provider endpoints: POST /auth; POST /payment/card/bind; GET /payment/card/bind/{session_id}; POST /payment; PUT /payment/{uuid}; GET /payment/{uuid}; POST /payment/invoice; GET /payment/invoice/{uuid}.

## Callbacks and duplicate protection

Success signature: MD5 of store_id + invoice_id + amount + kassa secret. Status webhook signature: MD5 of uuid + amount + kassa secret. Signatures are compared in constant time. Since neither signature covers every received field, Cinema also checks authenticated provider identity, invoice reference, store and amount; webhook status is fetched from the provider rather than trusted in the body. During synchronous success callbacks, `billing` is accepted because provider success may depend on the merchant's response. HTTP 200 with `{success:true}` follows committed fulfillment only.

One durable RahmatCheckout per order/subscription invoice prevents simultaneous duplicate creation. A row lock serializes callback fulfillment; order and payment updates, seat sales and ticket creation are atomic. The existing Telegram fulfillment is reused with provider RAHMAT and a namespaced internal charge key. Click remains available for existing deployments; Rahmat appears when configured.

Expired/released bookings are rejected in synchronous callbacks, allowing Multicard to reverse the payment under its callback contract. If a terminal success is discovered after expiration, no tickets are issued; reconciliation/refund requires operations review. Automatic refunds and partial refunds are not implemented here. Status events for non-success do not overwrite fulfilled orders; support must reconcile external reversals until refund processing is added.

Unknown POST outcomes remain CREATING and block fresh charges. No automatic retry is made after network timeouts. Operators must locate the attempt's local invoice_id in the Multicard merchant console and reconcile it before any reset. Never delete an attempt merely because the client saw an error. A verified callback can fulfill an attempt even if the create response was lost.

## Setup and rollout

1. Apply via open.rhmt.uz for internet acquiring; obtain the two kassas/contracts described by support.
2. Obtain per-kassa application_id, secret, numeric store ID, bank-recipient UUIDs, acquiring fee and fiscal settings.
3. Fill API environment variables in `.env.example`. Secrets belong only on the VPS API, never in NEXT_PUBLIC variables or Vercel frontend configuration. Keep callback secrets stable until outstanding invoices complete.
4. Configure HTTPS public API and frontend URLs. The success callback URL is sent in each request. Webhook mode must be enabled by Multicard separately; configure its `/events` URL with support.
5. Run `prisma migrate deploy`, regenerate the Prisma client, rebuild and restart the API. Existing Click/PAYME rows are preserved.
6. Verify sandbox: card binding, SMS/no-SMS confirmation, split bank recipients, correct fee and fiscal receipt, subscription checkout, tenant access, duplicate/parallel callbacks, booking expiry, declined charges, lost response and repeated status queries.
7. Switch RAHMAT_BASE_URL to https://mesh.multicard.uz and replace all sandbox identifiers only after provider acceptance. Production charging has not been exercised by automated tests.

Automated tests cover monetary conversion, split arithmetic, signatures, tenant access, remote callback identity, webhook trust boundaries and duplicate ticket fulfillment. Database locking and real provider behavior still require sandbox/PostgreSQL integration testing.

## Sources

- https://docs.multicard.uz/llms.txt
- https://docs.multicard.uz/introduction-4736405f0
- https://docs.multicard.uz/получение-токена-19729295e0
- https://docs.multicard.uz/создание-расщепленного-платежа-19729312e0
- https://docs.multicard.uz/создание-инвойса-19729296e0
- https://docs.multicard.uz/привязка-карт-форма-4488545f0
- https://docs.multicard.uz/callback-success-19729300e0
- https://docs.multicard.uz/callback-webhooks-19729301e0
