import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { emitDashboardUpdate } from "@/lib/events";
import {
  getServiceRule,
  TOTAL_SLOTS_PER_LEAD,
} from "@/lib/service-rules";

export type CreateLeadInput = {
  name: string;
  phone: string;
  city: string;
  serviceId: number;
  description: string;
};

export type CreateLeadResult = {
  leadId: string;
  providerIds: number[];
};

function remainingQuota(
  provider: { monthlyQuota: number; leadsReceived: number },
): number {
  return provider.monthlyQuota - provider.leadsReceived;
}

function hasQuota(
  provider: { monthlyQuota: number; leadsReceived: number },
): boolean {
  return remainingQuota(provider) > 0;
}

/**
 * Round-robin over `pool`, starting at `cursor`.
 * Skips providers without quota or already chosen.
 * Returns picked provider IDs and the next cursor position.
 */
function pickFromPool(
  pool: number[],
  cursor: number,
  providersById: Map<
    number,
    { monthlyQuota: number; leadsReceived: number }
  >,
  alreadyAssigned: Set<number>,
  count: number,
): { picked: number[]; nextCursor: number } {
  const picked: number[] = [];
  if (count <= 0 || pool.length === 0) {
    return { picked, nextCursor: cursor };
  }

  let index = ((cursor % pool.length) + pool.length) % pool.length;
  let scanned = 0;

  while (picked.length < count && scanned < pool.length) {
    const providerId = pool[index];
    const provider = providersById.get(providerId);

    if (
      provider &&
      hasQuota(provider) &&
      !alreadyAssigned.has(providerId)
    ) {
      picked.push(providerId);
      alreadyAssigned.add(providerId);
    }

    index = (index + 1) % pool.length;
    scanned += 1;
  }

  return { picked, nextCursor: index };
}

async function assignProvidersInTransaction(
  tx: Prisma.TransactionClient,
  serviceId: number,
  leadId: string,
): Promise<number[]> {
  const rule = getServiceRule(serviceId);

  // Lock allocation cursor row for this service (serializes fair picks per service).
  const allocationRows = await tx.$queryRaw<
    { id: number; cursor: number }[]
  >`
    SELECT id, cursor FROM "AllocationState"
    WHERE "serviceId" = ${serviceId} AND "poolKey" = 'fair'
    FOR UPDATE
  `;

  let cursor = allocationRows[0]?.cursor ?? 0;
  const allocationId = allocationRows[0]?.id;

  const providerIdsToLock = [
    ...new Set([...rule.mandatory, ...rule.pool]),
  ];

  const providers = await tx.$queryRaw<
    {
      id: number;
      monthlyQuota: number;
      leadsReceived: number;
    }[]
  >`
    SELECT id, "monthlyQuota", "leadsReceived"
    FROM "Provider"
    WHERE id IN (${Prisma.join(providerIdsToLock)})
    ORDER BY id
    FOR UPDATE
  `;

  const providersById = new Map(providers.map((p) => [p.id, p]));
  const assigned = new Set<number>();

  for (const providerId of rule.mandatory) {
    const provider = providersById.get(providerId);
    if (provider && hasQuota(provider) && !assigned.has(providerId)) {
      assigned.add(providerId);
    }
  }

  const fairSlotsNeeded = TOTAL_SLOTS_PER_LEAD - assigned.size;
  const { picked, nextCursor } = pickFromPool(
    rule.pool,
    cursor,
    providersById,
    assigned,
    fairSlotsNeeded,
  );

  for (const id of picked) {
    assigned.add(id);
  }

  if (assigned.size !== TOTAL_SLOTS_PER_LEAD) {
    throw new Error(
      `Could not assign exactly ${TOTAL_SLOTS_PER_LEAD} providers. ` +
        `Only ${assigned.size} available (quota exhausted).`,
    );
  }

  const finalProviderIds = Array.from(assigned).sort((a, b) => a - b);

  for (const providerId of finalProviderIds) {
    await tx.leadAssignment.create({
      data: { leadId, providerId },
    });

    await tx.provider.update({
      where: { id: providerId },
      data: { leadsReceived: { increment: 1 } },
    });
  }

  if (allocationId != null) {
    await tx.allocationState.update({
      where: { id: allocationId },
      data: { cursor: nextCursor },
    });
  } else {
    await tx.allocationState.create({
      data: { serviceId, poolKey: "fair", cursor: nextCursor },
    });
  }

  return finalProviderIds;
}

function isRetryableTransactionError(error: unknown): boolean {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  ) {
    return true;
  }
  const message = error instanceof Error ? error.message : String(error);
  return (
    message.includes("40001") ||
    message.includes("could not serialize") ||
    message.includes("deadlock")
  );
}

async function createLeadWithAssignmentsOnce(
  input: CreateLeadInput,
): Promise<CreateLeadResult> {
  const result = await prisma.$transaction(
    async (tx) => {
      const lead = await tx.lead.create({
        data: {
          name: input.name,
          phone: input.phone,
          city: input.city,
          description: input.description,
          serviceId: input.serviceId,
        },
      });

      const providerIds = await assignProvidersInTransaction(
        tx,
        input.serviceId,
        lead.id,
      );

      return { leadId: lead.id, providerIds };
    },
    {
      // Row locks (SELECT FOR UPDATE) enforce quota + cursor safety; ReadCommitted
      // lets concurrent requests wait on locks instead of Serializable aborts.
      isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
      maxWait: 10000,
      timeout: 30000,
    },
  );

  emitDashboardUpdate({
    type: "lead_assigned",
    leadId: result.leadId,
    providerIds: result.providerIds,
  });

  return result;
}

const MAX_TRANSACTION_RETRIES = 5;

export async function createLeadWithAssignments(
  input: CreateLeadInput,
): Promise<CreateLeadResult> {
  let lastError: unknown;

  for (let attempt = 0; attempt < MAX_TRANSACTION_RETRIES; attempt += 1) {
    try {
      return await createLeadWithAssignmentsOnce(input);
    } catch (error) {
      lastError = error;
      if (
        attempt < MAX_TRANSACTION_RETRIES - 1 &&
        isRetryableTransactionError(error)
      ) {
        await new Promise((resolve) =>
          setTimeout(resolve, 25 * (attempt + 1)),
        );
        continue;
      }
      throw error;
    }
  }

  throw lastError;
}

export function isDuplicateLeadError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}
