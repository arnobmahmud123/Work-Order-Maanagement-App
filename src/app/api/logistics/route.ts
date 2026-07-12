import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import prisma from "@/lib/prisma";

// ─── GET: Fetch logistics data by view ──────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const view = searchParams.get("view") || "overview";

  if (view === "materials") {
    const category = searchParams.get("category") || "";
    const lowStock = searchParams.get("lowStock") === "true";
    const search = searchParams.get("search") || "";

    const where: any = {};
    if (category) where.category = category;
    if (search) where.name = { contains: search };

    let materials = await prisma.material.findMany({
      where,
      include: { supplier: { select: { id: true, name: true } } },
      orderBy: { name: "asc" },
    });

    // Filter low stock in memory (Prisma can't compare fields directly)
    if (lowStock) {
      materials = materials.filter((m) => m.quantity <= m.minStock);
    }

    return NextResponse.json({
      materials: materials.map((m) => ({
        ...m,
        supplier: m.supplier?.name || "—",
        supplierId: m.supplierId,
      })),
    });
  }

  if (view === "suppliers") {
    const suppliers = await prisma.supplier.findMany({
      include: { _count: { select: { materials: true, purchaseOrders: true } } },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      suppliers: suppliers.map((s) => ({
        ...s,
        categories: (s.categories as unknown as string[]) || [],
        materialCount: s._count.materials,
        orderCount: s._count.purchaseOrders,
      })),
    });
  }

  if (view === "orders") {
    const status = searchParams.get("status") || "";

    const where: any = {};
    if (status) where.status = status;

    const orders = await prisma.purchaseOrder.findMany({
      where,
      include: {
        supplier: { select: { id: true, name: true } },
        items: true,
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      orders: orders.map((o) => ({
        ...o,
        orderedAt: o.orderedAt ? o.orderedAt.toISOString().slice(0, 10) : null,
        expectedDelivery: o.expectedDelivery ? o.expectedDelivery.toISOString().slice(0, 10) : null,
        deliveredAt: o.deliveredAt ? o.deliveredAt.toISOString().slice(0, 10) : null,
      })),
    });
  }

  // Overview
  const [totalMaterials, allMaterialsForStock, suppliers, pendingOrders, allMaterials, recentOrders] =
    await Promise.all([
      prisma.material.count(),
      prisma.material.findMany({
        include: { supplier: { select: { name: true } } },
        orderBy: { quantity: "asc" },
      }),
      prisma.supplier.count(),
      prisma.purchaseOrder.findMany({
        where: { status: { in: ["PENDING", "ORDERED", "IN_TRANSIT"] } },
      }),
      prisma.material.findMany({
        select: { category: true, quantity: true, unitCost: true },
      }),
      prisma.purchaseOrder.findMany({
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          supplier: { select: { name: true } },
          items: true,
        },
      }),
    ]);

  // Filter low stock items in memory
  const lowStockItems = allMaterialsForStock.filter((m) => m.quantity <= m.minStock);

  const totalInventoryValue = allMaterials.reduce(
    (sum, m) => sum + m.quantity * m.unitCost,
    0
  );
  const pendingOrderValue = pendingOrders.reduce((sum, o) => sum + o.total, 0);

  const categoryBreakdown: Record<string, { count: number; value: number }> = {};
  for (const m of allMaterials) {
    if (!categoryBreakdown[m.category]) categoryBreakdown[m.category] = { count: 0, value: 0 };
    categoryBreakdown[m.category].count++;
    categoryBreakdown[m.category].value += m.quantity * m.unitCost;
  }

  return NextResponse.json({
    overview: {
      totalMaterials,
      lowStockCount: lowStockItems.length,
      totalInventoryValue: parseFloat(totalInventoryValue.toFixed(2)),
      supplierCount: suppliers,
      pendingOrders: pendingOrders.length,
      pendingOrderValue: parseFloat(pendingOrderValue.toFixed(2)),
    },
    lowStockItems: lowStockItems.map((m) => ({
      ...m,
      supplier: m.supplier ? { name: m.supplier.name } : null,
    })),
    categoryBreakdown,
    recentOrders: recentOrders.map((o) => ({
      ...o,
      orderedAt: o.orderedAt ? o.orderedAt.toISOString().slice(0, 10) : null,
      expectedDelivery: o.expectedDelivery ? o.expectedDelivery.toISOString().slice(0, 10) : null,
    })),
  });
}

