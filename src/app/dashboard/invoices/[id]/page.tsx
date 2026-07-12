"use client";

import { use, useState, useEffect } from "react";
import { useInvoice } from "@/hooks/use-data";
import { useSession } from "next-auth/react";
import { Badge, Button, Card, CardHeader, CardTitle } from "@/components/ui";
import {
  ArrowLeft,
  Printer,
  Send,
  DollarSign,
  TrendingUp,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Wrench,
  Package,
  Truck,
  FileText,
  Receipt,
  User,
  Building2,
} from "lucide-react";
import Link from "next/link";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  INVOICE_STATUS_LABELS,
  cn,
} from "@/lib/utils";
import toast from "react-hot-toast";

const statusColors: Record<string, string> = {
  DRAFT: "bg-surface-hover text-text-dim",
  SENT: "bg-blue-100 text-blue-700",
  PAID: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-700",
  CANCELLED: "bg-surface-hover text-text-muted",
};

export default function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { data: invoice, isLoading } = useInvoice(id);
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;

  const pairedInvoice = invoice?.pairedInvoice;
  const hasBoth = !!pairedInvoice;

  // Default tab: show the current invoice's type
  const [activeTab, setActiveTab] = useState<"client" | "contractor">("client");

  useEffect(() => {
    if (invoice?.type) {
      setActiveTab(invoice.type === "CLIENT" ? "client" : "contractor");
    }
  }, [invoice?.type]);

  // Resolve which invoice to display
  const isClientTab = activeTab === "client";
  const currentIsClient = invoice?.type === "CLIENT";
  const displayInvoice = hasBoth
    ? isClientTab
      ? currentIsClient ? invoice : pairedInvoice
      : currentIsClient ? pairedInvoice : invoice
    : invoice;

  // The "other" invoice for linking
  const otherInvoice = hasBoth
    ? isClientTab
      ? currentIsClient ? pairedInvoice : invoice
      : currentIsClient ? invoice : pairedInvoice
    : null;

  if (isLoading) {
    return <div className="p-8 text-center text-text-muted">Loading...</div>;
  }

  if (!invoice) {
    return <div className="p-8 text-center text-text-muted">Invoice not found</div>;
  }

  async function handleStatusChange(invId: string, status: string) {
    try {
      const res = await fetch(`/api/invoices/${invId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      toast.success(`Invoice marked as ${INVOICE_STATUS_LABELS[status]}`);
      window.location.reload();
    } catch {
      toast.error("Failed to update invoice status");
    }
  }

  // Client invoice number & contractor invoice number for tab labels
  const clientInv = currentIsClient ? invoice : pairedInvoice;
  const contractorInv = currentIsClient ? pairedInvoice : invoice;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/invoices" className="p-1 hover:bg-surface-hover rounded-lg">
            <ArrowLeft className="h-5 w-5 text-text-muted" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">
              <Receipt className="inline h-6 w-6 mr-2 text-cyan-400" />
              Invoice
            </h1>
            {invoice.workOrder?.title && (
              <p className="text-sm text-text-muted mt-1">{invoice.workOrder.title}</p>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="h-4 w-4" />
            Print
          </Button>
        </div>
      </div>

      {/* Inline Tab Switcher */}
      <div className="flex gap-1 p-1 bg-surface-hover rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("client")}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all",
            isClientTab
              ? "bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/25"
              : "text-text-muted hover:text-text-primary hover:bg-surface-hover"
          )}
        >
          <Building2 className="h-4 w-4" />
          Client Invoice
          {clientInv && (
            <span className="text-[10px] opacity-70 ml-1">#{clientInv.invoiceNumber}</span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("contractor")}
          className={cn(
            "flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold transition-all",
            !isClientTab
              ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25"
              : "text-text-muted hover:text-text-primary hover:bg-surface-hover"
          )}
        >
          <User className="h-4 w-4" />
          Contractor Invoice
          {contractorInv && (
            <span className="text-[10px] opacity-70 ml-1">#{contractorInv.invoiceNumber}</span>
          )}
        </button>
      </div>

      {/* Invoice Detail */}
      {displayInvoice ? (
        <InvoiceDetailView
          invoice={displayInvoice}
          isClient={isClientTab}
          role={role}
          onStatusChange={handleStatusChange}
        />
      ) : (
        <Card>
          <div className="p-12 text-center">
            <Receipt className="h-16 w-16 mx-auto mb-4 text-text-dim" />
            <h3 className="text-lg font-semibold text-text-primary mb-2">
              No {activeTab} invoice yet
            </h3>
            <p className="text-sm text-text-muted max-w-md mx-auto">
              This work order doesn&apos;t have a {activeTab} invoice. Create one from the work order&apos;s invoice tab.
            </p>
            {invoice.workOrder && (
              <Link href={`/dashboard/work-orders/${invoice.workOrder.id}?tab=invoices`}>
                <Button className="mt-6" variant="outline" size="sm">
                  <Wrench className="h-4 w-4" />
                  Go to Work Order
                </Button>
              </Link>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}

/* ─── Invoice Detail View ─── */

function InvoiceDetailView({
  invoice,
  isClient,
  role,
  onStatusChange,
}: {
  invoice: any;
  isClient: boolean;
  role: string;
  onStatusChange: (id: string, status: string) => void;
}) {
  // Categorize items
  const categorizedItems = (invoice.items || []).map((item: any) => {
    const desc = (item.taskName || item.description || "").toLowerCase();
    let category = "other";
    let icon = FileText;
    if (desc.includes("labor") || desc.includes("hour") || desc.includes("work")) {
      category = "labor";
      icon = Wrench;
    } else if (
      desc.includes("material") ||
      desc.includes("plywood") ||
      desc.includes("supply") ||
      desc.includes("hardware")
    ) {
      category = "materials";
      icon = Package;
    } else if (desc.includes("trip") || desc.includes("mobilization")) {
      category = "trip";
      icon = Truck;
    }
    return { ...item, category, icon };
  });

  const laborTotal = categorizedItems
    .filter((i: any) => i.category === "labor")
    .reduce((sum: number, i: any) => sum + i.amount, 0);
  const materialTotal = categorizedItems
    .filter((i: any) => i.category === "materials")
    .reduce((sum: number, i: any) => sum + i.amount, 0);
  const otherTotal = categorizedItems
    .filter((i: any) => !["labor", "materials"].includes(i.category))
    .reduce((sum: number, i: any) => sum + i.amount, 0);

  return (
    <div className="space-y-6">
      {/* Invoice Header Bar */}
      <div className={cn(
        "rounded-2xl p-6 border-2",
        !isClient
          ? "bg-gradient-to-r from-emerald-50 to-teal-50 border-emerald-200"
          : "bg-gradient-to-r from-cyan-50 to-blue-50 border-cyan-200"
      )}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={cn(
              "h-12 w-12 rounded-xl flex items-center justify-center",
              !isClient ? "bg-emerald-100" : "bg-cyan-100"
            )}>
              {!isClient ? (
                <User className="h-6 w-6 text-emerald-600" />
              ) : (
                <Building2 className="h-6 w-6 text-cyan-600" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="text-xl font-bold text-text-primary">{invoice.invoiceNumber}</h2>
                <Badge className={cn(statusColors[invoice.status])}>
                  {INVOICE_STATUS_LABELS[invoice.status]}
                </Badge>
                <Badge className={cn(
                  "text-xs",
                  !isClient
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-cyan-50 text-cyan-700 border border-cyan-200"
                )}>
                  {!isClient ? "Contractor" : "Client"}
                </Badge>
                {invoice.noCharge && (
                  <Badge className="bg-yellow-100 text-yellow-700">No Charge</Badge>
                )}
              </div>
              <p className="text-sm text-text-muted mt-1">
                Created {formatDateTime(invoice.createdAt)}
                {invoice.dueDate && ` · Due ${formatDate(invoice.dueDate)}`}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            {invoice.workOrder && (
              <Link href={`/dashboard/work-orders/${invoice.workOrder.id}?tab=invoices`}>
                <Button variant="outline" size="sm">
                  <Wrench className="h-4 w-4" />
                  Edit in Work Order
                </Button>
              </Link>
            )}
            {invoice.status === "DRAFT" && ["ADMIN", "COORDINATOR"].includes(role) && (
              <Button size="sm" onClick={() => onStatusChange(invoice.id, "SENT")}>
                <Send className="h-4 w-4" />
                Send
              </Button>
            )}
            {invoice.status === "SENT" && ["ADMIN", "COORDINATOR"].includes(role) && (
              <Button size="sm" onClick={() => onStatusChange(invoice.id, "PAID")}>
                <CheckCircle2 className="h-4 w-4" />
                Mark Paid
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Bill To + Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Bill To</CardTitle>
          </CardHeader>
          <div className="space-y-1">
            <p className="text-sm font-medium text-text-primary">{invoice.client?.name}</p>
            <p className="text-sm text-text-muted">{invoice.client?.email}</p>
            {invoice.client?.company && (
              <p className="text-sm text-text-muted">{invoice.client.company}</p>
            )}
            {invoice.client?.phone && (
              <p className="text-sm text-text-muted">{invoice.client.phone}</p>
            )}
          </div>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Details</CardTitle>
          </CardHeader>
          <div className="space-y-2">
            {invoice.workOrder && (
              <div>
                <p className="text-xs text-text-muted">Work Order</p>
                <Link
                  href={`/dashboard/work-orders/${invoice.workOrder.id}`}
                  className={cn(
                    "text-sm hover:underline",
                    !isClient ? "text-emerald-600" : "text-cyan-600"
                  )}
                >
                  {invoice.workOrder.title}
                </Link>
                <p className="text-xs text-text-muted">{invoice.workOrder.address}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-text-muted">Created</p>
              <p className="text-sm">{formatDateTime(invoice.createdAt)}</p>
            </div>
            {invoice.dueDate && (
              <div>
                <p className="text-xs text-text-muted">Due Date</p>
                <p className="text-sm">{formatDate(invoice.dueDate)}</p>
              </div>
            )}
            {invoice.paidAt && (
              <div>
                <p className="text-xs text-text-muted">Paid</p>
                <p className="text-sm text-green-600">{formatDateTime(invoice.paidAt)}</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Cost Breakdown Summary */}
      <div className="grid grid-cols-3 gap-4">
        <Card padding={false}>
          <div className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-50">
              <Wrench className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">{formatCurrency(laborTotal)}</p>
              <p className="text-xs text-text-muted">Labor</p>
            </div>
          </div>
        </Card>
        <Card padding={false}>
          <div className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-50">
              <Package className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">{formatCurrency(materialTotal)}</p>
              <p className="text-xs text-text-muted">Materials</p>
            </div>
          </div>
        </Card>
        <Card padding={false}>
          <div className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-surface-hover">
              <DollarSign className="h-5 w-5 text-text-muted" />
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">{formatCurrency(otherTotal)}</p>
              <p className="text-xs text-text-muted">Other</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Line Items */}
      <Card padding={false}>
        <table className="w-full">
          <thead>
            <tr className="border-b border-border-subtle bg-surface-hover">
              <th className="text-left px-6 py-3 text-xs font-semibold text-text-muted uppercase">
                Task / Description
              </th>
              <th className="text-center px-6 py-3 text-xs font-semibold text-text-muted uppercase">
                Category
              </th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-text-muted uppercase">
                Qty
              </th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-text-muted uppercase">
                Unit Price
              </th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-text-muted uppercase">
                Disc %
              </th>
              <th className="text-right px-6 py-3 text-xs font-semibold text-text-muted uppercase">
                Amount
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {categorizedItems.map((item: any) => (
              <tr key={item.id}>
                <td className="px-6 py-4 text-sm text-text-primary">
                  <div className="font-medium">{item.taskName || item.description || "—"}</div>
                  {item.description && item.taskName && (
                    <div className="text-xs text-text-muted mt-0.5">{item.description}</div>
                  )}
                </td>
                <td className="px-6 py-4 text-center">
                  <Badge
                    className={cn(
                      "text-[10px]",
                      item.category === "labor"
                        ? "bg-blue-50 text-blue-700"
                        : item.category === "materials"
                          ? "bg-amber-50 text-amber-700"
                          : "bg-surface-hover text-text-muted"
                    )}
                  >
                    {item.category}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-sm text-text-dim text-right">{item.quantity}</td>
                <td className="px-6 py-4 text-sm text-text-dim text-right">
                  {formatCurrency(item.unitPrice)}
                </td>
                <td className="px-6 py-4 text-sm text-text-dim text-right">
                  {item.discountPercent > 0 ? `${item.discountPercent}%` : "—"}
                </td>
                <td className="px-6 py-4 text-sm font-medium text-text-primary text-right">
                  {formatCurrency(item.amount)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-border-subtle">
              <td colSpan={5} className="px-6 py-3 text-sm text-text-muted text-right">
                Subtotal
              </td>
              <td className="px-6 py-3 text-sm font-medium text-text-primary text-right">
                {formatCurrency(invoice.subtotal)}
              </td>
            </tr>
            {(invoice.subtotal - (invoice.noCharge ? 0 : invoice.total) + (invoice.tax || 0)) > 0.01 && (
              <tr>
                <td colSpan={5} className="px-6 py-3 text-sm text-text-muted text-right">
                  Discount
                </td>
                <td className="px-6 py-3 text-sm font-medium text-amber-600 text-right">
                  -{formatCurrency(invoice.subtotal - (invoice.noCharge ? 0 : invoice.total) + (invoice.tax || 0))}
                </td>
              </tr>
            )}
            {invoice.tax > 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-3 text-sm text-text-muted text-right">
                  Tax
                </td>
                <td className="px-6 py-3 text-sm text-text-primary text-right">
                  {formatCurrency(invoice.tax)}
                </td>
              </tr>
            )}
            <tr className="border-t-2 border-border-medium">
              <td colSpan={5} className="px-6 py-4 text-base font-semibold text-text-primary text-right">
                Total
              </td>
              <td className="px-6 py-4 text-base font-bold text-text-primary text-right">
                {invoice.noCharge ? "No Charge" : formatCurrency(invoice.total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </Card>

      {/* Status actions for admin */}
      {["ADMIN", "COORDINATOR"].includes(role) && (
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <div className="flex flex-wrap gap-2">
            {invoice.status === "DRAFT" && (
              <Button variant="outline" size="sm" onClick={() => onStatusChange(invoice.id, "SENT")}>
                <Send className="h-4 w-4" />
                Mark as Sent
              </Button>
            )}
            {(invoice.status === "DRAFT" || invoice.status === "SENT") && (
              <Button variant="outline" size="sm" onClick={() => onStatusChange(invoice.id, "PAID")}>
                <CheckCircle2 className="h-4 w-4" />
                Mark as Paid
              </Button>
            )}
            {invoice.status !== "OVERDUE" && invoice.status !== "PAID" && (
              <Button variant="outline" size="sm" onClick={() => onStatusChange(invoice.id, "OVERDUE")}>
                <AlertTriangle className="h-4 w-4" />
                Mark as Overdue
              </Button>
            )}
            {invoice.status !== "CANCELLED" && invoice.status !== "PAID" && (
              <Button variant="danger" size="sm" onClick={() => onStatusChange(invoice.id, "CANCELLED")}>
                Cancel Invoice
              </Button>
            )}
          </div>
        </Card>
      )}

      {invoice.notes && (
        <Card>
          <CardHeader>
            <CardTitle>Notes</CardTitle>
          </CardHeader>
          <p className="text-sm text-text-dim whitespace-pre-wrap">{invoice.notes}</p>
        </Card>
      )}
    </div>
  );
}
