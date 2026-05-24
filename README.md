# Prowider Mini Lead Distribution System

Next.js + PostgreSQL lead enquiry and fair provider assignment system.

---

## Submission

| Item | Link |
|------|------|
| **GitHub repository** | `https://github.com/YOUR_USERNAME/prowider-lead-system` ← replace after push |
| **Live demo** | `https://YOUR_APP.vercel.app` ← replace after deploy |

---

## Setup instructions

### Prerequisites

- Node.js 20+
- PostgreSQL ([Docker](#option-a-docker), [Neon](https://neon.tech), or [Supabase](https://supabase.com))

### Option A: Docker (local Postgres)

```bash
git clone https://github.com/YOUR_USERNAME/prowider-lead-system.git
cd prowider-lead-system
npm install
cp .env.example .env
docker compose up -d
npm run db:setup
npm run dev
```

Open **http://localhost:3000** (redirects to `/request-service`).

### Option B: Cloud Postgres (no Docker)

```bash
git clone https://github.com/YOUR_USERNAME/prowider-lead-system.git
cd prowider-lead-system
npm install
cp .env.example .env
# Set DATABASE_URL in .env to your Postgres connection string
npm run db:setup
npm run dev
```

### Deploy live demo (Vercel + Neon)

1. Push repo to GitHub.
2. Create a Postgres database on [Neon](https://neon.tech) and copy `DATABASE_URL`.
3. Import the repo on [Vercel](https://vercel.com) → add env var `DATABASE_URL`.
4. After first deploy, run once locally (or via Vercel CLI):

   ```bash
   npx prisma migrate deploy
   npm run db:seed
   ```

5. Put the Vercel URL in the table above.

### Routes

| Route | Purpose |
|-------|---------|
| `/request-service` | Customer enquiry form |
| `/dashboard` | Provider quotas + assigned leads (real-time via SSE) |
| `/test-tools` | Webhook simulation + concurrency testing |

---

## Allocation algorithm

Each new lead is assigned to **exactly 3 providers**.

| Service | Mandatory | Fair pool (round-robin) |
|---------|-----------|-------------------------|
| Service 1 | Provider 1 | 2, 3, 4 |
| Service 2 | Provider 5 | 6, 7, 8 |
| Service 3 | Providers 1 & 4 | 2, 3, 5, 6, 7, 8 |

**Steps (in one database transaction):**

1. **Mandatory pass** — Add each mandatory provider if quota remains (`monthlyQuota - leadsReceived > 0`).
2. **Fair pass** — Fill remaining slots from the service pool using **persistent round-robin**:
   - `AllocationState.cursor` holds the next index in the pool array.
   - Scan from `cursor`, skip providers without quota or already chosen, assign eligible providers, advance `cursor`.
   - Cursor is saved to PostgreSQL so rotation continues after server restart.
3. **Quota** — Increment `leadsReceived` atomically; providers at quota are skipped.

No random selection is used.

---

## How concurrency was handled

Lead creation and assignment run inside a single **PostgreSQL transaction** with **`SELECT … FOR UPDATE`** row locks:

1. Insert lead (`@@unique([phone, serviceId])` blocks duplicate enquiries at DB level).
2. Lock `AllocationState` for the service → serializes round-robin cursor updates per service.
3. Lock relevant `Provider` rows → read quota, assign, increment `leadsReceived` safely.
4. Create `LeadAssignment` rows and update cursor in the same transaction.

Isolation level is **ReadCommitted** so concurrent requests **wait on locks** instead of failing. Up to **5 retries** handle rare deadlocks or serialization conflicts.

Concurrent bulk creation is tested via `/test-tools` → “Generate 10 leads instantly”.

---

## How webhook idempotency is ensured

Quota reset is **only** available through `POST /api/webhooks/quota-reset` (simulated from `/test-tools`, not from customer UI).

Each request must include header **`Idempotency-Key`**.

Inside a transaction:

1. Look up `WebhookEvent` by `idempotencyKey`.
2. If it exists → return success with `alreadyProcessed: true` (**no quota change**).
3. If new → reset all providers (`leadsReceived = 0`, `monthlyQuota = 10`), insert `WebhookEvent` record, return `alreadyProcessed: false`.

Calling the webhook multiple times with the **same key** therefore applies the reset **once only**.

---

## Tech stack

- **Frontend:** Next.js (App Router), React, Tailwind CSS
- **Database:** PostgreSQL
- **ORM:** Prisma 7

## API reference

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/services` | List services |
| `POST` | `/api/leads` | Create lead + assign providers |
| `GET` | `/api/dashboard` | Provider quotas and leads |
| `GET` | `/api/dashboard/stream` | SSE real-time updates |
| `POST` | `/api/webhooks/quota-reset` | Reset quotas (idempotent) |
| `POST` | `/api/test/generate-leads` | Bulk leads for concurrency testing |

## Evaluator testing checklist

1. Duplicate phone + same service → `409` conflict.
2. Same phone + different service → allowed.
3. `/dashboard` open + submit lead in another tab → updates without refresh.
4. `/test-tools` → webhook 5× same key → only first resets quotas.
5. Generate 10 leads → fair rotation among pool providers; quota ≤ 10.
