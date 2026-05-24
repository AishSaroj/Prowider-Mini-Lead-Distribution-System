# Submission checklist

Copy this into your assignment submission email/form after filling in the links.

---

**GitHub repository:**  
https://github.com/YOUR_USERNAME/prowider-lead-system

**Live demo URL:**  
https://YOUR_APP.vercel.app

---

## Setup (quick)

```bash
git clone https://github.com/YOUR_USERNAME/prowider-lead-system.git
cd prowider-lead-system
npm install
cp .env.example .env
# Set DATABASE_URL, then:
npm run db:setup
npm run dev
```

---

## Allocation algorithm

Each lead gets exactly 3 providers. Mandatory providers are assigned first (if quota allows). Remaining slots are filled via **round-robin** over a fixed pool per service, using a **cursor stored in PostgreSQL** (`AllocationState`). The cursor advances after each pick so providers rotate fairly over time—not randomly—and state survives restarts.

---

## Concurrency handling

Assignment runs in one transaction with **`SELECT FOR UPDATE`** on the allocation cursor and provider rows. Quota checks and increments happen while rows are locked, so parallel lead creation cannot over-assign quota or corrupt the round-robin cursor. **ReadCommitted** isolation plus automatic retries handle high concurrency (tested with 10 simultaneous leads from `/test-tools`).

---

## Webhook idempotency

`POST /api/webhooks/quota-reset` requires an `Idempotency-Key` header. The key is stored in `WebhookEvent` with a unique constraint. Duplicate requests with the same key return success without resetting quotas again. Quota reset is only exposed via this webhook—not from the customer form or dashboard.
