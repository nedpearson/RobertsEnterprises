# Powerful Form → VowOS appointment requests

VowOS does not poll the Powerful Form Builder admin. New submissions must be
sent to the authenticated shadow-ingestion endpoint by a server-side
Powerful Form, Make, Zapier, or n8n automation.

## Production endpoint

```text
POST https://api.robertsenterprises.bridgebox.ai/api/scheduling/public/form-bridge
Authorization: Bearer <PUBLIC_FORM_BRIDGE_SECRET>
Content-Type: application/json
```

The secret lives only in the Railway `api` service and the server-side
automation. Never place it in Shopify theme JavaScript, a query string, a form
field, GitHub, or browser storage.

## Ongoing automation

Create one automation for each Powerful Form appointment form:

1. Trigger on a new Powerful Form submission.
2. Add an HTTP POST action using the production endpoint and headers above.
3. Send these routing fields as constants or provider values:

   - `sourceProvider`: `powerful-form`
   - `externalSubmissionId`: the Powerful Form submission `ID`
   - `siteDomain`: exactly `idobridalcouture.com` or `properandcompany.com`

4. Map the form answers using their existing labels. At minimum VowOS requires:

   - `First and Last Name` or `First + Last Name`
   - `Email`
   - `Store Location` (`Baton Rouge` or `Covington`)

5. Also map the appointment, phone, wedding/occasion, budget, party-size,
   beverage, and notes fields. The bridge already recognizes the current I Do
   Bridal Couture and Proper & Co. labels.
6. Test the automation with a real provider test submission. HTTP `200` with
   `success: true` confirms ingestion. Retrying the same provider ID returns
   `duplicate: true` and does not create another request.

Do not use `/api/form-bridge/bridge.js` as the ingestion mechanism. That legacy
storefront script is intentionally a no-op because browser JavaScript cannot
hold a server secret.

## Import an existing export

Export the Powerful Form submissions as CSV or XLSX. Keep the `ID` column and
the original field-label headers, then run from the repository root:

```bash
export PUBLIC_FORM_BRIDGE_SECRET='<copy from Railway api Variables>'

# Validate without transmitting customer data
npm run appointments:backfill -- \
  --file /absolute/path/to/ido-submissions.xlsx \
  --domain idobridalcouture.com \
  --dry-run

# Import idempotently
npm run appointments:backfill -- \
  --file /absolute/path/to/ido-submissions.xlsx \
  --domain idobridalcouture.com
```

Run the same command with `properandcompany.com` for the Proper export. The
utility sends each row through the production bridge instead of bypassing
tenant checks with a database service key. Re-running an export is safe because
the provider submission ID is the idempotency key.

Delete local exports after verification; they contain customer personal data.

## Verification

1. Railway `api` request logs show `POST /api/scheduling/public/form-bridge 200`.
2. The VowOS Today card reports the number of pending requests received by
   VowOS instead of treating a load failure as “All caught up.”
3. Appointments → Booking Requests shows the customer, requested boutique,
   dates/windows, and original provider submission ID.
4. A retry of the same Powerful Form ID does not increase the count.

## Troubleshooting

- `401`: the automation secret does not match Railway
  `PUBLIC_FORM_BRIDGE_SECRET`.
- `400`: a required provider ID, customer name, valid email, domain, or location
  is missing.
- `503`: the exact website/brand/location mapping is absent or ambiguous.
- No request log at all: the Powerful Form automation is not enabled or is not
  reaching its HTTP action.
