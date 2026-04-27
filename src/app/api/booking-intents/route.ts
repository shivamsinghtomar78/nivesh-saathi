import { ZodError } from "zod";

import { bookingIntentInputSchema } from "@/lib/server/advisor-schemas";
import { getBankById } from "@/lib/server/fd-service";
import { createBookingIntent } from "@/lib/server/persistence";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = bookingIntentInputSchema.parse(body);
    const bank = getBankById(input.bankId);

    if (!bank) {
      return Response.json(
        { error: "Unknown bank id" },
        { status: 404 }
      );
    }

    const bookingIntent = await createBookingIntent(input);

    return Response.json(bookingIntent, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        {
          error: "Invalid booking intent payload",
          details: error.flatten(),
        },
        { status: 400 }
      );
    }

    return Response.json(
      { error: "Unable to create booking intent" },
      { status: 500 }
    );
  }
}
