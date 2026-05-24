import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
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

  return NextResponse.json(payload);
}
