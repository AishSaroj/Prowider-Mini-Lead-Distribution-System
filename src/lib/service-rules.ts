export const TOTAL_SLOTS_PER_LEAD = 3;

export type ServiceRule = {
  mandatory: number[];
  pool: number[];
};

/** Business rules per service (provider IDs are 1–8). */
export const SERVICE_RULES: Record<number, ServiceRule> = {
  1: { mandatory: [1], pool: [2, 3, 4] },
  2: { mandatory: [5], pool: [6, 7, 8] },
  3: { mandatory: [1, 4], pool: [2, 3, 5, 6, 7, 8] },
};

export function getServiceRule(serviceId: number): ServiceRule {
  const rule = SERVICE_RULES[serviceId];
  if (!rule) {
    throw new Error(`Unknown service id: ${serviceId}`);
  }
  return rule;
}
