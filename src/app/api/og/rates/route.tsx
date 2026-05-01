import { ImageResponse } from "next/og";

import { SESSION_COOKIE_NAME } from "@/lib/auth-constants";
import { FD_RATES } from "@/lib/fd-data";

export const runtime = "edge";

function hasSessionCookie(request: Request) {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return false;
  }

  return cookieHeader
    .split(";")
    .map((cookie) => cookie.trim())
    .some((cookie) => cookie.startsWith(`${SESSION_COOKIE_NAME}=`));
}

export async function GET(request: Request) {
  if (!hasSessionCookie(request)) {
    return Response.json(
      { ok: false, error: "Sign in required" },
      { status: 401 }
    );
  }

  const topRates = [...FD_RATES]
    .sort((a, b) => b.regularRate - a.regularRate)
    .slice(0, 3);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
          padding: "48px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "8px",
          }}
        >
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #10b981, #0f9f73)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontSize: "20px",
              fontWeight: "bold",
            }}
          >
            N
          </div>
          <span
            style={{ color: "#94a3b8", fontSize: "16px", fontWeight: "600" }}
          >
            Nivesh Saathi
          </span>
        </div>

        <h1
          style={{
            fontSize: "32px",
            fontWeight: "800",
            color: "white",
            marginBottom: "32px",
            lineHeight: "1.2",
          }}
        >
          Today&apos;s FD Rates
        </h1>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            flex: 1,
          }}
        >
          {topRates.map((rate, index) => (
            <div
              key={rate.id}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "20px 24px",
                borderRadius: "16px",
                background:
                  index === 0
                    ? "linear-gradient(135deg, #064e3b, #065f46)"
                    : "rgba(255,255,255,0.06)",
                border:
                  index === 0
                    ? "2px solid #10b981"
                    : "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column" }}>
                <span
                  style={{
                    fontSize: "18px",
                    fontWeight: "700",
                    color: "white",
                  }}
                >
                  #{index + 1} {rate.bankName}
                </span>
                <span
                  style={{
                    fontSize: "13px",
                    color: "#94a3b8",
                    marginTop: "2px",
                  }}
                >
                  {rate.tenorLabel} - {rate.bankType}
                </span>
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "flex-end",
                }}
              >
                <span
                  style={{
                    fontSize: "28px",
                    fontWeight: "800",
                    color: index === 0 ? "#34d399" : "#e2e8f0",
                  }}
                >
                  {rate.regularRate}%
                </span>
                <span style={{ fontSize: "11px", color: "#64748b" }}>
                  p.a.
                </span>
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginTop: "24px",
            paddingTop: "16px",
            borderTop: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <span style={{ color: "#64748b", fontSize: "12px" }}>
            As of {FD_RATES[0]?.asOf || "today"} - Verify on bank websites
          </span>
          <span
            style={{ color: "#10b981", fontSize: "13px", fontWeight: "600" }}
          >
            niveshsaathi.in
          </span>
        </div>
      </div>
    ),
    { width: 600, height: 440 }
  );
}
