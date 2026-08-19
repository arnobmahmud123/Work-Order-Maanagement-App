"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardHeader, CardTitle, Button, Badge, Input } from "@/components/ui";
import {
  CreditCard,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  DollarSign,
  ChevronRight,
  X,
  Info,
  Lock,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { cn, formatRelativeTime, formatCurrency, formatDate } from "@/lib/utils";
import toast from "react-hot-toast";

const STATUS_LABELS: Record<string, string> = {
  PENDING: "Pending",
  PROCESSING: "Processing",
  COMPLETED: "Completed",
  REJECTED: "Rejected",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  PROCESSING: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  COMPLETED: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  REJECTED: "bg-red-500/10 text-red-400 border-red-500/20",
};

const STATUS_ICONS: Record<string, any> = {
  PENDING: Clock,
  PROCESSING: Loader2,
  COMPLETED: CheckCircle2,
  REJECTED: XCircle,
};

const PAYMENT_METHODS = [
  { id: "ACH", label: "ACH (US Bank)", fields: ["routingNumber", "accountNumber", "bankName"] },
  { id: "WIRE", label: "Wire Transfer", fields: ["swift", "iban", "bankName", "country"] },
  { id: "PAYPAL", label: "PayPal", fields: ["email"] },
  { id: "ZELLE", label: "Zelle", fields: ["emailOrPhone"] },
  { id: "CHECK", label: "Check", fields: ["mailingAddress"] },
];

const FIELD_LABELS: Record<string, string> = {
  routingNumber: "Routing Number",
  accountNumber: "Account Number",
  bankName: "Bank Name",
  swift: "SWIFT/BIC",
  iban: "IBAN",
  country: "Country",
  email: "Email Address",
  emailOrPhone: "Email or Phone",
  mailingAddress: "Mailing Address",
};

export default function WithdrawalsPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;
  const isAdmin = role === "ADMIN";
  const qc = useQueryClient();

  const [showRequest, setShowRequest] = useState(false);
  const [requestForm, setRequestForm] = useState({
    amount: "",
    method: "ACH",
    paymentDetails: {} as Record<string, string>,
  });
  const [submitting, setSubmitting] = useState(false);

  // Fetch balance
  const { data: balanceData } = useQuery({
    queryKey: ["contractor-balance"],
    queryFn: async () => {
      const res = await fetch("/api/contractor/balance");
      if (!res.ok) return null;
      return res.json();
    },
  });

  const balance = balanceData?.balance;
  const immatureInvoices = balance?.immatureInvoices || [];

  // Fetch withdrawals
  const { data, isLoading } = useQuery({
    queryKey: ["withdrawals"],
    queryFn: async () => {
      const res = await fetch("/api/withdrawals");
      if (!res.ok) return { withdrawals: [] };
      return res.json();
    },
  });

  const withdrawals = data?.withdrawals || [];

  const selectedMethod = PAYMENT_METHODS.find((m) => m.id === requestForm.method);

  function handleFieldChange(field: string, value: string) {
    setRequestForm({
      ...requestForm,
      paymentDetails: { ...requestForm.paymentDetails, [field]: value },
    });
  }

  async function handleSubmitRequest() {
    const amount = parseFloat(requestForm.amount);
    if (!amount || amount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    if (balance && amount > balance.availableBalance) {
      toast.error(
        `Amount exceeds available withdrawable balance ($${balance.availableBalance.toFixed(2)}). Funds in 30-day holding cannot be withdrawn yet.`
      );
      return;
    }

    // Validate required fields
    const method = PAYMENT_METHODS.find((m) => m.id === requestForm.method);
    if (method) {
      for (const field of method.fields) {
        if (!requestForm.paymentDetails[field]?.trim()) {
          toast.error(`${FIELD_LABELS[field]} is required`);
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/withdrawals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          method: requestForm.method,
          paymentDetails: requestForm.paymentDetails,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to submit withdrawal");
        return;
      }
      toast.success("Withdrawal request submitted");
      setShowRequest(false);
      setRequestForm({ amount: "", method: "ACH", paymentDetails: {} });
      qc.invalidateQueries({ queryKey: ["withdrawals"] });
      qc.invalidateQueries({ queryKey: ["contractor-balance"] });
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleAdminUpdate(withdrawalId: string, status: string, rejectionReason?: string) {
    try {
      const body: any = { status };
      if (rejectionReason) body.rejectionReason = rejectionReason;

      const res = await fetch(`/api/withdrawals/${withdrawalId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        toast.error("Failed to update withdrawal");
        return;
      }
      toast.success("Withdrawal updated");
      qc.invalidateQueries({ queryKey: ["withdrawals"] });
      qc.invalidateQueries({ queryKey: ["contractor-balance"] });
    } catch {
      toast.error("Something went wrong");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Withdrawals & Payouts</h1>
          <p className="text-text-secondary mt-1">
            {isAdmin ? "Manage and process contractor withdrawal requests" : "Request withdrawals for matured earnings past 30 days"}
          </p>
        </div>
        {!isAdmin && (
          <Button 
            onClick={() => setShowRequest(true)}
            disabled={!balance || balance.availableBalance <= 0}
          >
            <Plus className="h-4 w-4 mr-2" />
            Request Withdrawal
          </Button>
        )}
      </div>

      {/* Balance Summary (for contractors) */}
      {!isAdmin && balance && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/5 via-surface to-surface">
            <div className="p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <p className="text-xs font-bold text-text-muted uppercase tracking-wider">Available (≥30 Days)</p>
              </div>
              <p className="text-xl font-black text-emerald-400">
                {formatCurrency(balance.availableBalance)}
              </p>
              <p className="text-[10px] text-text-dim mt-1">Ready to withdraw</p>
            </div>
          </Card>

          <Card className="border-amber-500/30 bg-gradient-to-br from-amber-500/5 via-surface to-surface">
            <div className="p-4">
              <div className="flex items-center gap-1.5 mb-1">
                <p className="text-xs font-bold text-text-muted uppercase tracking-wider">30-Day Holding (&lt;30 Days)</p>
              </div>
              <p className="text-xl font-black text-amber-400">
                {formatCurrency(balance.immatureAmount || 0)}
              </p>
              <p className="text-[10px] text-text-dim mt-1">
                {balance.daysUntilNextMaturity 
                  ? `Next unlock in ${balance.daysUntilNextMaturity}d`
                  : "No funds in holding"}
              </p>
            </div>
          </Card>

          <Card>
            <div className="p-4">
              <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Pending Payouts</p>
              <p className="text-xl font-black text-blue-400">
                {formatCurrency(balance.pendingWithdrawn || 0)}
              </p>
              <p className="text-[10px] text-text-dim mt-1">Processing requests</p>
            </div>
          </Card>

          <Card>
            <div className="p-4">
              <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">Total Withdrawn</p>
              <p className="text-xl font-black text-purple-400">
                {formatCurrency(balance.totalWithdrawn)}
              </p>
              <p className="text-[10px] text-text-dim mt-1">Lifetime disbursements</p>
            </div>
          </Card>
        </div>
      )}

      {/* 30-Day Rule Notice when no funds are withdrawable */}
      {!isAdmin && balance && balance.availableBalance <= 0 && balance.immatureAmount > 0 && (
        <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3.5">
          <Clock className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-xs text-text-secondary space-y-1">
            <p className="font-bold text-text-primary">All Earnings Currently in 30-Day Holding Period</p>
            <p>
              You have <strong>{formatCurrency(balance.immatureAmount)}</strong> in pending earnings. 
              Under the property preservation policy, funds mature and unlock for withdrawal 30 days after work order invoice approval.
              {balance.daysUntilNextMaturity && (
                <span> Your next release of <strong>{formatCurrency(balance.nextMaturityAmount || 0)}</strong> will unlock on <strong>{formatDate(balance.nextMaturityDate)}</strong> ({balance.daysUntilNextMaturity} days remaining).</span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* Request Form */}
      {showRequest && (
        <Card className="border-cyan-500/20">
          <CardHeader>
            <div className="flex items-center justify-between w-full">
              <CardTitle className="text-sm">Request Withdrawal</CardTitle>
              <button
                onClick={() => setShowRequest(false)}
                className="p-1 rounded-lg hover:bg-surface-hover text-text-secondary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </CardHeader>
          <div className="space-y-4 p-5">
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs flex items-center justify-between">
              <span className="font-bold text-emerald-400">Available Withdrawable Balance (≥30d):</span>
              <span className="font-black text-emerald-400 text-sm">{formatCurrency(balance?.availableBalance || 0)}</span>
            </div>

            <Input
              label="Amount ($)"
              type="number"
              value={requestForm.amount}
              onChange={(e) => setRequestForm({ ...requestForm, amount: e.target.value })}
              placeholder="0.00"
              max={balance?.availableBalance || 0}
              min={1}
              helperText={
                balance
                  ? `Max withdrawable: ${formatCurrency(balance.availableBalance)} (${formatCurrency(balance.immatureAmount || 0)} in 30-day holding)`
                  : undefined
              }
            />

            <div>
              <label className="text-xs font-medium text-text-secondary mb-2 block">
                Payment Method
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {PAYMENT_METHODS.map((method) => (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() =>
                      setRequestForm({
                        ...requestForm,
                        method: method.id,
                        paymentDetails: {},
                      })
                    }
                    className={cn(
                      "px-3 py-2 rounded-lg text-xs font-medium transition-colors border text-center",
                      requestForm.method === method.id
                        ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                        : "text-text-muted border-border-subtle hover:border-border-medium"
                    )}
                  >
                    {method.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Payment Details Fields */}
            {selectedMethod && (
              <div className="space-y-3 pt-2 border-t border-border-subtle">
                <p className="text-xs font-medium text-text-secondary">
                  Payment Details — {selectedMethod.label}
                </p>
                {selectedMethod.fields.map((field) => (
                  <Input
                    key={field}
                    label={FIELD_LABELS[field]}
                    value={requestForm.paymentDetails[field] || ""}
                    onChange={(e) => handleFieldChange(field, e.target.value)}
                    placeholder={`Enter ${FIELD_LABELS[field].toLowerCase()}`}
                  />
                ))}
              </div>
            )}

            <div className="flex gap-2 justify-end pt-2">
              <Button variant="ghost" onClick={() => setShowRequest(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleSubmitRequest} 
                loading={submitting}
                disabled={!balance || balance.availableBalance <= 0}
              >
                Submit Request
              </Button>
            </div>
          </div>
        </Card>
      )}

      {/* Withdrawals List */}
      <div>
        <h3 className="text-sm font-bold text-text-primary mb-3">Withdrawal History</h3>
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-6 w-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : withdrawals.length > 0 ? (
          <div className="space-y-2">
            {withdrawals.map((w: any) => {
              const StatusIcon = STATUS_ICONS[w.status] || Clock;
              return (
                <Card key={w.id} className="hover:border-border-medium transition-colors">
                  <div className="flex items-center gap-4 p-4">
                    <div
                      className={cn(
                        "h-10 w-10 rounded-lg flex items-center justify-center flex-shrink-0",
                        STATUS_COLORS[w.status]
                      )}
                    >
                      <StatusIcon
                        className={cn(
                          "h-5 w-5",
                          w.status === "PROCESSING" && "animate-spin"
                        )}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-text-primary">
                          {formatCurrency(w.amount)}
                        </p>
                        <Badge className="text-[10px] bg-surface-hover text-text-secondary border-border-subtle">
                          {w.method}
                        </Badge>
                        <Badge className={cn("text-[10px]", STATUS_COLORS[w.status])}>
                          {STATUS_LABELS[w.status]}
                        </Badge>
                      </div>
                      <p className="text-xs text-text-muted mt-0.5">
                        {formatRelativeTime(w.createdAt)}
                        {isAdmin && w.contractor?.name && (
                          <span className="ml-2">• {w.contractor.name} ({w.contractor.email})</span>
                        )}
                        {w.rejectionReason && (
                          <span className="ml-2 text-red-400">• Reason: {w.rejectionReason}</span>
                        )}
                      </p>
                    </div>

                    {/* Admin Action Buttons */}
                    {isAdmin && w.status === "PENDING" && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleAdminUpdate(w.id, "PROCESSING")}
                        >
                          Process
                        </Button>
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => handleAdminUpdate(w.id, "COMPLETED")}
                        >
                          Complete
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-400 hover:text-red-300"
                          onClick={() => {
                            const reason = prompt("Enter rejection reason:");
                            if (reason !== null) {
                              handleAdminUpdate(w.id, "REJECTED", reason);
                            }
                          }}
                        >
                          Reject
                        </Button>
                      </div>
                    )}

                    {isAdmin && w.status === "PROCESSING" && (
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white"
                          onClick={() => handleAdminUpdate(w.id, "COMPLETED")}
                        >
                          Complete
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-400 hover:text-red-300"
                          onClick={() => {
                            const reason = prompt("Enter rejection reason:");
                            if (reason !== null) {
                              handleAdminUpdate(w.id, "REJECTED", reason);
                            }
                          }}
                        >
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card>
            <div className="p-8 text-center text-text-muted text-xs">
              No withdrawals requested yet.
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
