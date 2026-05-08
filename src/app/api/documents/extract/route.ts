import { z } from "zod";
import { handleRouteError, jsonError, jsonSuccess } from "@/lib/server/api";
import { requireCsrfProtection, requireFirebaseSession } from "@/lib/server/auth";
import { serverEnv } from "@/lib/server/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
];

const extractionPrompt = `You are an expert Indian banking document analyzer for Nivesh Saathi.

Analyze the uploaded document (bank statement, FD receipt, FD certificate, or investment summary) and extract all fixed deposit information.

For each FD found, extract:
- bankName: The bank or NBFC name
- principal: The deposit amount in INR (number only)
- interestRate: Annual interest rate as a percentage (number only, e.g. 7.25)
- tenorMonths: Tenure/tenor in months (number only)
- maturityDate: Maturity date in YYYY-MM-DD format if visible
- depositDate: Deposit/booking date in YYYY-MM-DD format if visible
- accountNumber: FD account/receipt number if visible
- depositorName: Name of the account holder if visible
- compounding: "quarterly", "monthly", or "annual" if mentioned
- depositType: "cumulative" or "non-cumulative" if mentioned
- seniorCitizen: true if senior citizen rate is applied

Also provide:
- documentType: "fd_receipt" | "bank_statement" | "fd_certificate" | "investment_summary" | "unknown"
- confidence: A confidence score from 0 to 1 for the overall extraction
- suggestions: An array of 1-3 actionable suggestions (e.g., "Consider switching to XYZ bank for 0.5% higher rate", "Your FD matures in 2 months — plan reinvestment")

IMPORTANT:
- Return ONLY valid JSON, no markdown fencing.
- If a field is not visible in the document, omit it (do not guess).
- All monetary values should be plain numbers without commas or currency symbols.
- If no FD data is found, return deposits as an empty array with a note in suggestions.`;

type GeminiPart =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } };

type GeminiCandidate = {
  content?: {
    parts?: Array<{ text?: string }>;
  };
};

type GeminiResponse = {
  candidates?: GeminiCandidate[];
  error?: { message?: string };
};

const depositSchema = z.object({
  bankName: z.string().optional(),
  principal: z.number().optional(),
  interestRate: z.number().optional(),
  tenorMonths: z.number().optional(),
  maturityDate: z.string().optional(),
  depositDate: z.string().optional(),
  accountNumber: z.string().optional(),
  depositorName: z.string().optional(),
  compounding: z.enum(["quarterly", "monthly", "annual"]).optional(),
  depositType: z.enum(["cumulative", "non-cumulative"]).optional(),
  seniorCitizen: z.boolean().optional(),
});

const extractionResultSchema = z.object({
  documentType: z.string().default("unknown"),
  confidence: z.number().min(0).max(1).default(0.5),
  deposits: z.array(depositSchema).default([]),
  suggestions: z.array(z.string()).default([]),
});

export type ExtractedDeposit = z.infer<typeof depositSchema>;
export type ExtractionResult = z.infer<typeof extractionResultSchema>;

export async function POST(request: Request) {
  try {
    const csrfError = requireCsrfProtection(request);
    if (csrfError) return csrfError;

    const auth = await requireFirebaseSession(request);
    if (!auth.ok) return auth.response;

    const apiKey = serverEnv.GEMINI_API_KEY;
    if (!apiKey) {
      return jsonError("Gemini is not configured", 503);
    }

    const formData = await request.formData();
    const file = formData.get("document") as File | null;

    if (!file) {
      return jsonError("No document file provided", 400);
    }

    if (file.size > MAX_FILE_SIZE) {
      return jsonError("File too large. Maximum size is 5 MB.", 400);
    }

    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return jsonError(
        "Unsupported file type. Please upload a JPEG, PNG, WebP image or PDF.",
        400
      );
    }

    // Convert file to base64
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64Data = buffer.toString("base64");

    // Build Gemini Vision request
    const parts: GeminiPart[] = [
      { text: extractionPrompt },
      {
        inlineData: {
          mimeType: file.type,
          data: base64Data,
        },
      },
    ];

    const geminiModel = serverEnv.GEMINI_MODEL.includes("flash")
      ? "gemini-2.5-flash-lite"
      : serverEnv.GEMINI_MODEL;

    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 2048,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!geminiResponse.ok) {
      await geminiResponse.text().catch(() => "");
      console.error("[documents/extract] Gemini Vision failed", {
        status: geminiResponse.status,
        statusText: geminiResponse.statusText,
      });
      return jsonError("Unable to analyze document", 503);
    }

    const geminiPayload = (await geminiResponse.json()) as GeminiResponse;

    if (geminiPayload.error) {
      console.error("[documents/extract] Gemini returned an error");
      return jsonError("Document analysis failed", 503);
    }

    const rawText =
      geminiPayload.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    if (!rawText.trim()) {
      return jsonError("No data could be extracted from this document", 422);
    }

    // Parse and validate the JSON response
    let parsedResult: unknown;
    try {
      // Strip any markdown code fencing if present
      const cleanedText = rawText
        .replace(/```json\s*/gi, "")
        .replace(/```\s*/g, "")
        .trim();
      parsedResult = JSON.parse(cleanedText);
    } catch {
      console.error("[documents/extract] Failed to parse Gemini JSON", {
        responseLength: rawText.length,
      });
      return jsonError("Could not parse extracted data", 422);
    }

    const result = extractionResultSchema.parse(parsedResult);

    return jsonSuccess({
      extraction: result,
      fileName: file.name,
      fileSize: file.size,
    });
  } catch (error) {
    return handleRouteError(error, "Unable to process document", {
      zodMessage: "Invalid document extraction request",
    });
  }
}
