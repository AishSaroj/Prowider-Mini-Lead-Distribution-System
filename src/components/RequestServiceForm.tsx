"use client";

import { FormEvent, useEffect, useState } from "react";
import { Alert } from "@/components/ui/Alert";

type Service = { id: number; name: string };

export function RequestServiceForm() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [servicesError, setServicesError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/services")
      .then((r) => r.json())
      .then(setServices)
      .catch(() => setServicesError("Failed to load services."));
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formEl = e.currentTarget;
    setLoading(true);
    setMessage(null);
    setError(null);

    const form = new FormData(formEl);
    const payload = {
      name: form.get("name"),
      phone: form.get("phone"),
      city: form.get("city"),
      serviceId: form.get("serviceId"),
      description: form.get("description"),
    };

    try {
      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Submission failed.");
        return;
      }
      setMessage(
        `Lead created successfully. Assigned to providers: ${data.providerIds.join(", ")}.`,
      );
      formEl.reset();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <form onSubmit={onSubmit} className="card-elevated space-y-5 p-6 sm:p-8">
        <div className="grid gap-5 sm:grid-cols-2">
          <label className="block space-y-2 sm:col-span-2">
            <span className="label-text">Full name</span>
            <input
              name="name"
              required
              placeholder="Jane Smith"
              className="input-field"
            />
          </label>
          <label className="block space-y-2">
            <span className="label-text">Phone number</span>
            <input
              name="phone"
              required
              type="tel"
              placeholder="9999999999"
              className="input-field"
            />
          </label>
          <label className="block space-y-2">
            <span className="label-text">City</span>
            <input
              name="city"
              required
              placeholder="Mumbai"
              className="input-field"
            />
          </label>
          <label className="block space-y-2 sm:col-span-2">
            <span className="label-text">Service type</span>
            <select
              name="serviceId"
              required
              className="input-field"
              defaultValue=""
            >
              <option value="" disabled>
                Select a service
              </option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-2 sm:col-span-2">
            <span className="label-text">Description</span>
            <textarea
              name="description"
              required
              rows={4}
              placeholder="Describe what you need…"
              className="input-field resize-y"
            />
          </label>
        </div>

        <div className="flex justify-center border-t border-slate-100 pt-5">
          <button type="submit" disabled={loading} className="btn-primary">
            {loading ? "Submitting…" : "Submit enquiry"}
          </button>
        </div>
      </form>

      {servicesError && <Alert variant="error">{servicesError}</Alert>}
      {message && <Alert variant="success">{message}</Alert>}
      {error && <Alert variant="error">{error}</Alert>}
    </>
  );
}
