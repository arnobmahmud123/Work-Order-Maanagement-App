"use client";

import { useState } from "react";
import { useInvoices } from "@/hooks/use-data";
import { useSession } from "next-auth/react";
import { Button, Card, CardHeader, CardTitle, Badge } from "@/components/ui";
import {
  Receipt,
  Building2,
  Plus,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import {
  INVOICE_STATUS_LABELS,
  formatDate,
  formatCurrency,
  cn,
} from "@/lib/utils";

export default function InvoicesPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            <Receipt className="inline h-6 w-6 mr-2 text-cyan-400" />
            Invoices
          </h1>
          <p className="text-text-muted mt-1">
            Manage invoices, track payments, and analyze profitability.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {["ADMIN", "COORDINATOR"].includes(role) && (
            <Link href="/dashboard/invoices/new">
              <Button>
                <Plus className="h-4 w-4" />
                New Invoice
              </Button>
            </Link>
          )}
        </div>
      </div>

      <InvoiceList />
    </div>
  );
}

function InvoiceList() {
  const { data: invoices, isLoading } = useInvoices();
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const filtered = invoices?.filter((inv: any) => {
    if (statusFilter && inv.status !== statusFilter) return false;
    if (typeFilter === "client" && inv.type === "CONTRACTOR") return false;
    if (typeFilter === "contractor" && inv.type !== "CONTRACTOR") return false;
    return true;
  });

  return (
    <>
      {/* Type filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setTypeFilter("")}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-lg border",
            !typeFilter
              ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-indigo-600"
              : "bg-surface-hover text-text-dim border-border-medium hover:bg-surface-hover"
          )}
        >
          All Types
        </button>
        <button
          onClick={() => setTypeFilter("client")}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-lg border",
            typeFilter === "client"
              ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-cyan-600"
              : "bg-surface-hover text-text-dim border-border-medium hover:bg-surface-hover"
          )}
        >
          Client
        </button>
        <button
          onClick={() => setTypeFilter("contractor")}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-lg border",
            typeFilter === "contractor"
              ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white border-emerald-600"
              : "bg-surface-hover text-text-dim border-border-medium hover:bg-surface-hover"
          )}
        >
          Contractor
        </button>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setStatusFilter("")}
          className={cn(
            "px-3 py-1.5 text-xs font-medium rounded-lg border",
            !statusFilter
              ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-indigo-600"
              : "bg-surface-hover text-text-dim border-border-medium hover:bg-surface-hover"
          )}
        >
          All Statuses
        </button>
        {Object.entries(INVOICE_STATUS_LABELS).map(([val, label]) => (
          <button
            key={val}
            onClick={() => setStatusFilter(val)}
            className={cn(
              "px-3 py-1.5 text-xs font-medium rounded-lg border",
              statusFilter === val
                ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white border-indigo-600"
                : "bg-surface-hover text-text-dim border-border-medium hover:bg-surface-hover"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Invoice list */}
      <Card padding={false}>
        {isLoading ? (
          <div className="p-8 text-center text-text-muted">Loading...</div>
        ) : filtered?.length === 0 ? (
          <div className="p-8 text-center text-text-muted">
            <Receipt className="h-12 w-12 mx-auto mb-3 text-text-dim" />
            <p className="font-medium">No invoices found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filtered?.map((inv: any) => (
              <Link
                key={inv.id}
                href={`/dashboard/invoices/${inv.id}`}
                className="flex items-center gap-4 p-4 hover:bg-surface-hover transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-semibold text-text-primary">
                      #{inv.invoiceNumber}
                    </span>
                    <InvoiceStatusBadge status={inv.status} />
                    <Badge className={cn(
                      "text-xs",
                      inv.type === "CONTRACTOR"
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-cyan-50 text-cyan-700"
                    )}>
                      {inv.type === "CONTRACTOR" ? "Contractor" : "Client"}
                    </Badge>
                    {inv.noCharge && (
                      <Badge className="bg-surface-hover text-text-muted text-xs">
                        No Charge
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-text-muted">
                    <span>{inv.client?.name}</span>
                    {inv.workOrder && (
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {inv.workOrder.title}
                      </span>
                    )}
                    <span>{formatDate(inv.createdAt)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-text-primary">
                    {formatCurrency(inv.total)}
                  </p>
                  <p className="text-xs text-text-muted">
                    {inv.items?.length || 0} items
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-text-muted" />
              </Link>
            ))}
          </div>
        )}
      </Card>
    </>
  );
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    DRAFT: "bg-surface-hover text-text-dim",
    SENT: "bg-blue-100 text-blue-700",
    PAID: "bg-green-100 text-green-700",
    OVERDUE: "bg-red-100 text-red-700",
    CANCELLED: "bg-surface-hover text-text-muted",
  };

  return (
    <Badge className={cn("text-xs", colors[status] || "bg-surface-hover text-text-dim")}>
      {INVOICE_STATUS_LABELS[status] || status}
    </Badge>
  );
}
