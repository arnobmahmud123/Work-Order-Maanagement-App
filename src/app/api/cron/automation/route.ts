import { NextRequest, NextResponse } from "next/server";
import { evaluatePeriodicRules } from "@/lib/automation/engine";
import { generateDailyDigests } from "@/lib/automation/digest";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const triggerDigest = searchParams.get("digest") === "true";

    const periodicResult = await evaluatePeriodicRules();

    let digestResult = null;
    if (triggerDigest) {
      digestResult = await generateDailyDigests();
    }

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      periodicResult,
      digestResult,
    });
  } catch (error: any) {
    console.error("[Cron Automation Error]:", error);
    return NextResponse.json({ success: false, error: "Cron automation failed", details: error.message }, { status: 500 });
  }
}
