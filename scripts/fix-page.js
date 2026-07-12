const fs = require('fs');
const file = 'src/app/dashboard/work-orders/[id]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace populateInvoiceFromTasks
content = content.replace(
  `    setActiveInvoiceItems(newItems);
    setShowNewInvoiceForm(true);
    toast.success(\`Populated \${newItems.length} items for \${invoiceType} invoice\`);`,
  `    const existing = workOrder?.invoices?.find((i) => invoiceType === "client" ? i.type !== "CONTRACTOR" : i.type === "CONTRACTOR");
    if (existing) {
      setActiveInvoiceItems([...existing.items, ...newItems]);
      if (invoiceType === "client") setClientEditingInvoiceId(existing.id);
      else setContractorEditingInvoiceId(existing.id);
    } else {
      setActiveInvoiceItems(newItems);
    }
    setShowNewInvoiceForm(true);
    toast.success(\`Populated \${newItems.length} items for \${invoiceType} invoice\`);`
);

// Replace main Add Client Invoice button
content = content.replace(
  `onClick={() => { setInvoiceType("client"); cancelEditInvoice(); setShowNewInvoiceForm(true); }}`,
  `onClick={() => { 
                setInvoiceType("client"); 
                const existing = workOrder?.invoices?.find((i) => i.type !== "CONTRACTOR");
                if (existing) {
                  setClientEditingInvoiceId(existing.id);
                  setClientInvoiceItems([...existing.items]);
                  setClientInvoiceNotes(existing.notes || "");
                } else {
                  cancelEditInvoice(); 
                }
                setShowNewInvoiceForm(true); 
              }}`
);

// Replace main Add Contractor Invoice button
content = content.replace(
  `onClick={() => { setInvoiceType("contractor"); cancelEditInvoice(); setShowNewInvoiceForm(true); }}`,
  `onClick={() => { 
                setInvoiceType("contractor"); 
                const existing = workOrder?.invoices?.find((i) => i.type === "CONTRACTOR");
                if (existing) {
                  setContractorEditingInvoiceId(existing.id);
                  setContractorInvoiceItems([...existing.items]);
                  setContractorInvoiceNotes(existing.notes || "");
                } else {
                  cancelEditInvoice(); 
                }
                setShowNewInvoiceForm(true); 
              }}`
);

fs.writeFileSync(file, content);
