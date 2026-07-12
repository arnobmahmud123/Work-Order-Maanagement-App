import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Starting invoice merge...");
  
  // Get all work orders that have invoices
  const workOrders = await prisma.workOrder.findMany({
    include: {
      invoices: {
        include: {
          items: true
        },
        orderBy: {
          createdAt: 'asc'
        }
      }
    }
  });

  let mergedCount = 0;

  for (const wo of workOrders) {
    const clientInvoices = wo.invoices.filter(i => i.type === "CLIENT");
    const contractorInvoices = wo.invoices.filter(i => i.type === "CONTRACTOR");

    // Merge Client Invoices
    if (clientInvoices.length > 1) {
      console.log(`Work Order ${wo.id}: Found ${clientInvoices.length} CLIENT invoices. Merging into the first one...`);
      const primary = clientInvoices[0];
      const duplicates = clientInvoices.slice(1);
      
      for (const dup of duplicates) {
        // Move all items from duplicate to primary
        if (dup.items.length > 0) {
          for (const item of dup.items) {
            await prisma.invoiceItem.update({
              where: { id: item.id },
              data: { invoiceId: primary.id }
            });
          }
        }
        // Delete the duplicate invoice
        await prisma.invoice.delete({
          where: { id: dup.id }
        });
      }
      
      // Recalculate totals for primary
      const updatedPrimary = await prisma.invoice.findUnique({
        where: { id: primary.id },
        include: { items: true }
      });
      
      if (updatedPrimary) {
        const subtotal = updatedPrimary.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        const totalDiscount = updatedPrimary.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice * (item.discountPercent / 100)), 0);
        const total = subtotal - totalDiscount;
        
        await prisma.invoice.update({
          where: { id: primary.id },
          data: { subtotal, total }
        });
      }
      mergedCount++;
    }

    // Merge Contractor Invoices
    if (contractorInvoices.length > 1) {
      console.log(`Work Order ${wo.id}: Found ${contractorInvoices.length} CONTRACTOR invoices. Merging into the first one...`);
      const primary = contractorInvoices[0];
      const duplicates = contractorInvoices.slice(1);
      
      for (const dup of duplicates) {
        // Move all items from duplicate to primary
        if (dup.items.length > 0) {
          for (const item of dup.items) {
            await prisma.invoiceItem.update({
              where: { id: item.id },
              data: { invoiceId: primary.id }
            });
          }
        }
        // Delete the duplicate invoice
        await prisma.invoice.delete({
          where: { id: dup.id }
        });
      }
      
      // Recalculate totals for primary
      const updatedPrimary = await prisma.invoice.findUnique({
        where: { id: primary.id },
        include: { items: true }
      });
      
      if (updatedPrimary) {
        const subtotal = updatedPrimary.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
        const totalDiscount = updatedPrimary.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice * (item.discountPercent / 100)), 0);
        const total = subtotal - totalDiscount;
        
        await prisma.invoice.update({
          where: { id: primary.id },
          data: { subtotal, total }
        });
      }
      mergedCount++;
    }
  }

  console.log(`Finished merging! Merged invoices on ${mergedCount} work orders.`);
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
