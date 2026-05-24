import { NextResponse } from "next/server";
import {
  createLeadWithAssignments,
  isDuplicateLeadError,
} from "@/lib/allocation";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, phone, city, serviceId, description } = body;

    if (!name || !phone || !city || !serviceId || !description) {
      return NextResponse.json(
        { error: "All fields are required." },
        { status: 400 },
      );
    }

    const parsedServiceId = Number(serviceId);
    if (![1, 2, 3].includes(parsedServiceId)) {
      return NextResponse.json(
        { error: "Invalid service type." },
        { status: 400 },
      );
    }

    const result = await createLeadWithAssignments({
      name: String(name).trim(),
      phone: String(phone).trim(),
      city: String(city).trim(),
      serviceId: parsedServiceId,
      description: String(description).trim(),
    });

    return NextResponse.json(
      {
        message: "Lead created and assigned successfully.",
        leadId: result.leadId,
        providerIds: result.providerIds,
      },
      { status: 201 },
    );
  } catch (error) {
    if (isDuplicateLeadError(error)) {
      return NextResponse.json(
        {
          error:
            "A lead with this phone number already exists for the selected service.",
        },
        { status: 409 },
      );
    }

    if (error instanceof Error && error.message.includes("Could not assign")) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }

    console.error("Lead creation failed:", error);
    return NextResponse.json(
      { error: "Failed to create lead." },
      { status: 500 },
    );
  }
}
