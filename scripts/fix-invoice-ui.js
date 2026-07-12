const fs = require('fs');
const file = 'src/app/dashboard/work-orders/[id]/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Replace the group header actions
const groupHeaderSearch = `<div className="ml-auto flex items-center gap-2">
                      {invoices.length === 0 && (
                        <button onClick={() => { setInvoiceType(color === "cyan" ? "client" : "contractor"); cancelEditInvoice(); setShowNewInvoiceForm(true); }} className={\`flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r border transition-all text-[10px] font-black uppercase tracking-widest shadow-lg \${color === "cyan" ? "from-cyan-500/10 to-blue-500/10 text-cyan-400 hover:from-cyan-500/20 hover:to-blue-500/20 border-cyan-500/20 hover:border-cyan-500/40 shadow-cyan-500/5" : "from-emerald-500/10 to-teal-500/10 text-emerald-400 hover:from-emerald-500/20 hover:to-teal-500/20 border-emerald-500/20 hover:border-emerald-500/40 shadow-emerald-500/5"}\`}>
                          <Plus className="h-3.5 w-3.5" /> Add Invoice
                        </button>
                      )}
                      {invoices.map((inv: any) => (
                        <Fragment key={\`actions-\${inv.id}\`}>
                          <button onClick={() => handlePrintInvoice(inv)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-surface-hover text-text-secondary hover:text-white border border-border-subtle hover:border-border-medium transition-all text-[10px] font-black uppercase tracking-widest">
                            <Printer className="h-3.5 w-3.5" /> Print
                          </button>
                          <button onClick={async () => {
                            if (confirm("Are you sure you want to delete this invoice?")) {
                              try {
                                await fetch(\`/api/invoices/\${inv.id}\`, { method: "DELETE" });
                                toast.success("Invoice deleted");
                                refetchWorkOrder();
                              } catch (e) {
                                toast.error("Failed to delete invoice");
                              }
                            }
                          }} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 hover:text-rose-400 border border-rose-500/20 transition-all text-[10px] font-black uppercase tracking-widest">
                            <Trash2 className="h-3.5 w-3.5" /> Delete
                          </button>
                        </Fragment>
                      ))}
                    </div>`;

const groupHeaderReplace = `<div className="ml-auto flex items-center gap-2">
                      <button onClick={() => { 
                        setInvoiceType(color === "cyan" ? "client" : "contractor"); 
                        const existing = invoices[0];
                        if (existing) {
                          if (color === "cyan") {
                            setClientEditingInvoiceId(existing.id);
                            setClientInvoiceItems([...existing.items]);
                            setClientInvoiceNotes(existing.notes || "");
                          } else {
                            setContractorEditingInvoiceId(existing.id);
                            setContractorInvoiceItems([...existing.items]);
                            setContractorInvoiceNotes(existing.notes || "");
                          }
                        } else {
                          cancelEditInvoice(); 
                        }
                        setShowNewInvoiceForm(true); 
                      }} className={\`flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r border transition-all text-[10px] font-black uppercase tracking-widest shadow-lg \${color === "cyan" ? "from-cyan-500/10 to-blue-500/10 text-cyan-400 hover:from-cyan-500/20 hover:to-blue-500/20 border-cyan-500/20 hover:border-cyan-500/40 shadow-cyan-500/5" : "from-emerald-500/10 to-teal-500/10 text-emerald-400 hover:from-emerald-500/20 hover:to-teal-500/20 border-emerald-500/20 hover:border-emerald-500/40 shadow-emerald-500/5"}\`}>
                        <Plus className="h-3.5 w-3.5" /> {invoices.length > 0 ? "Add Invoice Items" : "Add Invoice"}
                      </button>
                    </div>`;

content = content.replace(groupHeaderSearch, groupHeaderReplace);

// 2. Replace the invoice sub-header actions
const subHeaderSearch = `) : (
                                <button onClick={() => startInlineEdit(inv)} className={\`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r border transition-all text-[10px] font-black uppercase tracking-widest shadow-lg \${colorClasses.edit}\`}>
                                  <Edit className="h-3 w-3" /> Edit Items
                                </button>
                              )}
                          </div>
                        </div>`;

const subHeaderReplace = `) : (
                              <>
                                <button onClick={() => handlePrintInvoice(inv)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-surface-hover text-text-secondary hover:text-white border border-border-subtle hover:border-border-medium transition-all text-[10px] font-black uppercase tracking-widest">
                                  <Printer className="h-3 w-3" /> Print
                                </button>
                                <button onClick={async () => {
                                  if (confirm("Are you sure you want to delete this invoice?")) {
                                    try {
                                      await fetch(\`/api/invoices/\${inv.id}\`, { method: "DELETE" });
                                      toast.success("Invoice deleted");
                                      refetchWorkOrder();
                                    } catch (e) {
                                      toast.error("Failed to delete invoice");
                                    }
                                  }
                                }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 hover:text-rose-400 border border-rose-500/20 transition-all text-[10px] font-black uppercase tracking-widest">
                                  <Trash2 className="h-3 w-3" /> Delete
                                </button>
                                <button onClick={() => startInlineEdit(inv)} className={\`flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r border transition-all text-[10px] font-black uppercase tracking-widest shadow-lg \${colorClasses.edit}\`}>
                                  <Edit className="h-3 w-3" /> Edit Items
                                </button>
                              </>
                            )}
                          </div>
                        </div>`;

content = content.replace(subHeaderSearch, subHeaderReplace);

fs.writeFileSync(file, content);
