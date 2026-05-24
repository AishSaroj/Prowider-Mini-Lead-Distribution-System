import { prisma } from "@/lib/prisma";

const QUOTA_RESET_EVENT = "quota.reset";

export type QuotaResetResult = {
  alreadyProcessed: boolean;
  providersReset: number;
};

export async function processQuotaResetWebhook(
  idempotencyKey: string,
): Promise<QuotaResetResult> {
  return prisma.$transaction(async (tx) => {
    const existing = await tx.webhookEvent.findUnique({
      where: { idempotencyKey },
    });

    if (existing) {
      return { alreadyProcessed: true, providersReset: 0 };
    }

    const reset = await tx.provider.updateMany({
      data: {
        monthlyQuota: 10,
        leadsReceived: 0,
      },
    });

    await tx.webhookEvent.create({
      data: {
        idempotencyKey,
        eventType: QUOTA_RESET_EVENT,
        payload: { resetCount: reset.count },
      },
    });

    return {
      alreadyProcessed: false,
      providersReset: reset.count,
    };
  });
}
