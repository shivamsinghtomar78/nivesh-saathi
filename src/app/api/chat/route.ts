import { ZodError } from "zod";

import { chatRequestSchema } from "@/lib/server/advisor-schemas";
import { invokeFdAdvisor } from "@/lib/server/fd-advisor-agent";
import { persistChatSessionTurn } from "@/lib/server/persistence";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = chatRequestSchema.parse(body);
    const result = await invokeFdAdvisor(input);

    await persistChatSessionTurn({
      threadId: result.threadId,
      userId: input.userId,
      language: input.language,
      userMessage: input.message,
      assistantMessage: result.response.text,
      fdContextIds: result.response.rateCards.map((card) => card.bankId),
    });

    return Response.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return Response.json(
        {
          error: "Invalid chat request",
          details: error.flatten(),
        },
        { status: 400 }
      );
    }

    return Response.json(
      {
        error: "Unable to process chat request",
      },
      { status: 500 }
    );
  }
}
