"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardHeader, CardTitle, Button, Badge } from "@/components/ui";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowDownToLine,
  Clock,
  CheckCircle2,
  Lock,
  CreditCard,
  RefreshCw,
  Info,
  Calendar,
  FileText,
  AlertCircle,
} from "lucide-react";
import { cn, formatCurrency, formatRelativeTime, formatDate } from "@/lib/utils";

export default function ContractorBalancePage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;

  const { data: balanceData, isLoading } = useQuery({
    queryKey: ["contractor-balance"],
    queryFn: async () => {
      const res = await fetch("/api/contractor/balance");
      if (!res.ok) return null;
      return res.json();
    },
  });

  const { data: txData } = useQuery({
    queryKey: ["balance-transactions"],
    queryFn: async () => {
      const res = await fetch("/api/contractor/balance/transactions");
      if (!res.ok) return { transactions: [] };
      return res.json();
    },
  });

  const balance = balanceData?.balance;
  const transactions = txData?.transactions || [];

  const immatureInvoices = balance?.immatureInvoices || [];
  const maturedInvoices = balance?.maturedInvoices || [];

  const typeColors: Record<string, string> = {
    CREDIT: "text-emerald-400 bg-emerald-500/10",
    DEBIT: "text-red-400 bg-red-500/10",
    WITHDRAWAL: "text-amber-400 bg-amber-500/10",
    ADJUSTMENT: "text-blue-400 bg-blue-500/10",
  };

  const typeIcons: Record<string, any> = {
    CREDIT: TrendingUp,
    DEBIT: TrendingDown,
    WITHDRAWAL: ArrowDownToLine,
    ADJUSTMENT: RefreshCw,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Balance & Earnings</h1>
          <p className="text-text-secondary mt-1">Manage your earnings, 30-day holding schedule, and withdrawals</p>
        </div>
        <Link href="/dashboard/withdrawals">
          <Button disabled={!balance || balance.availableBalance <= 0}>
            <CreditCard className="h-4 w-4 mr-2" />
            Request Withdrawal
          </Button>
        </Link>
      </div>

      {/* 30-Day Holding Policy Notice */}
      <div className="p-4 rounded-2xl bg-cyan-500/5 border border-cyan-500/20 flex items-start gap-3.5">
        <Info className="h-5 w-5 text-cyan-400 shrink-0 mt-0.5" />
        <div className="text-xs text-text-secondary space-y-1">
          <p className="font-bold text-text-primary">30-Day Holding Policy</p>
          <p>
            When an admin approves your work order invoice, the funds are added to your account balance immediately.
            For security and quality verification, earnings become <strong>available for withdrawal 30 days after invoice approval</strong>.
            Immature funds unlock automatically as each invoice reaches its 30-day mark.
          </p>
        </div>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 1. Available to Withdraw */}
        <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-surface to-surface">
          <div className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-text-muted uppercase tracking-wider">Available to Withdraw</p>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono">≥30d</span>
                </div>
                <p className="text-2xl font-black text-emerald-400 mt-1">
                  {isLoading ? "..." : formatCurrency(balance?.availableBalance || 0)}
                </p>
              </div>
            </div>
            <p className="text-[10px] text-text-dim mt-3">
              Funds matured past 30 days and ready for payout
            </p>
          </div>
        </Card>

        {/* 2. Immature / 30-Day Holding */}
        <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-surface to-surface">
          <div className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
                <Clock className="h-6 w-6 text-amber-400" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-bold text-text-muted uppercase tracking-wider">Immature / Holding</p>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono">&lt;30d</span>
                </div>
                <p className="text-2xl font-black text-amber-400 mt-1">
                  {isLoading ? "..." : formatCurrency(balance?.immatureAmount || 0)}
                </p>
              </div>
            </div>
            <p className="text-[10px] text-text-dim mt-3">
              {balance?.daysUntilNextMaturity 
                ? `Next unlock: ${formatCurrency(balance.nextMaturityAmount || 0)} in ${balance.daysUntilNextMaturity} days`
                : "No funds currently in holding"}
            </p>
          </div>
        </Card>

        {/* 3. Total Earned */}
        <Card>
          <div className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center">
                <TrendingUp className="h-6 w-6 text-cyan-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-text-muted uppercase tracking-wider">Total Earned</p>
                <p className="text-2xl font-black text-cyan-400 mt-1">
                  {isLoading ? "..." : formatCurrency(balance?.totalEarned || 0)}
                </p>
              </div>
            </div>
            <p className="text-[10px] text-text-dim mt-3">
              Lifetime approved work order earnings
            </p>
          </div>
        </Card>

        {/* 4. Total Withdrawn */}
        <Card>
          <div className="p-5">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                <ArrowDownToLine className="h-6 w-6 text-purple-400" />
              </div>
              <div>
                <p className="text-xs font-bold text-text-muted uppercase tracking-wider">Total Withdrawn</p>
                <p className="text-2xl font-black text-purple-400 mt-1">
                  {isLoading ? "..." : formatCurrency(balance?.totalWithdrawn || 0)}
                </p>
              </div>
            </div>
            <p className="text-[10px] text-text-dim mt-3">
              Completed payout disbursements
            </p>
          </div>
        </Card>
      </div>

      {/* 30-Day Maturation Schedule Table */}
      <Card padding={false}>
        <div className="p-5 border-b border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Calendar className="h-5 w-5 text-amber-400" />
            <div>
              <CardTitle className="text-base">30-Day Maturation & Release Schedule</CardTitle>
              <p className="text-xs text-text-muted mt-0.5">Track when each approved invoice unlocks for withdrawal</p>
            </div>
          </div>
          <Badge className="bg-surface-hover text-text-secondary text-xs">
            {immatureInvoices.length} holding · {maturedInvoices.length} matured
          </Badge>
        </div>

        {immatureInvoices.length === 0 && maturedInvoices.length === 0 ? (
          <div className="p-8 text-center text-text-muted text-xs">
            No approved invoices on record yet. Once an admin approves your work order invoices, they will appear here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-hover/50 text-[10px] font-bold text-text-dim uppercase tracking-wider border-b border-border-subtle">
                <tr>
                  <th className="px-5 py-3">Invoice / Job</th>
                  <th className="px-4 py-3">Approved Date</th>
                  <th className="px-4 py-3">Unlock Date</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-5 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {/* Immature (Holding) Invoices */}
                {immatureInvoices.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-surface-hover/30 transition-colors">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-text-primary">{inv.invoiceNumber}</div>
                      {inv.workOrderTitle && (
                        <div className="text-[11px] text-text-muted truncate max-w-xs">{inv.workOrderTitle}</div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-text-secondary">
                      {formatDate(inv.approvedAt)}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-amber-400">
                      {formatDate(inv.matureDate)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-text-primary">
                      {formatCurrency(inv.amount)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <Lock className="h-2.5 w-2.5" />
                        Unlocks in {inv.daysRemaining}d
                      </span>
                    </td>
                  </tr>
                ))}

                {/* Matured (Available) Invoices */}
                {maturedInvoices.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-surface-hover/30 transition-colors opacity-90">
                    <td className="px-5 py-3.5">
                      <div className="font-bold text-text-primary">{inv.invoiceNumber}</div>
                      {inv.workOrderTitle && (
                        <div className="text-[11px] text-text-muted truncate max-w-xs">{inv.workOrderTitle}</div>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-text-secondary">
                      {formatDate(inv.approvedAt)}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-text-muted">
                      {formatDate(inv.matureDate)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-bold text-emerald-400">
                      {formatCurrency(inv.amount)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <CheckCircle2 className="h-2.5 w-2.5" />
                        Matured (Withdrawable)
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Transaction History */}
      <Card padding={false}>
        <div className="p-5 border-b border-border-subtle">
          <CardTitle className="text-base">Transaction History</CardTitle>
        </div>
        {transactions.length > 0 ? (
          <div className="divide-y divide-border-subtle">
            {transactions.map((tx: any) => {
              const Icon = typeIcons[tx.type] || DollarSign;
              const isPositive = tx.amount > 0;
              return (
                <div
                  key={tx.id}
                  className="flex items-center gap-3.5 p-4 hover:bg-surface-hover transition-colors"
                >
                  <div
                    className={cn(
                      "h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0",
                      typeColors[tx.type] || "text-text-secondary bg-surface-hover"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-text-primary truncate">
                      {tx.description}
                    </p>
                    <p className="text-[10px] text-text-muted mt-0.5">
                      {formatRelativeTime(tx.createdAt)}
                      {tx.referenceId && (
                        <span className="ml-2 text-text-dim">• Ref: {tx.referenceId.slice(0, 8)}</span>
                      )}
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={cn(
                        "text-xs font-bold font-mono",
                        isPositive ? "text-emerald-400" : "text-red-400"
                      )}
                    >
                      {isPositive ? "+" : ""}
                      {formatCurrency(tx.amount)}
                    </p>
                    <p className="text-[10px] text-text-dim font-mono mt-0.5">
                      Bal: {formatCurrency(tx.balanceAfter)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-text-muted text-xs">No transactions recorded yet</div>
        )}
      </Card>
    </div>
  );
}
