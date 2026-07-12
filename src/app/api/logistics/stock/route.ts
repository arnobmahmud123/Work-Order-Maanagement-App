import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// GET /api/logistics/stock — Fetch stock transactions with filters
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const materialId = searchParams.get("materialId");
  const type = searchParams.get("type"); // STOCK_IN, STOCK_OUT, ADJUSTMENT, RETURN
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "50");

  const where: any = {};
  if (materialId) where.materialId = materialId;
  if (type) where.type = type;

  const [transactions, total] = await Promise.all([
    prisma.materialTransaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        material: { select: { id: true, name: true, category: true, unit: true } },
        user: { select: { id: true, name: true } },
      },
    }),
    prisma.materialTransaction.count({ where }),
  ]);

  return NextResponse.json({
    transactions,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}

// POST /api/logistics/stock — Record stock movement (use, receive, adjust, return)
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (!["ADMIN", "COORDINATOR", "PROCESSOR"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { action, materialId, quantity, reason, workOrderId } = body;
  // action: "use" | "receive" | "adjust" | "return"

  if (!materialId || !action) {
    return NextResponse.json({ error: "materialId and action required" }, { status: 400 });
  }

  const material = await prisma.material.findUnique({ where: { id: materialId } });
  if (!material) {
    return NextResponse.json({ error: "Material not found" }, { status: 404 });
  }

  const qty = parseFloat(quantity);
  if (isNaN(qty) || qty <= 0) {
    return NextResponse.json({ error: "Quantity must be a positive number" }, { status: 400 });
  }

  const beforeQty = material.quantity;
  let afterQty: number;
  let transactionType: "STOCK_IN" | "STOCK_OUT" | "ADJUSTMENT" | "RETURN";
  let txQuantity: number; // signed quantity for the transaction record

  switch (action) {
    case "use":
      // Deduct stock (used on work order)
      if (beforeQty < qty) {
        return NextResponse.json(
          { error: `Insufficient stock. Available: ${beforeQty} ${material.unit}, requested: ${qty}` },
          { status: 400 }
        );
      }
      afterQty = beforeQty - qty;
      transactionType = "STOCK_OUT";
      txQuantity = -qty;
      break;

    case "receive":
      // Add stock (received from supplier / PO)
      afterQty = beforeQty + qty;
      transactionType = "STOCK_IN";
      txQuantity = qty;
      break;

    case "adjust":
      // Manual correction — quantity is the new absolute value
      afterQty = qty;
      transactionType = "ADJUSTMENT";
      txQuantity = qty - beforeQty;
      break;

    case "return":
      // Return unused materials back to stock
      afterQty = beforeQty + qty;
      transactionType = "RETURN";
      txQuantity = qty;
      break;

    default:
      return NextResponse.json({ error: "Invalid action. Use: use, receive, adjust, return" }, { status: 400 });
  }

  // Update material quantity and create transaction in a single transaction
  const result = await prisma.$transaction(async (tx) => {
    const updated = await tx.material.update({
      where: { id: materialId },
      data: { quantity: afterQty },
    });

    const transaction = await tx.materialTransaction.create({
      data: {
        materialId,
        type: transactionType,
        quantity: txQuantity,
        beforeQty,
        afterQty,
        reason: reason || null,
        workOrderId: workOrderId || null,
        userId: (session.user as any).id,
      },
      include: {
        material: { select: { id: true, name: true, category: true, unit: true } },
        user: { select: { id: true, name: true } },
      },
    });

    return { updated, transaction };
  });

  // Log activity
  try {
    const actionLabels: Record<string, string> = {
      use: "Used",
      receive: "Received",
      adjust: "Adjusted",
      return: "Returned",
    };
    await prisma.activityLog.create({
      data: {
        action: `STOCK_${action.toUpperCase()}`,
        details: `${actionLabels[action]} ${qty} ${material.unit} of ${material.name}${reason ? ` — ${reason}` : ""}`,
        userId: (session.user as any).id,
      },
    });
  } catch {}

  return NextResponse.json(result, { status: 201 });
}
