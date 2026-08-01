# Stripe setup plan

Wire Stripe for **donations** (replace / complement `NEXT_PUBLIC_DONATE_URL`) and later **event fees** (replace optional PayPal.me links). Use **test** keys until go-live.

## Status

| Step | Done? |
| --- | --- |
| Stripe account created | ☐ |
| Test API keys in `.env.local` | ☐ |
| Test keys on Vercel (Preview + Production) | ☐ |
| Webhook endpoint + signing secret | ☐ |
| App: Checkout + `/api/stripe/webhook` | ☐ (not built yet) |
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
2. Endpoint URL (pick one; update after domain cutover):
   - Preview: `https://maddys-foundation.vercel.app/api/stripe/webhook`
   - Canonical later: `https://maddysfoundation.org/api/stripe/webhook`
3. Subscribe at least to:
   - `checkout.session.completed`
   - `payment_intent.succeeded` (if we use Payment Intents)
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
2. **Event fees** — Checkout for an event’s `fee_cents` instead of `paypal_link`.
3. **Webhook** — `/api/stripe/webhook` verifies `STRIPE_WEBHOOK_SECRET`, then marks registration paid / records donation in Turso.

## Checklist before live mode

- [ ] Test donation completes in test mode
- [ ] Webhook delivers `checkout.session.completed` (Dashboard → Webhooks → attempts)
- [ ] Switch Dashboard to live mode; create **live** webhook URL
- [ ] Replace env vars with `pk_live_` / `sk_live_` / live `whsec_`
- [ ] Redeploy Vercel; smoke-test a small real charge + refund if needed

## Related

- Current placeholder: `NEXT_PUBLIC_DONATE_URL` (external link until Stripe ships)
- Event fees today: optional `paypal_link` on events in admin
