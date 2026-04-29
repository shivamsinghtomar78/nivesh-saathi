import { NextResponse } from "next/server";

export const runtime = "edge";

export async function GET() {
  return NextResponse.json({
    ok: true,
    uptime: process.uptime ? process.uptime() : 0,
    timestamp: new Date().toISOString()
  });
}
