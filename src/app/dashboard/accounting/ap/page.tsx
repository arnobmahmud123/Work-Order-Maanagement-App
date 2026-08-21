'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';
import { Wallet, AlertCircle, ShoppingBag, Loader2, ArrowRight, Clock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import Link from 'next/link';

export default function APDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAP = async () => {
      try {
        const res = await fetch('/api/accounting/ap');
        if (!res.ok) { const err = await res.json(); throw new Error(err.error || 'Failed to load AP data'); }
        const json = await res.json();
        setData(json);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to load AP data');
      } finally {
        setLoading(false);
      }
    };
    fetchAP();
  }, []);

  if (loading) {
    return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  if (!data) return null;

  const totalPendingBalance = data.contractorBalances.reduce((sum: number, b: any) => sum + (b.pendingAmount || 0), 0);
  const totalAvailableBalance = data.contractorBalances.reduce((sum: number, b: any) => sum + (b.availableBalance || 0), 0);
  const totalUnpaidBills = data.unpaidBills.reduce((sum: number, b: any) => sum + (b.total || 0), 0);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-violet-500/10 flex items-center justify-center border border-violet-500/20">
            <Wallet className="h-6 w-6 text-violet-700 dark:text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">Accounts Payable</h1>
            <p className="text-sm text-text-muted">Track contractor liabilities and supplier bills</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-white dark:bg-surface-dark border-border-subtle">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-bold text-text-secondary">Mature Liabilities</CardTitle>
            <AlertCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <div className="p-6 pt-0">
            <div className="text-2xl font-black text-emerald-600">{formatCurrency(totalAvailableBalance)}</div>
            <p className="text-xs text-text-muted mt-1">Available Contractor Balances ({'>'}30 days)</p>
          </div>
        </Card>

        <Card className="bg-white dark:bg-surface-dark border-border-subtle">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-bold text-text-secondary">Pending Liabilities</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <div className="p-6 pt-0">
            <div className="text-2xl font-black text-amber-600">{formatCurrency(totalPendingBalance)}</div>
            <p className="text-xs text-text-muted mt-1">Pending Contractor Balances ({'<'}30 days)</p>
          </div>
        </Card>

        <Card className="bg-white dark:bg-surface-dark border-border-subtle">
          <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-sm font-bold text-text-secondary">Unpaid Supplier Bills</CardTitle>
            <ShoppingBag className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <div className="p-6 pt-0">
            <div className="text-2xl font-black text-rose-600">{formatCurrency(totalUnpaidBills)}</div>
            <p className="text-xs text-text-muted mt-1">{data.unpaidBills.length} outstanding bills</p>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <Card className="bg-white dark:bg-surface-dark border-border-subtle shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Wallet className="h-4 w-4" /> Contractor Ledger
            </CardTitle>
          </CardHeader>
          <div className="p-6 pt-0">
            {data.contractorBalances.length === 0 ? (
              <p className="text-sm text-text-muted">No contractor balances.</p>
            ) : (
              <div className="space-y-3">
                {data.contractorBalances.map((b: any) => (
                  <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border border-border-subtle bg-surface-hover/30">
                    <div>
                      <div className="font-bold text-sm text-text-primary">{b.contractor?.name || 'Unknown'}</div>
                      <div className="text-xs text-text-muted">Available: {formatCurrency(b.availableBalance)}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sm text-amber-600">Pending: {formatCurrency(b.pendingAmount)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card className="bg-white dark:bg-surface-dark border-border-subtle shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <ShoppingBag className="h-4 w-4" /> Supplier Bills
            </CardTitle>
          </CardHeader>
          <div className="p-6 pt-0">
            {data.unpaidBills.length === 0 ? (
              <p className="text-sm text-text-muted">No unpaid supplier bills.</p>
            ) : (
              <div className="space-y-3">
                {data.unpaidBills.map((b: any) => (
                  <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border border-border-subtle bg-surface-hover/30">
                    <div>
                      <div className="font-bold text-sm text-text-primary">{b.billNumber}</div>
                      <div className="text-xs text-text-muted">Vendor: {b.vendor?.name || b.vendorName || 'Unknown'}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sm text-rose-600">{formatCurrency(b.total)}</div>
                      {b.workOrderId && (
                        <Link href={`/dashboard/work-orders/${b.workOrderId}`} className="text-[10px] text-text-muted hover:underline mt-1 inline-block">
                          View Work Order
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>

        <Card className="bg-white dark:bg-surface-dark border-border-subtle shadow-sm col-span-1 lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-rose-500" /> Recent Chargebacks / Penalties
            </CardTitle>
          </CardHeader>
          <div className="p-6 pt-0">
            {(!data.chargebacks || data.chargebacks.length === 0) ? (
              <p className="text-sm text-text-muted">No chargebacks recorded.</p>
            ) : (
              <div className="space-y-3">
                {data.chargebacks.map((cb: any) => (
                  <div key={cb.id} className="flex items-center justify-between p-3 rounded-lg border border-rose-200 bg-rose-50/50 dark:bg-rose-950/10 dark:border-rose-900/50">
                    <div>
                      <div className="font-bold text-sm text-text-primary">{cb.contractor?.name} - {cb.reason}</div>
                      <div className="text-xs text-text-muted">{new Date(cb.createdAt).toLocaleDateString()} &middot; Status: {cb.status}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-sm text-rose-600">-{formatCurrency(cb.amount)}</div>
                      {cb.workOrderId && (
                        <Link href={`/dashboard/work-orders/${cb.workOrderId}`} className="text-[10px] text-rose-600 hover:underline mt-1 inline-block">
                          View Work Order
                        </Link>
                      )}
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
