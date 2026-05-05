import { hasLangSmithConfig, serverEnv } from "./env";
import { traceable } from "langsmith/traceable";

// Set default project if not provided
if (!process.env.LANGSMITH_PROJECT && !process.env.LANGCHAIN_PROJECT) {
  process.env.LANGSMITH_PROJECT = "Nivesh-Saathi";
}

// Redaction for production
export function redactSensitiveData(text: string): string {
  if (process.env.NODE_ENV !== "production") return text;
  if (!text) return text;
  
  let redacted = text;
  // Redact emails
  redacted = redacted.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL]");
  // Redact phones (India common formats)
  redacted = redacted.replace(/(?:\+91|91)?[-\s]?[6-9]\d{9}/g, "[PHONE]");
  // Redact Aadhaar (12 digits)
  redacted = redacted.replace(/\b\d{4}\s?\d{4}\s?\d{4}\b/g, "[AADHAAR]");
  // Redact PAN (ABCDE1234F)
  redacted = redacted.replace(/\b[A-Z]{5}[0-9]{4}[A-Z]{1}\b/g, "[PAN]");
  // Redact Currency values like ₹1,00,000 or Rs. 500
  redacted = redacted.replace(/(?:₹|Rs\.?)\s?[\d,]+(?:\.\d{1,2})?/g, "[CURRENCY]");
  
  return redacted;
}

export function redactObject(obj: unknown): unknown {
  if (process.env.NODE_ENV !== "production") return obj;
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === "string") return redactSensitiveData(obj);
  if (Array.isArray(obj)) {
    return obj.map(item => redactObject(item));
  }
  if (typeof obj === "object") {
    const redactedObj: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      redactedObj[key] = redactObject(value);
    }
    return redactedObj;
  }
  return obj;
}

export interface TracingMetadata {
  userId?: string;
  sessionId?: string;
  threadId?: string;
  requestId?: string;
  feature?: string;
  mode?: string;
  [key: string]: unknown;
}

type TraceableFunction = (...args: never[]) => unknown;

function toTraceMap(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return { value };
}

export function withTracing<Func extends TraceableFunction>(
  fn: Func,
  options: {
    name: string;
    run_type?: "llm" | "chain" | "tool" | "retriever" | "embedding" | "prompt" | "parser";
    metadata?: TracingMetadata;
  }
) {
  if (!hasLangSmithConfig || serverEnv.LANGSMITH_TRACING === "false") {
    return fn;
  }
  
  return traceable(fn, {
    name: options.name,
    run_type: options.run_type || "chain",
    metadata: {
      ...options.metadata,
      timestamp: new Date().toISOString(),
    },
    processInputs: (inputs) => {
      const value = process.env.NODE_ENV === "production" ? redactObject(inputs) : inputs;
      return toTraceMap(value);
    },
    processOutputs: (outputs) => {
      const value = process.env.NODE_ENV === "production" ? redactObject(outputs) : outputs;
      return toTraceMap(value);
    }
  }) as Func;
}
