import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { evaluatePeriodicRules } from "@/lib/automation/engine";
import { generateDailyDigests } from "@/lib/automation/digest";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { runDigest } = await req.json().catch(() => ({}));

    const result = await evaluatePeriodicRules();

    let digestResult = null;
    if (runDigest) {
      digestResult = await generateDailyDigests();
    }

    return NextResponse.json({
      success: true,
      result,
      digestResult,
    });
  } catch (error: any) {
    console.error("POST /api/automation/evaluate error:", error);
    return NextResponse.json({ error: "Evaluation failed", details: error.message }, { status: 500 });
  }
}
