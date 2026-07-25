import prisma from "@/lib/prisma";

/**
 * Find the paired invoice for a given invoice.
 * If the invoice is CLIENT type, finds the CONTRACTOR invoice for the same work order (and vice versa).
 * Returns null if no paired invoice exists or if the invoice has no workOrderId.
 */
export async function findPairedInvoice(
  tx: any,
  invoiceId: string,
  type: "CLIENT" | "CONTRACTOR",
  workOrderId: string | null
) {
  if (!workOrderId) return null;

  const pairedType = type === "CLIENT" ? "CONTRACTOR" : "CLIENT";

  return tx.invoice.findFirst({
    where: {
      workOrderId,
      type: pairedType,
      id: { not: invoiceId },
    },
    include: { items: true },
  });
}

/**
 * Sync item structure from a source invoice to a paired invoice.
 * Syncs: taskName, description, unit, quantity, item count (add/remove)
 * Preserves: unitPrice, discountPercent, amount (each invoice keeps its own pricing)
 *
 * Matching logic:
 * - Items are matched by position (index) when counts are equal
 * - When items are added/removed, we rebuild the paired invoice's items to match the source structure
 */
export async function syncInvoiceItemStructure(
  tx: any,
  sourceInvoiceId: string,
  pairedInvoiceId: string
) {
  const sourceItems = await tx.invoiceItem.findMany({
    where: { invoiceId: sourceInvoiceId },
    orderBy: { id: "asc" },
  });

  const pairedItems = await tx.invoiceItem.findMany({
    where: { invoiceId: pairedInvoiceId },
    orderBy: { id: "asc" },
  });

  // Build a map of existing paired items by taskName for smart matching
  const pairedByTaskName = new Map<string, typeof pairedItems[0]>();
  for (const item of pairedItems) {
    const key = item.taskName || item.description || item.id;
    pairedByTaskName.set(key, item);
  }

  // Track which paired items were matched
  const matchedPairedIds = new Set<string>();

  // For each source item, find or create a corresponding paired item
  for (const srcItem of sourceItems) {
    const key = srcItem.taskName || srcItem.description || srcItem.id;
    const existing = pairedByTaskName.get(key);

    if (existing) {
      // Update structure fields only, preserve pricing
      await tx.invoiceItem.update({
        where: { id: existing.id },
        data: {
          taskName: srcItem.taskName,
          description: srcItem.description,
          unit: srcItem.unit,
          quantity: srcItem.quantity,
          // Recalculate amount with existing pricing
          amount:
            srcItem.quantity *
            existing.unitPrice *
            (1 - (existing.discountPercent || 0) / 100),
        },
      });
      matchedPairedIds.add(existing.id);
    } else {
      // Create new item in paired invoice with default pricing (0)
      const created = await tx.invoiceItem.create({
        data: {
          taskName: srcItem.taskName,
          description: srcItem.description,
          unit: srcItem.unit,
          quantity: srcItem.quantity,
          unitPrice: 0,
          discountPercent: 0,
          amount: 0,
          invoiceId: pairedInvoiceId,
        },
      });
      matchedPairedIds.add(created.id);
    }
  }

  // Remove paired items that no longer exist in source
  for (const pairedItem of pairedItems) {
    if (!matchedPairedIds.has(pairedItem.id)) {
      await tx.invoiceItem.delete({ where: { id: pairedItem.id } });
    }
  }

  // Recalculate paired invoice totals
  const updatedPairedItems = await tx.invoiceItem.findMany({
    where: { invoiceId: pairedInvoiceId },
  });
  const pairedSubtotal = updatedPairedItems.reduce(
    (sum: number, i: any) => sum + i.quantity * i.unitPrice,
    0
  );
  const pairedTotalDiscount = updatedPairedItems.reduce(
    (sum: number, i: any) =>
      sum + (i.quantity * i.unitPrice * (i.discountPercent || 0)) / 100,
    0
  );
  const pairedInv = await tx.invoice.findUnique({
    where: { id: pairedInvoiceId },
  });
  const pairedTotal = pairedSubtotal - pairedTotalDiscount + (pairedInv?.tax || 0);

  await tx.invoice.update({
    where: { id: pairedInvoiceId },
    data: {
      subtotal: pairedSubtotal,
      total: pairedInv?.noCharge ? 0 : pairedTotal,
    },
  });
}