// ─── POST: Create/update logistics entities ─────────────────────────────────

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
  const { action } = body;

  // ── Create Purchase Order ──
  if (action === "create-order") {
    const { supplierId, items, notes } = body;
    if (!supplierId || !items?.length) {
      return NextResponse.json({ error: "Supplier and items required" }, { status: 400 });
    }

    const supplier = await prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) return NextResponse.json({ error: "Supplier not found" }, { status: 404 });

    const orderItems = [];
    let subtotal = 0;
    for (const item of items) {
      const material = await prisma.material.findUnique({ where: { id: item.materialId } });
      const unitCost = material?.unitCost || 0;
      const total = unitCost * item.quantity;
      orderItems.push({
        materialId: item.materialId,
        materialName: material?.name || "Unknown",
        quantity: item.quantity,
        unitCost,
        total,
      });
      subtotal += total;
    }

    const tax = subtotal * 0.08;
    const total = subtotal + tax;

    const count = await prisma.purchaseOrder.count();
    const orderNumber = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(3, "0")}`;

    const order = await prisma.purchaseOrder.create({
      data: {
        orderNumber,
        supplierId,
        status: "PENDING",
        subtotal: parseFloat(subtotal.toFixed(2)),
        tax: parseFloat(tax.toFixed(2)),
        total: parseFloat(total.toFixed(2)),
        notes: notes || "",
        orderedAt: new Date(),
        expectedDelivery: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        createdById: (session.user as any).id,
        items: { create: orderItems },
      },
      include: { supplier: true, items: true },
    });

    // Log activity
    try {
      await prisma.activityLog.create({
        data: {
          action: "PURCHASE_ORDER_CREATED",
          details: `Created PO ${orderNumber} for ${supplier.name} ($${total.toFixed(2)})`,
          userId: (session.user as any).id,
        },
      });
    } catch {}

    return NextResponse.json(order, { status: 201 });
  }

  // ── Create Material ──
  if (action === "create-material") {
    const { name, category, unit, unitCost, quantity, minStock, supplierId, location } = body;
    if (!name || !category || !unit || unitCost === undefined) {
      return NextResponse.json({ error: "Name, category, unit, and unitCost required" }, { status: 400 });
    }

    const material = await prisma.material.create({
      data: {
        name,
        category,
        unit,
        unitCost: parseFloat(unitCost),
        quantity: parseFloat(quantity || 0),
        minStock: parseFloat(minStock || 0),
        supplierId: supplierId || null,
        location: location || null,
      },
    });

    return NextResponse.json(material, { status: 201 });
  }

  // ── Update Material ──
  if (action === "update-material") {
    const { materialId, ...updates } = body;
    if (!materialId) return NextResponse.json({ error: "materialId required" }, { status: 400 });

    const data: any = {};
    if (updates.name !== undefined) data.name = updates.name;
    if (updates.category !== undefined) data.category = updates.category;
    if (updates.unit !== undefined) data.unit = updates.unit;
    if (updates.unitCost !== undefined) data.unitCost = parseFloat(updates.unitCost);
    if (updates.quantity !== undefined) data.quantity = parseFloat(updates.quantity);
    if (updates.minStock !== undefined) data.minStock = parseFloat(updates.minStock);
    if (updates.supplierId !== undefined) data.supplierId = updates.supplierId || null;
    if (updates.location !== undefined) data.location = updates.location;

    const material = await prisma.material.update({
      where: { id: materialId },
      data,
    });

    return NextResponse.json(material);
  }

  // ── Update Stock ──
  if (action === "update-stock") {
    const { materialId, quantity } = body;
    if (!materialId || quantity === undefined) {
      return NextResponse.json({ error: "materialId and quantity required" }, { status: 400 });
    }

    const material = await prisma.material.update({
      where: { id: materialId },
      data: { quantity: parseFloat(quantity) },
    });

    return NextResponse.json(material);
  }

  // ── Create Supplier ──
  if (action === "create-supplier") {
    const { name, contact, email, phone, address, categories, rating, leadTime, notes } = body;
    if (!name) return NextResponse.json({ error: "Name required" }, { status: 400 });

    const supplier = await prisma.supplier.create({
      data: {
        name,
        contact: contact || null,
        email: email || null,
        phone: phone || null,
        address: address || null,
        categories: categories || [],
        rating: parseFloat(rating || 0),
        leadTime: leadTime || null,
        notes: notes || null,
      },
    });

    return NextResponse.json(supplier, { status: 201 });
  }

  // ── Update Supplier ──
  if (action === "update-supplier") {
    const { supplierId, ...updates } = body;
    if (!supplierId) return NextResponse.json({ error: "supplierId required" }, { status: 400 });

    const data: any = {};
    if (updates.name !== undefined) data.name = updates.name;
    if (updates.contact !== undefined) data.contact = updates.contact;
    if (updates.email !== undefined) data.email = updates.email;
    if (updates.phone !== undefined) data.phone = updates.phone;
    if (updates.address !== undefined) data.address = updates.address;
    if (updates.categories !== undefined) data.categories = updates.categories;
    if (updates.rating !== undefined) data.rating = parseFloat(updates.rating);
    if (updates.leadTime !== undefined) data.leadTime = updates.leadTime;
    if (updates.notes !== undefined) data.notes = updates.notes;

    const supplier = await prisma.supplier.update({
      where: { id: supplierId },
      data,
    });

    return NextResponse.json(supplier);
  }

  // ── Update Purchase Order Status ──
  if (action === "update-order-status") {
    const { orderId, status: newStatus } = body;
    if (!orderId || !newStatus) {
      return NextResponse.json({ error: "orderId and status required" }, { status: 400 });
    }

    const data: any = { status: newStatus };
    if (newStatus === "DELIVERED") data.deliveredAt = new Date();

    const order = await prisma.purchaseOrder.update({
      where: { id: orderId },
      data,
      include: { items: true, supplier: true },
    });

    // If delivered, update material stock and log transactions
    if (newStatus === "DELIVERED") {
      for (const item of order.items) {
        if (item.materialId) {
          const material = await prisma.material.findUnique({ where: { id: item.materialId } });
          const beforeQty = material?.quantity || 0;
          const afterQty = beforeQty + item.quantity;

          await prisma.$transaction(async (tx) => {
            await tx.material.update({
              where: { id: item.materialId! },
              data: { quantity: afterQty },
            });
            await tx.materialTransaction.create({
              data: {
                materialId: item.materialId!,
                type: "STOCK_IN",
                quantity: item.quantity,
                beforeQty,
                afterQty,
                reason: `PO ${order.orderNumber} delivered`,
                userId: (session.user as any).id,
              },
            });
          });
        }
      }
    }

    return NextResponse.json(order);
  }

  // ── Delete Material ──
  if (action === "delete-material") {
    const { materialId } = body;
    if (!materialId) return NextResponse.json({ error: "materialId required" }, { status: 400 });

    await prisma.material.delete({ where: { id: materialId } });
    return NextResponse.json({ deleted: true });
  }

  // ── Delete Supplier ──
  if (action === "delete-supplier") {
    const { supplierId } = body;
    if (!supplierId) return NextResponse.json({ error: "supplierId required" }, { status: 400 });

    // Check if supplier has materials or orders
    const [matCount, orderCount] = await Promise.all([
      prisma.material.count({ where: { supplierId } }),
      prisma.purchaseOrder.count({ where: { supplierId } }),
    ]);
    if (matCount > 0 || orderCount > 0) {
      return NextResponse.json(
        { error: `Cannot delete: supplier has ${matCount} material(s) and ${orderCount} order(s)` },
        { status: 400 }
      );
    }

    await prisma.supplier.delete({ where: { id: supplierId } });
    return NextResponse.json({ deleted: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

// ─── DELETE: Delete purchase order ──────────────────────────────────────────

export async function DELETE(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const role = (session.user as any).role;
  if (!["ADMIN", "COORDINATOR"].includes(role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const orderId = searchParams.get("orderId");
  if (!orderId) return NextResponse.json({ error: "orderId required" }, { status: 400 });

  await prisma.purchaseOrder.delete({ where: { id: orderId } });
  return NextResponse.json({ deleted: true });
}
