import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    return NextResponse.json(await loadDashboard());
  } catch (error) {
    console.error("[dashboard]", error);
    const message =
      error instanceof Error && error.message.includes("DATABASE_URL")
        ? "DATABASE_URL is not set. Copy .env.example to .env and run npm run db:setup."
        : process.env.VERCEL
          ? "Database unavailable on Vercel. Add a Neon/Supabase DATABASE_URL in Vercel → Settings → Environment Variables, redeploy, then run: npx prisma migrate deploy && npm run db:seed"
          : "Database unavailable. Start PostgreSQL (docker compose up -d or brew services start postgresql@16), then run npm run db:setup.";
    return NextResponse.json({ error: message }, { status: 503 });
  }
}

async function loadDashboard() {
  const providers = await prisma.provider.findMany({
    orderBy: { id: "asc" },
    include: {
      assignments: {
        orderBy: { createdAt: "desc" },
        include: {
          lead: {
            include: { service: true },
          },
        },
      },
    },
  });

  const payload = providers.map((provider) => ({
    id: provider.id,
    name: provider.name,
    monthlyQuota: provider.monthlyQuota,
    leadsReceived: provider.leadsReceived,
    remainingQuota: provider.monthlyQuota - provider.leadsReceived,
    leads: provider.assignments.map((a) => ({
      assignmentId: a.id,
      leadId: a.leadId,
      assignedAt: a.createdAt,
      customerName: a.lead.name,
      phone: a.lead.phone,
      city: a.lead.city,
      description: a.lead.description,
      serviceName: a.lead.service.name,
    })),
  }));

  return payload;
}
