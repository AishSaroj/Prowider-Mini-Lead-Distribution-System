import { NextResponse } from "next/server";
import { createLeadWithAssignments } from "@/lib/allocation";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const count = Math.min(Math.max(Number(body.count) || 10, 1), 50);
  const serviceId = Number(body.serviceId) || 1;

  if (![1, 2, 3].includes(serviceId)) {
    return NextResponse.json({ error: "Invalid serviceId." }, { status: 400 });
  }

  const tasks = Array.from({ length: count }, (_, i) =>
    createLeadWithAssignments({
      name: `Concurrent Lead ${Date.now()}-${i}`,
      phone: `9${String(Date.now()).slice(-9)}${String(i).padStart(2, "0")}`,
      city: "Test City",
      serviceId,
      description: `Bulk test lead #${i + 1}`,
    }),
  );

  const settled = await Promise.allSettled(tasks);

  const succeeded = settled.filter((r) => r.status === "fulfilled");
  const failed = settled.filter((r) => r.status === "rejected");

  return NextResponse.json({
    requested: count,
    succeeded: succeeded.length,
    failed: failed.length,
    results: succeeded.map((r) =>
      r.status === "fulfilled" ? r.value : null,
    ),
    errors: failed.map((r) =>
      r.status === "rejected"
        ? r.reason instanceof Error
          ? r.reason.message
          : String(r.reason)
        : null,
    ),
  });
}
