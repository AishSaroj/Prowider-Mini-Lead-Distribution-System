"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";

export default function TestToolsPage() {
  const [log, setLog] = useState<string[]>([]);
  const [idempotencyKey, setIdempotencyKey] = useState(
    () => `payment-${crypto.randomUUID()}`,
  );
  const [busy, setBusy] = useState(false);

  function append(message: string) {
    setLog((prev) => [
      `[${new Date().toLocaleTimeString()}] ${message}`,
      ...prev,
    ]);
  }

  async function callWebhook(times: number) {
    setBusy(true);
    for (let i = 0; i < times; i += 1) {
      try {
        const res = await fetch("/api/webhooks/quota-reset", {
          method: "POST",
          headers: { "Idempotency-Key": idempotencyKey },
        });
        const data = await res.json();
        append(
          `Webhook #${i + 1}: ${res.status} — ${data.message} (alreadyProcessed=${data.alreadyProcessed})`,
        );
      } catch {
        append(`Webhook #${i + 1}: network error`);
      }
    }
    setBusy(false);
  }

  async function generateLeads() {
    setBusy(true);
    try {
      const res = await fetch("/api/test/generate-leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ count: 10, serviceId: 1 }),
      });
      const data = await res.json();
      append(
        `Generate 10 leads: ${data.succeeded} succeeded, ${data.failed} failed`,
      );
    } catch {
      append("Generate leads: network error");
    }
    setBusy(false);
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <PageHeader title="Test tools" />
      <section className="card-elevated space-y-5 p-6 sm:p-8">
        <label className="block space-y-2">
          <span className="label-text">Idempotency-Key (payment event id)</span>
          <input
            value={idempotencyKey}
            onChange={(e) => setIdempotencyKey(e.target.value)}
            className="input-field font-mono text-xs"
          />
        </label>

        <div className="grid gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => callWebhook(1)}
            className="btn-primary w-full"
          >
            Reset provider quota to 10 (simulate successful payment)
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => callWebhook(5)}
            className="btn-secondary w-full"
          >
            Call webhook multiple times (to test idempotency)
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={generateLeads}
            className="btn-secondary w-full"
          >
            Generate 10 leads instantly (to test concurrency)
          </button>
          <button
            type="button"
            onClick={() => setIdempotencyKey(`payment-${crypto.randomUUID()}`)}
            className="btn-ghost w-full border border-slate-200"
          >
            New idempotency key
          </button>
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-3">
          <h2 className="text-sm font-semibold text-slate-800">Activity log</h2>
        </div>
        <div className="p-4">
          {log.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-500">
              No actions yet. Run a test above.
            </p>
          ) : (
            <ul className="max-h-72 space-y-2 overflow-y-auto">
              {log.map((line, i) => (
                <li
                  key={`${line}-${i}`}
                  className="rounded-lg bg-slate-900 px-3 py-2 font-mono text-xs leading-relaxed text-slate-100"
                >
                  {line}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
