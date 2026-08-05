# Stripe setup plan

Wire Stripe for **donations** (replace / complement `NEXT_PUBLIC_DONATE_URL`) and **event fees**. Use **test** keys until go-live.

## Status

| Step | Done? |
| --- | --- |
| Stripe account created | ☐ |
| Test API keys in `.env.local` | ☐ |
| Test keys on Vercel (Preview + Production) | ☐ (vars exist — must be non-empty `pk_` / `sk_` / `whsec_`) |
| Webhook endpoint + signing secret | ☐ URL: `/api/stripe/webhook` |
| App: Checkout + `/api/stripe/webhook` | ✅ built — team/event fees redirect to Stripe Checkout; webhook marks registration paid |
| Live keys + live webhook after soft launch | ☐ |

## Keys you need

| Env var | Example prefix | Browser-safe? | Where in Dashboard |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | `pk_test_…` / `pk_live_…` | Yes | [Developers → API keys](https://dashboard.stripe.com/apikeys) |
| `STRIPE_SECRET_KEY` | `sk_test_…` / `sk_live_…` | **No** — server only | Same page (Reveal) |
| `STRIPE_WEBHOOK_SECRET` | `whsec_…` | **No** — server only | [Developers → Webhooks](https://dashboard.stripe.com/webhooks) → endpoint → Signing secret |

Optional later:

| Env var | When |
| --- | --- |
| Stripe Price / Product IDs | Fixed donate amounts or ticketed events |
| Customer Portal / Tax settings | Receipts, tax, donor self-serve |

**Never** commit `sk_` or `whsec_` values. **Never** put the secret key in a `NEXT_PUBLIC_*` var.

## How to get them

### 1. Account

1. Open [https://dashboard.stripe.com](https://dashboard.stripe.com) and sign up / log in.
2. Complete business basics when Stripe asks (can stay in test mode first).

### 2. API keys (test mode)

1. Turn **Test mode** **ON** (Dashboard toggle).
2. Go to **Developers → API keys**.
3. Copy **Publishable key** → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`.
4. Reveal **Secret key** → `STRIPE_SECRET_KEY`.

### 3. Webhook (needed so the app knows payment succeeded)

**Production / Vercel**

1. **Developers → Webhooks → Add endpoint**
2. Endpoint URL:
   - Production: `https://maddysfoundation.org/api/stripe/webhook`
   - Preview (optional): `https://<preview>.vercel.app/api/stripe/webhook`
3. Subscribe at least to:
   - `checkout.session.completed`
   - `checkout.session.expired` (drops unpaid registration drafts)
   - `checkout.session.async_payment_failed` (optional)
   - `charge.refunded` (optional)
4. After create → **Reveal** signing secret → `STRIPE_WEBHOOK_SECRET`

**Local**

```bash
# https://stripe.com/docs/stripe-cli
stripe login
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

Use the `whsec_…` the CLI prints in `.env.local` for local only.

### 4. Put keys in env

**`.env.local`**

```bash
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

**Vercel** → Project `maddys-foundation` → **Settings → Environment Variables**  
Add the same three for Preview + Production (test keys first; swap to `pk_live_` / `sk_live_` / live `whsec_` at launch).

## What we’ll build with them (app work)

1. **Donate** — Stripe Checkout (or Payment Element) on `/donate` instead of only an external URL.
2. **Event fees** — Checkout for an event’s `fee_cents` via Stripe.
3. **Webhook** — `/api/stripe/webhook` verifies `STRIPE_WEBHOOK_SECRET`, then marks registration paid / records donation in Turso.

## Checklist before live mode

- [ ] Test donation completes in test mode
- [ ] Webhook delivers `checkout.session.completed` (Dashboard → Webhooks → attempts)
- [ ] Switch Dashboard to live mode; create **live** webhook URL
- [ ] Replace env vars with `pk_live_` / `sk_live_` / live `whsec_`
- [ ] Redeploy Vercel; smoke-test a small real charge + refund if needed

## Related

- Current placeholder: `NEXT_PUBLIC_DONATE_URL` (Venmo / external link until Stripe donate ships)
- Event fees: Stripe Checkout only (`STRIPE_SECRET_KEY` required for paid registration)

## Testing the 10-minute capacity hold

1. Open the scramble event page — capacity bar should show counts (e.g. `0 / 31 teams`) and the hold note.
2. Submit a team registration — countdown screen, then Stripe Checkout.
3. In another browser, capacity should show a spot **held in checkout**.
4. Wait 10+ minutes (or `GET /api/cron/release-holds` with `Authorization: Bearer $CRON_SECRET`) — hold clears, Stripe session expires, spot returns.
5. Cancel checkout early — spot releases immediately; form must be filled again.
6. Pay within 10 minutes — team appears on the admin roster as paid.
