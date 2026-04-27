type LogLevel = "info" | "warn" | "error";

function writeLog(level: LogLevel, event: string, meta?: Record<string, unknown>) {
  const payload = JSON.stringify({
    level,
    event,
    meta,
    at: new Date().toISOString(),
  });

  if (level === "error") {
    console.error(payload);
    return;
  }

  if (level === "warn") {
    console.warn(payload);
    return;
  }

  console.info(payload);
}

export function logServerInfo(event: string, meta?: Record<string, unknown>) {
  writeLog("info", event, meta);
}

export function logServerWarn(event: string, meta?: Record<string, unknown>) {
  writeLog("warn", event, meta);
}

export function logServerError(event: string, meta?: Record<string, unknown>) {
  writeLog("error", event, meta);
}
