import { NextResponse } from "next/server";
import { processQuotaResetWebhook } from "@/lib/webhook";

export async function POST(request: Request) {
  const idempotencyKey =
    request.headers.get("idempotency-key") ??
    request.headers.get("x-idempotency-key");

  if (!idempotencyKey?.trim()) {
    return NextResponse.json(
      { error: "Missing Idempotency-Key header." },
      { status: 400 },
    );
  }

  try {
    const result = await processQuotaResetWebhook(idempotencyKey.trim());

    return NextResponse.json({
      message: result.alreadyProcessed
        ? "Webhook already processed (idempotent)."
        : "Provider quotas reset to 10.",
      alreadyProcessed: result.alreadyProcessed,
      providersReset: result.providersReset,
    });
  } catch (error) {
    console.error("Webhook failed:", error);
    return NextResponse.json(
      { error: "Webhook processing failed." },
      { status: 500 },
    );
  }
}
