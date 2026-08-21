'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { TrendingUp, TrendingDown, Receipt, Wallet, ReceiptText, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface FinancialsProps {
  workOrderId: string;
}

export function WorkOrderFinancials({ workOrderId }: FinancialsProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFinancials = async () => {
      try {
        const res = await fetch(`/api/work-orders/${workOrderId}/financials`);
        if (!res.ok) throw new Error('Failed to load financials');
        const json = await res.json();
        setData(json);
      } catch (err) {
        toast.error('Failed to load financials');
      } finally {
        setLoading(false);
      }
    };
    fetchFinancials();
  }, [workOrderId]);

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!data) return null;

  const { summary } = data;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="h-10 w-10 rounded-2xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
          <Wallet className="h-5 w-5 text-violet-700 dark:text-violet-400" />
        </div>
        <div>
          <h3 className="text-sm font-black text-text-primary uppercase tracking-widest">Financial Summary</h3>
          <p className="text-[10px] font-bold text-text-muted">
            Micro P&L (Profit & Loss) for this Work Order
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-white dark:bg-surface-dark border-border-subtle shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-bold text-text-secondary">Total Revenue (AR)</CardTitle>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <div>
            <div className="text-2xl font-black">{formatCurrency(summary.totalAR)}</div>
            <p className="text-xs text-text-muted mt-1">
              {formatCurrency(summary.paidAR)} collected
            </p>
          </div>
        </Card>

        <Card className="bg-white dark:bg-surface-dark border-border-subtle shadow-sm">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-bold text-text-secondary">Total Costs (AP)</CardTitle>
            <TrendingDown className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <div>
            <div className="text-2xl font-black">{formatCurrency(summary.totalAP)}</div>
            <p className="text-xs text-text-muted mt-1">
              {formatCurrency(summary.totalLaborAP)} labor + {formatCurrency(summary.totalMaterialsAP)} materials
            </p>
          </div>
        </Card>

        <Card className="bg-white dark:bg-surface-dark border-border-subtle shadow-sm relative overflow-hidden">
          <div className={"absolute inset-0 opacity-10 " + (summary.grossMargin >= 0 ? 'bg-emerald-500' : 'bg-rose-500')} />
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0 relative">
            <CardTitle className="text-sm font-bold text-text-secondary">Gross Margin</CardTitle>
            <Wallet className={"h-4 w-4 " + (summary.grossMargin >= 0 ? 'text-emerald-500' : 'text-rose-500')} />
          </CardHeader>
          <div className="relative">
            <div className={"text-2xl font-black " + (summary.grossMargin >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400')}>
              {formatCurrency(summary.grossMargin)}
            </div>
            <p className="text-xs text-text-muted mt-1">
              {summary.grossMarginPercent.toFixed(1)}% profit margin
            </p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card className="bg-white dark:bg-surface-dark border-border-subtle shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-text-primary flex items-center gap-2">
              <ReceiptText className="h-4 w-4" /> Client Invoices (AR)
            </CardTitle>
          </CardHeader>
          <div>
            {data.clientInvoices.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-4">No client invoices found.</p>
            ) : (
              <div className="space-y-3">
                {data.clientInvoices.map((inv: any) => (
                  <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg border border-border-subtle bg-surface-hover/30">
                    <div>
                      <div className="font-bold text-sm text-text-primary">{inv.invoiceNumber}</div>
                      <div className="text-xs text-text-muted">{new Date(inv.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sm">{formatCurrency(inv.total)}</div>
                      <div className={"text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full inline-block mt-1 " + (inv.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600')}>
                        {inv.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card className="bg-white dark:bg-surface-dark border-border-subtle shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold text-text-primary flex items-center gap-2">
              <Receipt className="h-4 w-4" /> Contractor & Vendor Bills (AP)
            </CardTitle>
          </CardHeader>
          <div>
            {data.contractorInvoices.length === 0 && data.bills.length === 0 ? (
              <p className="text-sm text-text-muted text-center py-4">No contractor invoices or bills found.</p>
            ) : (
              <div className="space-y-3">
                {data.contractorInvoices.map((inv: any) => (
                  <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg border border-border-subtle bg-surface-hover/30">
                    <div>
                      <div className="font-bold text-sm text-text-primary">{inv.invoiceNumber} (Contractor)</div>
                      <div className="text-xs text-text-muted">{inv.client?.name || 'Unknown'}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sm text-rose-600">-{formatCurrency(inv.total)}</div>
                      <div className={"text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full inline-block mt-1 " + (inv.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600')}>
                        {inv.status}
                      </div>
                    </div>
                  </div>
                ))}
                {data.bills.map((bill: any) => (
                  <div key={bill.id} className="flex items-center justify-between p-3 rounded-lg border border-border-subtle bg-surface-hover/30">
                    <div>
                      <div className="font-bold text-sm text-text-primary">{bill.billNumber} (Material/Bill)</div>
                      <div className="text-xs text-text-muted">{bill.vendorName || bill.vendor?.name || 'Unknown'}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sm text-rose-600">-{formatCurrency(bill.total)}</div>
                      <div className={"text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full inline-block mt-1 " + (bill.status === 'PAID' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-amber-500/10 text-amber-600')}>
                        {bill.status}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
