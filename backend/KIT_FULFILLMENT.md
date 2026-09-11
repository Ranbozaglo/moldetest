# Kit fulfillment setup (replaces Zapier COC + prepaid label email)

## 1. Supabase SQL
Run `backend/sql/kit_fulfillment_tables.sql` in the Supabase SQL editor.

## 2. Supabase Storage
Create a **public** (or signed) bucket named `kit-fulfillment` with upload allowed for the service role.

Suggested folders:
- `coc/` — one COC PDF per package
- `labels/` — unique prepaid label PDFs

## 3. Render API env vars
On **moldetest-67e6** (API):

| Key | Purpose |
|-----|---------|
| `SMTP_USERNAME` / `SMTP_PASSWORD` | Send kit emails |
| `STRIPE_SECRET_KEY` | Stripe API |
| `STRIPE_WEBHOOK_SECRET` | Verify webhook |
| `KIT_STORAGE_BUCKET` | default `kit-fulfillment` |

Optional fallbacks (also editable in Admin UI):
- `STRIPE_PLINK_SPOT_CHECK` / `EXTENDED` / `FULL_HOUSE` (`plink_…`)
- `STRIPE_BUY_URL_SPOT_CHECK` / `EXTENDED` / `FULL_HOUSE` (`https://buy.stripe.com/…`)

## 4. Stripe webhook
Endpoint: `https://moldetest-67e6.onrender.com/api/stripe/webhook`

Events:
- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`

## 5. Admin setup
Admin Dashboard → **Kit Fulfillment**
1. Paste each package’s Payment Link ID + buy URL
2. Upload COC PDF for Spot Check, Extended, Full House
3. Upload stock of unique prepaid label PDFs
4. Use **Manual send** to test before cutting over Zapier

## 6. Customer experience
After purchase, email includes COC + unique label.  
Same files appear under **Your kit downloads** on My Inspections.
