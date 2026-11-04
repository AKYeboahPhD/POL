# Gather for Pray Out Loud 2026 (Faith Life Embassy)

Public check-in `/` · anonymous testimonies `/share` · admin `/admin` (HTTP basic auth).

## Setup
1. Create a Supabase project, run `supabase/schema.sql` in the SQL editor.
2. `cp .env.example .env.local`, fill it in. Keep `SMS_DRY_RUN=true` until the Arkesel sender ID is approved.
3. `npm install && npm run dev`. Deploy to Vercel (add the same env vars, set `APP_URL`).
4. Load pre-registered guests: Supabase Table Editor > attendees > Import CSV (columns: full_name, phone, email; phone as 233XXXXXXXXX).
5. Test with your own number, then set `SMS_DRY_RUN=false`.

## Notes
- Phones are normalised to 233XXXXXXXXX (accepts 024…, +233…, 24…).
- Check-in never depends on SMS: failures are stored in `sms_outbox`; use "Retry" in /admin.
- Delivery status arrives at `/api/sms/callback`. Confirm Arkesel's callback payload fields and adjust that route.
- Testimonies table has no link to attendees and stores no IP/phone.
- Run a rehearsal on the venue Wi-Fi/mobile data before the day.
