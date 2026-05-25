"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert } from "@/components/ui/Alert";
import { PageHeader } from "@/components/ui/PageHeader";

type LeadRow = {
  assignmentId: string;
  leadId: string;
  assignedAt: string;
  customerName: string;
  phone: string;
  city: string;
  description: string;
  serviceName: string;
};

type ProviderDashboard = {
  id: number;
  name: string;
  monthlyQuota: number;
  leadsReceived: number;
  remainingQuota: number;
  leads: LeadRow[];
};

const providerColors = [
  "from-teal-500 to-emerald-600",
  "from-sky-500 to-blue-600",
  "from-violet-500 to-purple-600",
  "from-amber-500 to-orange-600",
  "from-rose-500 to-pink-600",
  "from-cyan-500 to-teal-600",
  "from-indigo-500 to-violet-600",
  "from-lime-500 to-green-600",
];

function QuotaBar({
  received,
  total,
}: {
  received: number;
  total: number;
}) {
  const pct = total > 0 ? Math.min(100, (received / total) * 100) : 0;
  const low = total - received <= 2;

  return (
    <div className="mt-3 space-y-1.5">
      <div className="flex justify-between text-xs text-slate-500">
        <span>Quota used</span>
        <span className="font-medium text-slate-700">
          {received} / {total}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full transition-all ${
            low ? "bg-amber-500" : "bg-teal-500"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function DashboardView() {
  const [providers, setProviders] = useState<ProviderDashboard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/dashboard");
      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          typeof data.error === "string" ? data.error : "Failed to load dashboard",
        );
      }
      setProviders(data);
      setError(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load dashboard data.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const source = new EventSource("/api/dashboard/stream");

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "lead_assigned") {
          load();
        }
      } catch {
        /* ignore */
      }
    };

    return () => source.close();
  }, [load]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
        <p className="text-sm text-slate-600">Loading provider data…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Provider dashboard" />

      {error && <Alert variant="error">{error}</Alert>}

      <div className="grid gap-5 lg:grid-cols-2">
        {providers.map((provider) => {
          const gradient =
            providerColors[(provider.id - 1) % providerColors.length];

          return (
            <section
              key={provider.id}
              className="card overflow-hidden transition hover:shadow-md"
            >
              <div
                className={`bg-gradient-to-r ${gradient} px-5 py-4 text-white`}
              >
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">{provider.name}</h2>
                  <span className="rounded-lg bg-white/20 px-2 py-0.5 text-xs font-medium backdrop-blur">
                    ID {provider.id}
                  </span>
                </div>
              </div>

              <div className="p-5">
                <dl className="grid grid-cols-3 gap-3">
                  <div className="stat-pill">
                    <dt className="text-xs text-slate-500">Received</dt>
                    <dd className="mt-0.5 text-xl font-bold text-slate-900">
                      {provider.leadsReceived}
                    </dd>
                  </div>
                  <div className="stat-pill">
                    <dt className="text-xs text-slate-500">Remaining</dt>
                    <dd
                      className={`mt-0.5 text-xl font-bold ${
                        provider.remainingQuota <= 2
                          ? "text-amber-600"
                          : "text-teal-600"
                      }`}
                    >
                      {provider.remainingQuota}
                    </dd>
                  </div>
                  <div className="stat-pill">
                    <dt className="text-xs text-slate-500">Monthly cap</dt>
                    <dd className="mt-0.5 text-xl font-bold text-slate-900">
                      {provider.monthlyQuota}
                    </dd>
                  </div>
                </dl>

                <QuotaBar
                  received={provider.leadsReceived}
                  total={provider.monthlyQuota}
                />

                <h3 className="mb-3 mt-6 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  Assigned leads
                </h3>

                {provider.leads.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 py-8 text-center text-sm text-slate-500">
                    No leads assigned yet
                  </p>
                ) : (
                  <ul className="max-h-52 space-y-2 overflow-y-auto pr-1">
                    {provider.leads.map((lead) => (
                      <li
                        key={lead.assignmentId}
                        className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-sm transition hover:border-teal-100 hover:bg-teal-50/30"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-slate-900">
                            {lead.customerName}
                          </p>
                          <span className="shrink-0 rounded-md bg-white px-2 py-0.5 text-xs font-medium text-teal-700 ring-1 ring-teal-100">
                            {lead.serviceName}
                          </span>
                        </div>
                        <p className="mt-1 text-slate-600">
                          {lead.phone} · {lead.city}
                        </p>
                        <p className="mt-1 line-clamp-2 text-slate-500">
                          {lead.description}
                        </p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
