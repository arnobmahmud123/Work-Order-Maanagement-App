import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";

export async function GET(request: NextRequest) {
  try {
    const { env } = getCloudflareContext();
    const db = env?.DB;
    if (!db) return NextResponse.json({ error: "DB unavailable" });

    const res = await db.prepare("UPDATE WorkOrder SET dueDate = dueDate || 'T00:00:00.000Z' WHERE length(dueDate) = 10;").run();
    const res3 = await db.prepare("UPDATE WorkOrder SET dueDate = '2026-08-30T00:00:00.000Z' WHERE dueDate NOT LIKE '%T%';").run();

    return NextResponse.json({ success: true, res, res3 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message });
  }
}
