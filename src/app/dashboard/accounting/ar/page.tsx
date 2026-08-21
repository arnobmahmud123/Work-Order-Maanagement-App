'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { Receipt, AlertTriangle, FileText, Send, Clock, Loader2, ArrowRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

export default function ARDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAR = async () => {
      try {
        const res = await fetch('/api/accounting/ar');
        if (!res.ok) throw new Error('Failed to load AR data');
        const json = await res.json();
        setData(json);
      } catch (err) {
        toast.error('Failed to load AR data');
      } finally {
        setLoading(false);
      }
    };
    fetchAR();
  }, []);

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!data) return null;

  const totalUnbilled = data.unbilledWorkOrders.length;
  const totalOverdue = data.overdue.reduce((sum: number, i: any) => sum + (i.total || 0), 0);
  const totalSent = data.sent.reduce((sum: number, i: any) => sum + (i.total || 0), 0);
  const totalDraft = data.drafts.reduce((sum: number, i: any) => sum + (i.total || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center border border-cyan-500/20">
            <Receipt className="h-6 w-6 text-cyan-700 dark:text-cyan-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">Accounts Receivable</h1>
            <p className="text-sm text-text-muted">Track unbilled work, sent invoices, and collections</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-white dark:bg-surface-dark border-border-subtle">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-bold text-text-secondary">Unbilled Work</CardTitle>
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <div className="p-6 pt-0">
            <div className="text-2xl font-black text-amber-600">{totalUnbilled}</div>
            <p className="text-xs text-text-muted mt-1">Completed WOs without Client Invoice</p>
          </div>
        </Card>

        <Card className="bg-white dark:bg-surface-dark border-border-subtle">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-bold text-text-secondary">Draft Invoices</CardTitle>
            <FileText className="h-4 w-4 text-slate-500" />
          </CardHeader>
          <div className="p-6 pt-0">
            <div className="text-2xl font-black">{formatCurrency(totalDraft)}</div>
            <p className="text-xs text-text-muted mt-1">{data.drafts.length} invoices to be sent</p>
          </div>
        </Card>

        <Card className="bg-white dark:bg-surface-dark border-border-subtle">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-bold text-text-secondary">Sent & Unpaid</CardTitle>
            <Send className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <div className="p-6 pt-0">
            <div className="text-2xl font-black text-blue-600">{formatCurrency(totalSent)}</div>
            <p className="text-xs text-text-muted mt-1">{data.sent.length} invoices awaiting payment</p>
          </div>
        </Card>

        <Card className="bg-white dark:bg-surface-dark border-border-subtle">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-bold text-text-secondary">Overdue</CardTitle>
            <Clock className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <div className="p-6 pt-0">
            <div className="text-2xl font-black text-rose-600">{formatCurrency(totalOverdue)}</div>
            <p className="text-xs text-text-muted mt-1">{data.overdue.length} invoices overdue</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card className="bg-white dark:bg-surface-dark border-border-subtle shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center justify-between">
              <span className="flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-500" /> Unbilled Completed Work Orders</span>
            </CardTitle>
          </CardHeader>
          <div className="p-6 pt-0">
            {data.unbilledWorkOrders.length === 0 ? (
              <p className="text-sm text-text-muted">All completed work orders are billed.</p>
            ) : (
              <div className="space-y-3">
                {data.unbilledWorkOrders.slice(0, 10).map((wo: any) => (
                  <Link key={wo.id} href={`/dashboard/work-orders/${wo.id}`} className="block">
                    <div className="flex items-center justify-between p-3 rounded-lg border border-border-subtle bg-surface-hover/30 hover:border-cyan-500/30 transition-all">
                      <div>
                        <div className="font-bold text-sm text-text-primary">{wo.title}</div>
                        <div className="text-xs text-text-muted">{wo.address}</div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-text-muted" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card className="bg-white dark:bg-surface-dark border-border-subtle shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center justify-between">
              <span className="flex items-center gap-2"><Clock className="h-4 w-4 text-rose-500" /> Overdue Client Invoices</span>
            </CardTitle>
          </CardHeader>
          <div className="p-6 pt-0">
            {data.overdue.length === 0 ? (
              <p className="text-sm text-text-muted">No overdue invoices.</p>
            ) : (
              <div className="space-y-3">
                {data.overdue.slice(0, 10).map((inv: any) => (
                  <div key={inv.id} className="flex items-center justify-between p-3 rounded-lg border border-rose-200 bg-rose-50/50 dark:bg-rose-950/10 dark:border-rose-900/50">
                    <div>
                      <div className="font-bold text-sm text-text-primary">{inv.invoiceNumber}</div>
                      <div className="text-xs text-text-muted">Due: {new Date(inv.dueDate).toLocaleDateString()}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sm text-rose-600">{formatCurrency(inv.total)}</div>
                      <Link href={`/dashboard/work-orders/${inv.workOrderId}`} className="text-[10px] font-bold text-rose-600 hover:underline mt-1 inline-block">
                        View Work Order
                      </Link>
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
