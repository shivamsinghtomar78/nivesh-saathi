import { z } from "zod";

import {
  getRequestIp,
  handleRouteError,
  jsonError,
  jsonSuccess,
} from "@/lib/server/api";
import {
  requireCsrfProtection,
  requireFirebaseSession,
} from "@/lib/server/auth";
import { serverEnv } from "@/lib/server/env";
import { enforceRateLimit } from "@/lib/server/rate-limit";
import { withTracing } from "@/lib/server/langsmith";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "bom1";

const MAX_RECEIPT_BYTES = 6 * 1024 * 1024;
const OCR_MODEL = "gemini-2.5-flash-lite";
const ALLOWED_RECEIPT_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"];

const ocrResultSchema = z.object({
  bankName: z.string().optional().nullable(),
  amount: z.number().optional().nullable(),
  interestRate: z.number().optional().nullable(),
  startDate: z.string().optional().nullable(),
  maturityDate: z.string().optional().nullable(),
  fdType: z.string().optional().nullable(),
  payoutFrequency: z.string().optional().nullable(),
  nominee: z.string().optional().nullable(),
  confidence: z.number().min(0).max(1).optional().nullable(),
  notes: z.string().optional().nullable(),
});

function extractJson(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1] ?? trimmed;
  const first = candidate.indexOf("{");
  const last = candidate.lastIndexOf("}");

  if (first === -1 || last === -1 || last <= first) {
    throw new Error("OCR response did not include JSON");
  }

  return candidate.slice(first, last + 1);
}

export async function POST(request: Request) {
  try {
    const csrfError = requireCsrfProtection(request);
    if (csrfError) return csrfError;

    const auth = await requireFirebaseSession(request);
    if (!auth.ok) return auth.response;

    const apiKey = serverEnv.GEMINI_API_KEY;
    if (!apiKey) {
      return jsonError("OCR is not configured", 503);
    }

    const rateLimit = await enforceRateLimit({
      key: `fd-ocr:${auth.session.uid}:${getRequestIp(request)}`,
      limit: 5,
      window: "1 m",
    });

    if (!rateLimit.success) {
      return jsonError("Too many OCR attempts. Please try again shortly.", 429, {
        retryAfter: rateLimit.reset,
      });
    }

    const formData = await request.formData();
    const receipt = formData.get("receipt");

    if (!(receipt instanceof File)) {
      return jsonError("Receipt image is required", 400);
    }

    if (receipt.size === 0 || receipt.size > MAX_RECEIPT_BYTES) {
      return jsonError("Receipt image is empty or exceeds the 6MB limit", 400);
    }

    if (!ALLOWED_RECEIPT_MIME_TYPES.includes(receipt.type)) {
      return jsonError("Unsupported receipt file type. Upload a JPEG, PNG, or WebP image.", 400);
    }

    const bytes = Buffer.from(await receipt.arrayBuffer()).toString("base64");
    
    const processOcr = withTracing(async (fileInfo: { type: string; size: number; name: string }) => {
      const endpoint = new URL(
        `https://generativelanguage.googleapis.com/v1beta/models/${OCR_MODEL}:generateContent`
      );
      endpoint.searchParams.set("key", apiKey);

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [
                {
                  text: [
                    "Extract fixed deposit receipt fields for a web form.",
                    "Return strict JSON only with keys: bankName, amount, interestRate, startDate, maturityDate, fdType, payoutFrequency, nominee, notes, confidence.",
                    "Use YYYY-MM-DD for dates when visible. Use null for fields that are missing or uncertain.",
                    "Do not invent values.",
                  ].join(" "),
                },
                {
                  inlineData: {
                    mimeType: fileInfo.type,
                    data: bytes,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 700,
            responseMimeType: "application/json",
          },
        }),
      });

      if (!response.ok) {
        const detail = await response.text();
        throw new Error(`OCR extraction failed: ${detail.slice(0, 300)}`);
      }

      const payload = (await response.json()) as {
        candidates?: Array<{
          content?: {
            parts?: Array<{
              text?: string;
            }>;
          };
        }>;
      };
      const text = payload.candidates?.[0]?.content?.parts
        ?.map((part) => part.text ?? "")
        .join("")
        .trim();

      if (!text) {
        throw new Error("OCR returned no text");
      }

      return ocrResultSchema.parse(JSON.parse(extractJson(text)));
    }, {
      name: "extract_receipt_ocr",
      run_type: "llm",
      metadata: {
        userId: auth.session.uid,
        feature: "ocr",
      }
    });

    const parsed = await processOcr({ 
      type: receipt.type || "image/jpeg", 
      size: receipt.size,
      name: receipt.name
    });

    return jsonSuccess({
      fields: parsed,
      sourceType: "ocr",
      confidence: parsed.confidence ?? null,
      rawData: parsed,
    });
  } catch (error) {
    return handleRouteError(error, "Unable to extract FD receipt details", {
      zodMessage: "Invalid OCR response",
    });
  }
}
