import { NextRequest, NextResponse } from "next/server";
import { QBOSyncEngine } from "@/lib/accounting/qbo-sync";
import prisma from "@/lib/prisma";

// Make sure this API route doesn't require standard user session auth since it's a cron
export async function GET(req: NextRequest) {
  try {
    // 1. Verify cron secret to ensure only authorized callers (like Vercel Cron or Cloudflare triggers) can hit this
    // const authHeader = req.headers.get('authorization');
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return new NextResponse('Unauthorized', { status: 401 });
    // }

    // 2. We could iterate through all active companies if multi-tenant, 
    // but for now we'll just pick the first company as a scaffold.
    const company = await prisma.company.findFirst();
    if (!company) {
      return NextResponse.json({ error: "No company found" }, { status: 404 });
    }

    // 3. Run the sync
    const engine = new QBOSyncEngine(company.id);
    await engine.syncAllPending();

    return NextResponse.json({ success: true, message: "QBO Sync completed successfully." });
  } catch (error) {
    console.error("[Cron QBO Sync Error]:", error);
    return NextResponse.json({ success: false, error: "Failed to run QBO sync" }, { status: 500 });
  }
}
