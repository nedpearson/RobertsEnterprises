# Roberts Enterprise

Multi-tenant retail operations platform for **I Do Bridal Couture** & **Proper & Co** —
appointments, alterations, orders, inventory, transfers, pickups, purchasing, payroll,
staff, communications, and reporting. Built on Flask + PostgreSQL with per-company
branding/theming and an AI voice assistant.

## Stack
- **Backend:** Flask 3 + Flask-SocketIO (blueprint-per-module)
- **Database:** PostgreSQL (schema auto-creates on first boot via `init_db()`)
- **Integrations:** Stripe, Twilio (SMS), SendGrid (email), OpenAI (voice/AI) — all optional
- **Server:** gunicorn (see `Procfile`)

## Run locally

Requires Python 3.12 and a running PostgreSQL instance.

```bash
# 1. install deps
pip install -r requirements.txt

# 2. configure env
cp .env.example .env
#   → set DATABASE_URL and FLASK_SECRET_KEY at minimum

# 3. start (schema auto-creates on boot)
cd app
python app.py            # dev, http://localhost:5005
# or production-style:
gunicorn --worker-class gthread --workers 1 --threads 10 --timeout 120 --chdir app app:app
```

### Seed demo data (optional)
```bash
cd app
python -c "from seed_demo import seed_demo_data; seed_demo_data()"
```
Demo owner login: `ramsey@idobridalcouture.com` / `1979Ramsey30!`
(Change or remove before real use.)

## Deploy (one-click, Render)

`render.yaml` provisions a managed Postgres DB + web service and wires
`DATABASE_URL` automatically; `FLASK_SECRET_KEY` is auto-generated.

1. Push this repo to GitHub.
2. Render → **New → Blueprint** → select the repo.
3. Add optional secrets (OpenAI/Twilio/SendGrid) in the dashboard.
4. First boot auto-creates the schema. To load demo data once live, hit
   `/force-seed-database-railway` (remove or lock this route before production).

Works the same on Railway/Fly with equivalent env vars.

## Environment variables
See `.env.example`. Only `DATABASE_URL` and `FLASK_SECRET_KEY` are required;
integration keys are optional and features degrade gracefully without them.
