import { EventEmitter } from "events";

export type DashboardEvent = {
  type: "lead_assigned";
  providerIds: number[];
  leadId: string;
};

const emitter = new EventEmitter();
emitter.setMaxListeners(100);

export function emitDashboardUpdate(event: DashboardEvent) {
  emitter.emit("dashboard", event);
}

export function subscribeDashboard(
  listener: (event: DashboardEvent) => void,
): () => void {
  emitter.on("dashboard", listener);
  return () => emitter.off("dashboard", listener);
}
