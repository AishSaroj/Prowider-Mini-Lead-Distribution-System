import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

/**
 * Seed data required by the assignment:
 * - Services: Service 1, Service 2, Service 3
 * - Providers 1–8, each with monthlyQuota = 10, leadsReceived = 0
 * - AllocationState cursors for fair round-robin per service
 *
 * Mandatory rules (enforced in src/lib/service-rules.ts):
 * - Service 1 → Provider 1 + 2 from pool [2,3,4]
 * - Service 2 → Provider 5 + 2 from pool [6,7,8]
 * - Service 3 → Providers 1 & 4 + 1 from pool [2,3,5,6,7,8]
 */
async function main() {
  const services = [
    { id: 1, name: "Service 1" },
    { id: 2, name: "Service 2" },
    { id: 3, name: "Service 3" },
  ];

  for (const service of services) {
    await prisma.service.upsert({
      where: { id: service.id },
      update: { name: service.name },
      create: service,
    });
  }

  for (let i = 1; i <= 8; i += 1) {
    await prisma.provider.upsert({
      where: { id: i },
      update: {
        name: `Provider ${i}`,
        monthlyQuota: 10,
      },
      create: {
        id: i,
        name: `Provider ${i}`,
        monthlyQuota: 10,
        leadsReceived: 0,
      },
    });
  }

  for (const serviceId of [1, 2, 3]) {
    await prisma.allocationState.upsert({
      where: {
        serviceId_poolKey: { serviceId, poolKey: "fair" },
      },
      update: {},
      create: { serviceId, poolKey: "fair", cursor: 0 },
    });
  }

  console.log("Seed complete:");
  console.log("  Services: Service 1, Service 2, Service 3");
  console.log("  Providers: 1–8 (monthly quota 10 each)");
  console.log("  Allocation cursors initialized for fair distribution");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
