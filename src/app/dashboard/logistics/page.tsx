"use client";

import { useState, useEffect } from "react";
import { useLogistics, useCreatePurchaseOrder } from "@/hooks/use-data";
import { useSession } from "next-auth/react";
import { Button, Card, CardHeader, CardTitle, Badge, Modal } from "@/components/ui";
import {
  Truck,
  Package,
  Users,
  ClipboardList,
  AlertTriangle,
  DollarSign,
  Clock,
  CheckCircle2,
  Plus,
  Search,
  MapPin,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Box,
  Edit3,
  Trash2,
  X,
  Save,
  RefreshCw,
  ChevronDown,
  ArrowUpDown,
  ExternalLink,
  BarChart3,
  PackageCheck,
  CircleDot,
  Timer,
  ArrowRight,
  Bell,
  Zap,
} from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";
import toast from "react-hot-toast";

export default function LogisticsPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;

  if (role === "CONTRACTOR") {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center">
          <Truck className="h-16 w-16 text-text-dim mx-auto mb-4" />
          <h2 className="text-xl font-bold text-text-primary mb-2">Access Restricted</h2>
          <p className="text-text-muted">Contractors do not have access to logistics.</p>
        </div>
      </div>
    );
  }

  const [view, setView] = useState<"overview" | "materials" | "suppliers" | "orders" | "tracking" | "movements">("overview");
  const [refreshKey, setRefreshKey] = useState(0);

  function refresh() {
    setRefreshKey((k) => k + 1);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">
            <Truck className="inline h-6 w-6 mr-2 text-cyan-400" />
            Logistics & Supply Chain
          </h1>
          <p className="text-text-muted mt-1">
            Material inventory, suppliers, purchase orders, and delivery tracking.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={refresh}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
          <div className="flex rounded-lg border border-border-medium overflow-hidden">
            {(["overview", "materials", "suppliers", "orders", "tracking", "movements"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "px-3 py-1.5 text-xs font-medium capitalize",
                  view === v
                    ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-lg shadow-cyan-500/10"
                    : "bg-surface text-text-secondary hover:bg-surface-hover"
                )}
              >
                {v === "tracking" ? "deliveries" : v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {view === "overview" && <OverviewView key={`overview-${refreshKey}`} />}
      {view === "materials" && <MaterialsView key={`materials-${refreshKey}`} onRefresh={refresh} />}
      {view === "suppliers" && <SuppliersView key={`suppliers-${refreshKey}`} onRefresh={refresh} />}
      {view === "orders" && <OrdersView key={`orders-${refreshKey}`} onRefresh={refresh} />}
      {view === "tracking" && <TrackingView key={`tracking-${refreshKey}`} onRefresh={refresh} />}
      {view === "movements" && <StockMovementsView key={`movements-${refreshKey}`} onRefresh={refresh} />}
    </div>
  );
}

// ─── Overview ────────────────────────────────────────────────────────────────

function OverviewView() {
  const { data, isLoading } = useLogistics("overview");
  const [quickAdd, setQuickAdd] = useState<"material" | "supplier" | "order" | null>(null);

  if (isLoading) return <div className="p-8 text-center text-text-muted">Loading...</div>;
  if (!data) return null;

  const { overview, lowStockItems, categoryBreakdown, recentOrders } = data;

  // Mock trend data
  const trends: Record<string, { value: number; direction: "up" | "down" | "flat"; label: string }> = {
    "Materials": { value: 8, direction: "up", label: "+8 this month" },
    "Low Stock": { value: overview.lowStockCount, direction: overview.lowStockCount > 3 ? "up" : "down", label: overview.lowStockCount > 3 ? "Needs attention" : "Under control" },
    "Inventory Value": { value: 12, direction: "up", label: "+12% vs last month" },
    "Suppliers": { value: 2, direction: "up", label: "+2 new this quarter" },
    "Pending Orders": { value: overview.pendingOrders, direction: overview.pendingOrders > 5 ? "up" : "flat", label: overview.pendingOrders > 5 ? "Higher than usual" : "On track" },
    "Order Value": { value: 5, direction: "down", label: "-5% vs last month" },
  };

  return (
    <div className="space-y-6">
      {/* Quick-Add Actions */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-medium text-text-muted mr-1">Quick Add:</span>
        <Button size="sm" variant="outline" onClick={() => setQuickAdd("material")}>
          <Plus className="h-3 w-3 mr-1" /> Material
        </Button>
        <Button size="sm" variant="outline" onClick={() => setQuickAdd("supplier")}>
          <Plus className="h-3 w-3 mr-1" /> Supplier
        </Button>
        <Button size="sm" variant="outline" onClick={() => setQuickAdd("order")}>
          <Plus className="h-3 w-3 mr-1" /> Purchase Order
        </Button>
      </div>

      {/* Summary cards with trend indicators */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {[
          { label: "Materials", value: overview.totalMaterials, icon: Package, color: "text-blue-500 bg-blue-500/10", trend: trends["Materials"] },
          { label: "Low Stock", value: overview.lowStockCount, icon: AlertTriangle, color: overview.lowStockCount > 0 ? "text-rose-500 bg-rose-500/10" : "text-text-muted bg-surface-hover", trend: trends["Low Stock"] },
          { label: "Inventory Value", value: formatCurrency(overview.totalInventoryValue), icon: DollarSign, color: "text-emerald-500 bg-emerald-500/10", trend: trends["Inventory Value"] },
          { label: "Suppliers", value: overview.supplierCount, icon: Users, color: "text-violet-500 bg-violet-500/10", trend: trends["Suppliers"] },
          { label: "Pending Orders", value: overview.pendingOrders, icon: ClipboardList, color: "text-amber-500 bg-amber-500/10", trend: trends["Pending Orders"] },
          { label: "Order Value", value: formatCurrency(overview.pendingOrderValue), icon: ShoppingCart, color: "text-cyan-400 bg-cyan-400/10", trend: trends["Order Value"] },
        ].map((m) => (
          <Card key={m.label} padding={false}>
            <div className="p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className={cn("p-2 rounded-lg", m.color)}>
                  <m.icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-lg font-bold text-text-primary">{m.value}</p>
                  <p className="text-xs text-text-muted">{m.label}</p>
                </div>
              </div>
              {m.trend && (
                <div className={cn(
                  "flex items-center gap-1 text-[10px] font-medium",
                  m.trend.direction === "up" ? "text-emerald-500" : m.trend.direction === "down" ? "text-rose-500" : "text-text-muted"
                )}>
                  {m.trend.direction === "up" ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : m.trend.direction === "down" ? (
                    <TrendingDown className="h-3 w-3" />
                  ) : (
                    <ArrowRight className="h-3 w-3" />
                  )}
                  {m.trend.label}
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>

      {/* Inventory Alerts Dashboard */}
      {lowStockItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-red-600" />
              Inventory Alerts ({lowStockItems.length})
            </CardTitle>
          </CardHeader>
          <div className="divide-y divide-border-subtle">
            {lowStockItems.map((item: any) => {
              const deficit = item.minStock - item.quantity;
              const urgencyPercent = item.minStock > 0 ? Math.round((1 - item.quantity / item.minStock) * 100) : 100;
              return (
                <div key={item.id} className="flex items-center gap-3 p-3">
                  <div className="p-2 rounded-lg bg-rose-500/10">
                    <TrendingDown className="h-4 w-4 text-rose-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary">{item.name}</p>
                    <p className="text-xs text-text-muted">{item.category} • {item.supplier?.name || "No supplier"}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-rose-500">{item.quantity} {item.unit}s</p>
                    <p className="text-xs text-text-muted">Min: {item.minStock}</p>
                  </div>
                  <div className="w-16">
                    <div className="h-1.5 bg-surface-hover rounded-full overflow-hidden">
                      <div
                        className={cn("h-full rounded-full", urgencyPercent > 80 ? "bg-rose-500" : urgencyPercent > 50 ? "bg-amber-500" : "bg-emerald-500")}
                        style={{ width: `${Math.min(100, urgencyPercent)}%` }}
                      />
                    </div>
                    <p className="text-[9px] text-rose-500 font-medium mt-0.5 text-center">-{urgencyPercent}%</p>
                  </div>
                  <div className="text-right">
                    <Button size="xs" variant="outline" className="text-[10px]">
                      <Zap className="h-3 w-3 mr-1" />
                      Reorder {deficit}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* Category breakdown + Recent orders */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader><CardTitle>Inventory by Category</CardTitle></CardHeader>
          <div className="space-y-3">
            {Object.entries(categoryBreakdown)
              .sort(([, a], [, b]) => (b as any).value - (a as any).value)
              .map(([cat, data]: [string, any]) => (
                <div key={cat} className="flex items-center gap-3">
                  <span className="text-sm text-text-dim w-32 truncate">{cat}</span>
                  <div className="flex-1 h-2 bg-surface-hover rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-500/20 rounded-full"
                      style={{ width: `${(data.value / Math.max(...Object.values(categoryBreakdown).map((v: any) => v.value))) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-text-primary w-20 text-right">{formatCurrency(data.value)}</span>
                </div>
              ))}
          </div>
        </Card>

        <Card>
          <CardHeader><CardTitle>Recent Purchase Orders</CardTitle></CardHeader>
          <div className="divide-y divide-border-subtle">
            {recentOrders.length === 0 && (
              <p className="p-4 text-sm text-text-muted text-center">No purchase orders yet</p>
            )}
            {recentOrders.map((order: any) => (
              <div key={order.id} className="flex items-center gap-3 p-3">
                <OrderStatusIcon status={order.status} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-text-primary">{order.orderNumber}</p>
                  <p className="text-xs text-text-muted">{order.supplier?.name} • {order.items.length} items</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-text-primary">{formatCurrency(order.total)}</p>
                  <OrderStatusBadge status={order.status} />
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Quick-Add Modals */}
      {quickAdd === "material" && (
        <MaterialForm
          suppliers={[]}
          onClose={() => setQuickAdd(null)}
          onSaved={() => setQuickAdd(null)}
        />
      )}
      {quickAdd === "supplier" && (
        <SupplierForm
          onClose={() => setQuickAdd(null)}
          onSaved={() => setQuickAdd(null)}
        />
      )}
      {quickAdd === "order" && (
        <PurchaseOrderForm
          onClose={() => setQuickAdd(null)}
          onSaved={() => setQuickAdd(null)}
        />
      )}
    </div>
  );
}

// ─── Materials ───────────────────────────────────────────────────────────────

function MaterialsView({ onRefresh }: { onRefresh: () => void }) {
  const [category, setCategory] = useState("");
  const [lowStock, setLowStock] = useState(false);
  const [search, setSearch] = useState("");
  const { data, isLoading, refetch } = useLogistics("materials");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [quickStock, setQuickStock] = useState<{ material: any; action: "use" | "receive" } | null>(null);

  // Fetch suppliers for the form dropdown
  useEffect(() => {
    fetch("/api/logistics?view=suppliers").then(r => r.json()).then(d => setSuppliers(d.suppliers || [])).catch(() => {});
  }, []);

  const materials = data?.materials || [];
  const filtered = materials.filter((m: any) => {
    if (category && m.category !== category) return false;
    if (lowStock && m.quantity > m.minStock) return false;
    if (search && !m.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const categories: string[] = [...new Set(materials.map((m: any) => m.category))] as string[];

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete material "${name}"?`)) return;
    try {
      const res = await fetch("/api/logistics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete-material", materialId: id }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success("Material deleted");
      refetch();
      onRefresh();
    } catch {
      toast.error("Delete failed");
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted" />
          <input
            type="text"
            placeholder="Search materials..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-border-medium rounded-lg text-sm bg-surface text-text-primary focus:border-cyan-500/50 focus:outline-none"
          />
        </div>
        <select value={category} onChange={(e) => setCategory(e.target.value)}
          className="px-3 py-2 border border-border-medium rounded-lg text-sm bg-surface text-text-secondary">
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-text-secondary">
          <input type="checkbox" checked={lowStock} onChange={(e) => setLowStock(e.target.checked)} className="rounded border-border-medium" />
          Low stock only
        </label>
        <Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Material
        </Button>
      </div>

      {/* Table */}
      <Card padding={false}>
        <div className="overflow-x-auto">
          <div className="grid grid-cols-12 gap-2 px-4 py-3 bg-surface-hover border-b border-border-subtle text-[10px] font-bold text-text-muted uppercase tracking-wider min-w-[800px]">
            <div className="col-span-3">Material</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-1 text-center">Stock</div>
            <div className="col-span-1 text-center">Min</div>
            <div className="col-span-1 text-right">Unit Cost</div>
            <div className="col-span-1 text-right">Value</div>
            <div className="col-span-2">Supplier</div>
            <div className="col-span-1 text-center">Actions</div>
          </div>
          <div className="divide-y divide-border-subtle min-w-[800px]">
            {isLoading ? (
              <div className="col-span-12 p-8 text-center text-text-muted">Loading...</div>
            ) : filtered.length === 0 ? (
              <div className="col-span-12 p-8 text-center text-text-muted">No materials found</div>
            ) : (
              filtered.map((mat: any) => {
                const isLow = mat.quantity <= mat.minStock;
                return (
                  <div key={mat.id} className={cn("grid grid-cols-12 gap-2 px-4 py-3 items-center text-sm", isLow && "bg-rose-500/[0.03]")}>
                    <div className="col-span-3 font-medium text-text-primary truncate">{mat.name}</div>
                    <div className="col-span-2"><Badge className="text-[10px] bg-surface-hover text-text-muted">{mat.category}</Badge></div>
                    <div className={cn("col-span-1 text-center font-bold", isLow ? "text-rose-500" : "text-text-primary")}>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => setQuickStock({ material: mat, action: "use" })}
                          className="p-0.5 rounded hover:bg-rose-500/10 text-text-dim hover:text-rose-500 transition-colors"
                          title="Deduct stock"
                        >
                          <TrendingDown className="h-3 w-3" />
                        </button>
                        <span>{mat.quantity}</span>
                        <button
                          onClick={() => setQuickStock({ material: mat, action: "receive" })}
                          className="p-0.5 rounded hover:bg-emerald-500/10 text-text-dim hover:text-emerald-500 transition-colors"
                          title="Add stock"
                        >
                          <TrendingUp className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                    <div className="col-span-1 text-center text-text-muted">{mat.minStock}</div>
                    <div className="col-span-1 text-right text-text-dim">{formatCurrency(mat.unitCost)}</div>
                    <div className="col-span-1 text-right font-medium text-text-primary">{formatCurrency(mat.quantity * mat.unitCost)}</div>
                    <div className="col-span-2 text-xs text-text-muted truncate">{mat.supplier || "—"}</div>
                    <div className="col-span-1 flex items-center justify-center gap-1">
                      <button onClick={() => { setEditing(mat); setShowForm(true); }} className="p-1 rounded hover:bg-surface-hover text-text-muted hover:text-cyan-500">
                        <Edit3 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => handleDelete(mat.id, mat.name)} className="p-1 rounded hover:bg-surface-hover text-text-muted hover:text-rose-500">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </Card>

      {/* Add/Edit Modal */}
      {showForm && (
        <MaterialForm
          material={editing}
          suppliers={suppliers}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); refetch(); onRefresh(); }}
        />
      )}

      {/* Quick Stock Action Modal */}
      {quickStock && (
        <QuickStockModal
          material={quickStock.material}
          action={quickStock.action}
          onClose={() => setQuickStock(null)}
          onSaved={() => { setQuickStock(null); refetch(); onRefresh(); }}
        />
      )}
    </div>
  );
}

function MaterialForm({ material, suppliers, onClose, onSaved }: { material?: any; suppliers: any[]; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: material?.name || "",
    category: material?.category || "",
    unit: material?.unit || "each",
    unitCost: material?.unitCost?.toString() || "",
    quantity: material?.quantity?.toString() || "0",
    minStock: material?.minStock?.toString() || "0",
    supplierId: material?.supplierId || "",
    location: material?.location || "",
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const action = material ? "update-material" : "create-material";
      const body: any = { ...form, unitCost: parseFloat(form.unitCost), quantity: parseFloat(form.quantity), minStock: parseFloat(form.minStock) };
      if (material) body.materialId = material.id;

      const res = await fetch("/api/logistics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed");
      }
      toast.success(material ? "Material updated" : "Material created");
      onSaved();
    } catch (err: any) {
      toast.error(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[2147483646] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface border border-border-medium rounded-2xl shadow-2xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary">{material ? "Edit Material" : "Add Material"}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-hover text-text-muted"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-text-muted mb-1 block">Name *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
              className="w-full px-3 py-2 border border-border-subtle rounded-lg text-sm bg-surface-hover text-text-primary focus:border-cyan-500/50 focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-text-muted mb-1 block">Category *</label>
              <input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} required placeholder="e.g. Hardware, Board-Up"
                className="w-full px-3 py-2 border border-border-subtle rounded-lg text-sm bg-surface-hover text-text-primary focus:border-cyan-500/50 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-text-muted mb-1 block">Unit *</label>
              <input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} required placeholder="e.g. sheet, box, gallon"
                className="w-full px-3 py-2 border border-border-subtle rounded-lg text-sm bg-surface-hover text-text-primary focus:border-cyan-500/50 focus:outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-text-muted mb-1 block">Unit Cost *</label>
              <input type="number" step="0.01" min="0" value={form.unitCost} onChange={(e) => setForm({ ...form, unitCost: e.target.value })} required
                className="w-full px-3 py-2 border border-border-subtle rounded-lg text-sm bg-surface-hover text-text-primary focus:border-cyan-500/50 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-text-muted mb-1 block">Quantity</label>
              <input type="number" step="0.01" min="0" value={form.quantity} onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                className="w-full px-3 py-2 border border-border-subtle rounded-lg text-sm bg-surface-hover text-text-primary focus:border-cyan-500/50 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-text-muted mb-1 block">Min Stock</label>
              <input type="number" step="0.01" min="0" value={form.minStock} onChange={(e) => setForm({ ...form, minStock: e.target.value })}
                className="w-full px-3 py-2 border border-border-subtle rounded-lg text-sm bg-surface-hover text-text-primary focus:border-cyan-500/50 focus:outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-text-muted mb-1 block">Supplier</label>
              <select value={form.supplierId} onChange={(e) => setForm({ ...form, supplierId: e.target.value })}
                className="w-full px-3 py-2 border border-border-subtle rounded-lg text-sm bg-surface-hover text-text-primary focus:border-cyan-500/50 focus:outline-none">
                <option value="">No supplier</option>
                {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-text-muted mb-1 block">Location</label>
              <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Warehouse A"
                className="w-full px-3 py-2 border border-border-subtle rounded-lg text-sm bg-surface-hover text-text-primary focus:border-cyan-500/50 focus:outline-none" />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" type="button" onClick={onClose}>Cancel</Button>
            <Button size="sm" type="submit" disabled={saving}>
              {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
              {material ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function QuickStockModal({ material, action, onClose, onSaved }: { material: any; action: "use" | "receive"; onClose: () => void; onSaved: () => void }) {
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  const isUse = action === "use";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!quantity || parseFloat(quantity) <= 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/logistics/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          materialId: material.id,
          quantity: parseFloat(quantity),
          reason: reason || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed");
      }
      toast.success(isUse ? "Stock deducted" : "Stock added");
      onSaved();
    } catch (err: any) {
      toast.error(err.message || "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[2147483646] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface border border-border-medium rounded-2xl shadow-2xl w-full max-w-sm p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold text-text-primary">
            {isUse ? "Deduct Stock" : "Add Stock"}
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-hover text-text-muted"><X className="h-4 w-4" /></button>
        </div>
        <div className="bg-surface-hover rounded-lg p-3 mb-3 text-sm">
          <p className="font-medium text-text-primary">{material.name}</p>
          <p className="text-xs text-text-muted">Available: {material.quantity} {material.unit}</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-text-muted mb-1 block">Quantity ({material.unit})</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              max={isUse ? material.quantity : undefined}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              autoFocus
              className="w-full px-3 py-2 border border-border-subtle rounded-lg text-sm bg-surface-hover text-text-primary focus:border-cyan-500/50 focus:outline-none"
            />
            {isUse && quantity && parseFloat(quantity) > material.quantity && (
              <p className="text-xs text-rose-500 mt-1">Exceeds available stock</p>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-text-muted mb-1 block">Reason</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={isUse ? "e.g. Used for board-up" : "e.g. Received from supplier"}
              className="w-full px-3 py-2 border border-border-subtle rounded-lg text-sm bg-surface-hover text-text-primary focus:border-cyan-500/50 focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="ghost" size="sm" type="button" onClick={onClose}>Cancel</Button>
            <Button
              size="sm"
              type="submit"
              disabled={saving || !quantity || (isUse && parseFloat(quantity) > material.quantity)}
              className={isUse ? "" : ""}
            >
              {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
              {isUse ? "Deduct" : "Add"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Suppliers ───────────────────────────────────────────────────────────────

function SuppliersView({ onRefresh }: { onRefresh: () => void }) {
  const { data, isLoading, refetch } = useLogistics("suppliers");
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const suppliers = data?.suppliers || [];

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete supplier "${name}"?`)) return;
    try {
      const res = await fetch("/api/logistics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete-supplier", supplierId: id }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed");
      toast.success("Supplier deleted");
      refetch();
      onRefresh();
    } catch (err: any) {
      toast.error(err.message || "Delete failed");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button size="sm" onClick={() => { setEditing(null); setShowForm(true); }}>
          <Plus className="h-3.5 w-3.5 mr-1" /> Add Supplier
        </Button>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-text-muted">Loading...</div>
      ) : suppliers.length === 0 ? (
        <Card><p className="p-8 text-center text-text-muted">No suppliers yet. Add one to get started.</p></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {suppliers.map((sup: any) => (
            <Card key={sup.id}>
              <div className="flex items-start gap-3 mb-3">
                <div className="h-10 w-10 rounded-lg bg-indigo-500/10 text-cyan-400 flex items-center justify-center font-bold text-sm">
                  {sup.name[0]}
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-text-primary">{sup.name}</h3>
                  <p className="text-xs text-text-muted">{sup.contact || "No contact"}</p>
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-sm font-bold text-amber-500">{sup.rating || "—"}</span>
                  {sup.rating > 0 && <span className="text-xs text-text-muted">/5</span>}
                </div>
                <div className="flex items-center gap-1 ml-2">
                  <button onClick={() => { setEditing(sup); setShowForm(true); }} className="p-1 rounded hover:bg-surface-hover text-text-muted hover:text-cyan-500">
                    <Edit3 className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => handleDelete(sup.id, sup.name)} className="p-1 rounded hover:bg-surface-hover text-text-muted hover:text-rose-500">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>

              <div className="space-y-2 text-xs">
                {sup.email && <div className="flex items-center gap-2 text-text-muted"><span className="font-medium">Email:</span>{sup.email}</div>}
                {sup.phone && <div className="flex items-center gap-2 text-text-muted"><span className="font-medium">Phone:</span>{sup.phone}</div>}
                {sup.leadTime && <div className="flex items-center gap-2 text-text-muted"><Clock className="h-3 w-3" /><span className="font-medium">Lead time:</span>{sup.leadTime}</div>}
                {sup.address && <div className="flex items-start gap-2 text-text-muted"><MapPin className="h-3 w-3 mt-0.5" />{sup.address}</div>}
              </div>

              <div className="flex flex-wrap gap-1 mt-3">
                {(sup.categories || []).map((cat: string) => (
                  <Badge key={cat} className="text-[10px] bg-cyan-500/[0.06] text-cyan-400">{cat}</Badge>
                ))}
              </div>

              <div className="flex gap-3 mt-3 pt-3 border-t border-border-subtle text-[11px] text-text-muted">
                <span>{sup.materialCount || 0} materials</span>
                <span>{sup.orderCount || 0} orders</span>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <SupplierForm
          supplier={editing}
          onClose={() => { setShowForm(false); setEditing(null); }}
          onSaved={() => { setShowForm(false); setEditing(null); refetch(); onRefresh(); }}
        />
      )}
    </div>
  );
}

function SupplierForm({ supplier, onClose, onSaved }: { supplier?: any; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: supplier?.name || "",
    contact: supplier?.contact || "",
    email: supplier?.email || "",
    phone: supplier?.phone || "",
    address: supplier?.address || "",
    categories: ((supplier?.categories as string[]) || []).join(", "),
    rating: supplier?.rating?.toString() || "0",
    leadTime: supplier?.leadTime || "",
    notes: supplier?.notes || "",
  });
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const action = supplier ? "update-supplier" : "create-supplier";
      const body: any = {
        ...form,
        categories: form.categories.split(",").map((c: string) => c.trim()).filter(Boolean),
        rating: parseFloat(form.rating),
      };
      if (supplier) body.supplierId = supplier.id;

      const res = await fetch("/api/logistics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...body }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed");
      }
      toast.success(supplier ? "Supplier updated" : "Supplier created");
      onSaved();
    } catch (err: any) {
      toast.error(err.message || "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[2147483646] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface border border-border-medium rounded-2xl shadow-2xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary">{supplier ? "Edit Supplier" : "Add Supplier"}</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-hover text-text-muted"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs font-medium text-text-muted mb-1 block">Name *</label>
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required
              className="w-full px-3 py-2 border border-border-subtle rounded-lg text-sm bg-surface-hover text-text-primary focus:border-cyan-500/50 focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-text-muted mb-1 block">Contact</label>
              <input value={form.contact} onChange={(e) => setForm({ ...form, contact: e.target.value })}
                className="w-full px-3 py-2 border border-border-subtle rounded-lg text-sm bg-surface-hover text-text-primary focus:border-cyan-500/50 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-text-muted mb-1 block">Email</label>
              <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="w-full px-3 py-2 border border-border-subtle rounded-lg text-sm bg-surface-hover text-text-primary focus:border-cyan-500/50 focus:outline-none" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-text-muted mb-1 block">Phone</label>
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })}
                className="w-full px-3 py-2 border border-border-subtle rounded-lg text-sm bg-surface-hover text-text-primary focus:border-cyan-500/50 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-text-muted mb-1 block">Lead Time</label>
              <input value={form.leadTime} onChange={(e) => setForm({ ...form, leadTime: e.target.value })} placeholder="e.g. 1-2 days"
                className="w-full px-3 py-2 border border-border-subtle rounded-lg text-sm bg-surface-hover text-text-primary focus:border-cyan-500/50 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-text-muted mb-1 block">Address</label>
            <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })}
              className="w-full px-3 py-2 border border-border-subtle rounded-lg text-sm bg-surface-hover text-text-primary focus:border-cyan-500/50 focus:outline-none" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-text-muted mb-1 block">Categories (comma-separated)</label>
              <input value={form.categories} onChange={(e) => setForm({ ...form, categories: e.target.value })} placeholder="Hardware, Board-Up"
                className="w-full px-3 py-2 border border-border-subtle rounded-lg text-sm bg-surface-hover text-text-primary focus:border-cyan-500/50 focus:outline-none" />
            </div>
            <div>
              <label className="text-xs font-medium text-text-muted mb-1 block">Rating (0-5)</label>
              <input type="number" step="0.1" min="0" max="5" value={form.rating} onChange={(e) => setForm({ ...form, rating: e.target.value })}
                className="w-full px-3 py-2 border border-border-subtle rounded-lg text-sm bg-surface-hover text-text-primary focus:border-cyan-500/50 focus:outline-none" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-text-muted mb-1 block">Notes</label>
            <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2}
              className="w-full px-3 py-2 border border-border-subtle rounded-lg text-sm bg-surface-hover text-text-primary focus:border-cyan-500/50 focus:outline-none resize-none" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" type="button" onClick={onClose}>Cancel</Button>
            <Button size="sm" type="submit" disabled={saving}>
              {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
              {supplier ? "Update" : "Create"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Purchase Orders ─────────────────────────────────────────────────────────

function OrdersView({ onRefresh }: { onRefresh: () => void }) {
  const [status, setStatus] = useState("");
  const { data, isLoading, refetch } = useLogistics("orders");
  const [showForm, setShowForm] = useState(false);
  const orders = data?.orders || [];
  const filtered = status ? orders.filter((o: any) => o.status === status) : orders;

  async function handleStatusChange(orderId: string, newStatus: string) {
    try {
      const res = await fetch("/api/logistics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update-order-status", orderId, status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed");
      toast.success(`Order marked as ${newStatus.replace(/_/g, " ").toLowerCase()}`);
      refetch();
      onRefresh();
    } catch {
      toast.error("Status update failed");
    }
  }

  async function handleDeleteOrder(orderId: string) {
    if (!confirm("Delete this purchase order?")) return;
    try {
      const res = await fetch(`/api/logistics?orderId=${orderId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed");
      toast.success("Order deleted");
      refetch();
      onRefresh();
    } catch {
      toast.error("Delete failed");
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {["", "PENDING", "ORDERED", "IN_TRANSIT", "DELIVERED", "CANCELLED"].map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-lg border transition-all",
                status === s
                  ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-white shadow-lg shadow-cyan-500/10 border-transparent"
                  : "bg-surface text-text-secondary border-border-subtle hover:bg-surface-hover"
              )}
            >
              {s || "All"}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={() => setShowForm(true)}>
          <Plus className="h-3.5 w-3.5 mr-1" /> New Order
        </Button>
      </div>

      {isLoading ? (
        <div className="p-8 text-center text-text-muted">Loading...</div>
      ) : filtered.length === 0 ? (
        <Card><p className="p-8 text-center text-text-muted">No purchase orders found.</p></Card>
      ) : (
        <div className="space-y-4">
          {filtered.map((order: any) => (
            <Card key={order.id}>
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-sm font-semibold text-text-primary">{order.orderNumber}</h3>
                    <OrderStatusBadge status={order.status} />
                  </div>
                  <p className="text-xs text-text-muted">
                    {order.supplier?.name} • Ordered {order.orderedAt || "—"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-text-primary">{formatCurrency(order.total)}</p>
                  <p className="text-xs text-text-muted">
                    Expected: {order.expectedDelivery || "—"}
                  </p>
                </div>
              </div>

              {/* Items */}
              <div className="bg-surface-hover rounded-lg p-3 space-y-2">
                {order.items.map((item: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-text-dim">{item.materialName}</span>
                    <span className="text-text-muted">
                      {item.quantity} × {formatCurrency(item.unitCost)} ={" "}
                      <span className="font-medium text-text-primary">{formatCurrency(item.total)}</span>
                    </span>
                  </div>
                ))}
              </div>

              {order.notes && <p className="text-xs text-text-muted mt-2">Note: {order.notes}</p>}

              {/* Actions */}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border-subtle">
                {order.status === "PENDING" && (
                  <Button size="sm" variant="outline" onClick={() => handleStatusChange(order.id, "ORDERED")}>
                    <CheckCircle2 className="h-3 w-3 mr-1" /> Mark Ordered
                  </Button>
                )}
                {order.status === "ORDERED" && (
                  <Button size="sm" variant="outline" onClick={() => handleStatusChange(order.id, "IN_TRANSIT")}>
                    <Truck className="h-3 w-3 mr-1" /> Mark In Transit
                  </Button>
                )}
                {(order.status === "IN_TRANSIT" || order.status === "ORDERED") && (
                  <Button size="sm" variant="outline" onClick={() => handleStatusChange(order.id, "DELIVERED")}>
                    <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-500" /> Mark Delivered
                  </Button>
                )}
                {order.status !== "DELIVERED" && order.status !== "CANCELLED" && (
                  <Button size="sm" variant="ghost" onClick={() => handleStatusChange(order.id, "CANCELLED")}>
                    <X className="h-3 w-3 mr-1" /> Cancel
                  </Button>
                )}
                <div className="flex-1" />
                <Button size="sm" variant="ghost" onClick={() => handleDeleteOrder(order.id)}>
                  <Trash2 className="h-3 w-3 mr-1 text-rose-500" /> Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {showForm && (
        <PurchaseOrderForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); refetch(); onRefresh(); }}
        />
      )}
    </div>
  );
}

function PurchaseOrderForm({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<{ materialId: string; quantity: number }[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/logistics?view=suppliers").then((r) => r.json()),
      fetch("/api/logistics?view=materials").then((r) => r.json()),
    ]).then(([s, m]) => {
      setSuppliers(s.suppliers || []);
      setMaterials(m.materials || []);
    });
  }, []);

  function addItem() {
    setItems([...items, { materialId: "", quantity: 1 }]);
  }

  function updateItem(index: number, field: string, value: any) {
    const updated = [...items];
    (updated[index] as any)[field] = value;
    setItems(updated);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  const subtotal = items.reduce((sum, item) => {
    const mat = materials.find((m: any) => m.id === item.materialId);
    return sum + (mat?.unitCost || 0) * item.quantity;
  }, 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supplierId || items.length === 0) {
      toast.error("Select a supplier and add at least one item");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/logistics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create-order", supplierId, items, notes }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed");
      }
      toast.success("Purchase order created");
      onSaved();
    } catch (err: any) {
      toast.error(err.message || "Create failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[2147483646] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface border border-border-medium rounded-2xl shadow-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary">New Purchase Order</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-hover text-text-muted"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-medium text-text-muted mb-1 block">Supplier *</label>
            <select value={supplierId} onChange={(e) => setSupplierId(e.target.value)} required
              className="w-full px-3 py-2 border border-border-subtle rounded-lg text-sm bg-surface-hover text-text-primary focus:border-cyan-500/50 focus:outline-none">
              <option value="">Select supplier...</option>
              {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-text-muted">Items *</label>
              <Button size="sm" variant="outline" type="button" onClick={addItem}>
                <Plus className="h-3 w-3 mr-1" /> Add Item
              </Button>
            </div>
            {items.length === 0 && (
              <p className="text-xs text-text-dim text-center py-4">No items added yet</p>
            )}
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="flex items-center gap-2">
                  <select value={item.materialId} onChange={(e) => updateItem(i, "materialId", e.target.value)}
                    className="flex-1 px-3 py-2 border border-border-subtle rounded-lg text-sm bg-surface-hover text-text-primary focus:border-cyan-500/50 focus:outline-none">
                    <option value="">Select material...</option>
                    {materials.map((m: any) => (
                      <option key={m.id} value={m.id}>{m.name} ({formatCurrency(m.unitCost)}/{m.unit})</option>
                    ))}
                  </select>
                  <input type="number" min="1" value={item.quantity} onChange={(e) => updateItem(i, "quantity", parseInt(e.target.value) || 1)}
                    className="w-20 px-3 py-2 border border-border-subtle rounded-lg text-sm bg-surface-hover text-text-primary focus:border-cyan-500/50 focus:outline-none" />
                  <button type="button" onClick={() => removeItem(i)} className="p-1 rounded hover:bg-surface-hover text-text-muted hover:text-rose-500">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-text-muted mb-1 block">Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={2}
              className="w-full px-3 py-2 border border-border-subtle rounded-lg text-sm bg-surface-hover text-text-primary focus:border-cyan-500/50 focus:outline-none resize-none" />
          </div>

          {subtotal > 0 && (
            <div className="bg-surface-hover rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between text-text-muted"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              <div className="flex justify-between text-text-muted"><span>Tax (8%)</span><span>{formatCurrency(subtotal * 0.08)}</span></div>
              <div className="flex justify-between font-bold text-text-primary border-t border-border-subtle pt-1"><span>Total</span><span>{formatCurrency(subtotal * 1.08)}</span></div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" type="button" onClick={onClose}>Cancel</Button>
            <Button size="sm" type="submit" disabled={saving || items.length === 0}>
              {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" /> : <ShoppingCart className="h-3.5 w-3.5 mr-1" />}
              Create Order
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Delivery Tracking View ──────────────────────────────────────────────────

function TrackingView({ onRefresh }: { onRefresh: () => void }) {
  const { data: ordersData, isLoading, refetch } = useLogistics("orders");
  const { data: overviewData } = useLogistics("overview");

  const orders = ordersData?.orders || [];
  const activeOrders = orders.filter((o: any) => ["ORDERED", "IN_TRANSIT"].includes(o.status));
  const pendingOrders = orders.filter((o: any) => o.status === "PENDING");
  const recentDelivered = orders.filter((o: any) => o.status === "DELIVERED").slice(0, 5);

  const lowStockItems = overviewData?.lowStockItems || [];

  if (isLoading) return <div className="p-8 text-center text-text-muted">Loading...</div>;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card padding={false}>
          <div className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Clock className="h-5 w-5 text-amber-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">{pendingOrders.length}</p>
              <p className="text-xs text-text-muted">Pending Orders</p>
            </div>
          </div>
        </Card>
        <Card padding={false}>
          <div className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-blue-500/10">
              <Truck className="h-5 w-5 text-blue-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">{activeOrders.length}</p>
              <p className="text-xs text-text-muted">In Transit / Ordered</p>
            </div>
          </div>
        </Card>
        <Card padding={false}>
          <div className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <PackageCheck className="h-5 w-5 text-emerald-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">{recentDelivered.length}</p>
              <p className="text-xs text-text-muted">Recently Delivered</p>
            </div>
          </div>
        </Card>
        <Card padding={false}>
          <div className="p-4 flex items-center gap-3">
            <div className="p-2 rounded-lg bg-rose-500/10">
              <AlertTriangle className="h-5 w-5 text-rose-500" />
            </div>
            <div>
              <p className="text-lg font-bold text-text-primary">{lowStockItems.length}</p>
              <p className="text-xs text-text-muted">Low Stock Alerts</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Active Deliveries with Timeline */}
      {activeOrders.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Truck className="h-5 w-5 text-cyan-400" />
              Active Deliveries ({activeOrders.length})
            </CardTitle>
          </CardHeader>
          <div className="space-y-4">
            {activeOrders.map((order: any) => (
              <div key={order.id} className="bg-surface-hover rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-text-primary">{order.orderNumber}</h4>
                      <OrderStatusBadge status={order.status} />
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">{order.supplier?.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-text-primary">{formatCurrency(order.total)}</p>
                    <p className="text-xs text-text-muted">{order.items.length} items</p>
                  </div>
                </div>

                {/* Status Timeline */}
                <div className="flex items-center gap-1 mb-3">
                  {["PENDING", "ORDERED", "IN_TRANSIT", "DELIVERED"].map((step, i) => {
                    const stepOrder = ["PENDING", "ORDERED", "IN_TRANSIT", "DELIVERED"];
                    const currentIdx = stepOrder.indexOf(order.status);
                    const isComplete = i <= currentIdx;
                    const isCurrent = i === currentIdx;
                    return (
                      <div key={step} className="flex items-center flex-1">
                        <div className={cn(
                          "flex items-center gap-1.5 flex-1",
                        )}>
                          <div className={cn(
                            "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold",
                            isComplete
                              ? isCurrent
                                ? "bg-cyan-500 text-white ring-2 ring-cyan-500/30"
                                : "bg-emerald-500 text-white"
                              : "bg-surface-hover text-text-muted border border-border-medium"
                          )}>
                            {isComplete && !isCurrent ? (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : (
                              i + 1
                            )}
                          </div>
                          <span className={cn(
                            "text-[10px] font-medium",
                            isCurrent ? "text-cyan-400" : isComplete ? "text-emerald-500" : "text-text-muted"
                          )}>
                            {step.replace(/_/g, " ")}
                          </span>
                        </div>
                        {i < 3 && (
                          <div className={cn(
                            "h-0.5 w-8 mx-1 rounded-full",
                            i < currentIdx ? "bg-emerald-500" : "bg-border-medium"
                          )} />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Delivery Info */}
                <div className="flex items-center gap-4 text-xs text-text-muted">
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Ordered: {order.orderedAt || "—"}
                  </span>
                  <span className="flex items-center gap-1">
                    <Timer className="h-3 w-3" />
                    Expected: {order.expectedDelivery || "—"}
                  </span>
                  {order.status === "IN_TRANSIT" && order.expectedDelivery && (
                    <span className="text-amber-500 font-medium">
                      {getDaysUntil(order.expectedDelivery)}
                    </span>
                  )}
                </div>

                {/* Quick Action */}
                <div className="flex items-center gap-2 mt-3 pt-3 border-t border-border-subtle">
                  {order.status === "IN_TRANSIT" && (
                    <Button size="xs" variant="outline" onClick={async () => {
                      try {
                        const res = await fetch("/api/logistics", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ action: "update-order-status", orderId: order.id, status: "DELIVERED" }),
                        });
                        if (!res.ok) throw new Error("Failed");
                        toast.success("Marked as delivered!");
                        refetch();
                        onRefresh();
                      } catch { toast.error("Failed"); }
                    }}>
                      <PackageCheck className="h-3 w-3 mr-1" /> Mark Delivered
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Low Stock Reorder Suggestions */}
      {lowStockItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-rose-500" />
              Inventory Reorder Suggestions
            </CardTitle>
          </CardHeader>
          <div className="space-y-3">
            {lowStockItems.map((item: any) => {
              const reorderQty = Math.max(item.minStock * 2 - item.quantity, item.minStock);
              return (
                <div key={item.id} className="flex items-center gap-3 p-3 bg-surface-hover rounded-lg">
                  <div className="p-2 rounded-lg bg-rose-500/10">
                    <Package className="h-4 w-4 text-rose-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-text-primary">{item.name}</p>
                    <p className="text-xs text-text-muted">
                      Current: {item.quantity} {item.unit}s • Min: {item.minStock} •
                      <span className="text-rose-500 font-medium ml-1">Deficit: {item.minStock - item.quantity}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-text-muted mb-1">Suggested reorder:</p>
                    <p className="text-sm font-bold text-cyan-400">{reorderQty} {item.unit}s</p>
                  </div>
                  <Button size="xs" className="ml-2">
                    <ShoppingCart className="h-3 w-3 mr-1" /> Order
                  </Button>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {/* No active deliveries */}
      {activeOrders.length === 0 && (
        <Card>
          <div className="text-center py-12">
            <Truck className="h-12 w-12 text-text-dim mx-auto mb-3" />
            <p className="font-medium text-text-primary">No active deliveries</p>
            <p className="text-sm text-text-muted mt-1">
              All orders are either pending or have been delivered
            </p>
          </div>
        </Card>
      )}
    </div>
  );
}

function getDaysUntil(dateStr: string): string {
  const target = new Date(dateStr);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return `${Math.abs(diffDays)} days overdue`;
  if (diffDays === 0) return "Arriving today";
  if (diffDays === 1) return "Arriving tomorrow";
  return `Arriving in ${diffDays} days`;
}

// ─── Stock Movements ─────────────────────────────────────────────────────────

function StockMovementsView({ onRefresh }: { onRefresh: () => void }) {
  const [materialId, setMaterialId] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [page, setPage] = useState(1);
  const [materials, setMaterials] = useState<any[]>([]);
  const [showUsageModal, setShowUsageModal] = useState(false);

  useEffect(() => {
    fetch("/api/logistics?view=materials").then(r => r.json()).then(d => setMaterials(d.materials || [])).catch(() => {});
  }, []);

  const params = new URLSearchParams({ page: page.toString(), limit: "30" });
  if (materialId) params.set("materialId", materialId);
  if (typeFilter) params.set("type", typeFilter);

  const { data, isLoading, refetch } = useLogistics(`stock?${params.toString()}`);
  const transactions = data?.transactions || [];
  const pagination = data?.pagination;

  const typeColors: Record<string, { bg: string; text: string; icon: any; label: string }> = {
    STOCK_IN: { bg: "bg-emerald-500/10", text: "text-emerald-500", icon: TrendingUp, label: "Received" },
    STOCK_OUT: { bg: "bg-rose-500/10", text: "text-rose-500", icon: TrendingDown, label: "Used" },
    ADJUSTMENT: { bg: "bg-amber-500/10", text: "text-amber-500", icon: Edit3, label: "Adjusted" },
    RETURN: { bg: "bg-blue-500/10", text: "text-blue-500", icon: RefreshCw, label: "Returned" },
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <select
          value={materialId}
          onChange={(e) => { setMaterialId(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-border-medium rounded-lg text-sm bg-surface text-text-secondary"
        >
          <option value="">All Materials</option>
          {materials.map((m: any) => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
        <div className="flex gap-1">
          {["", "STOCK_IN", "STOCK_OUT", "ADJUSTMENT", "RETURN"].map((t) => (
            <button
              key={t}
              onClick={() => { setTypeFilter(t); setPage(1); }}
              className={cn(
                "px-2.5 py-1.5 text-xs font-medium rounded-lg border transition-all",
                typeFilter === t
                  ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-white border-transparent"
                  : "bg-surface text-text-secondary border-border-subtle hover:bg-surface-hover"
              )}
            >
              {t ? (typeColors[t]?.label || t) : "All"}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        <Button size="sm" onClick={() => setShowUsageModal(true)}>
          <TrendingDown className="h-3.5 w-3.5 mr-1" /> Record Usage
        </Button>
      </div>

      {/* Transaction list */}
      <Card padding={false}>
        {isLoading ? (
          <div className="p-8 text-center text-text-muted">Loading...</div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center text-text-muted">
            <Package className="h-12 w-12 mx-auto mb-3 text-text-dim" />
            <p className="font-medium">No stock movements yet</p>
            <p className="text-sm mt-1">Record material usage or receive a purchase order to see transactions here.</p>
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {transactions.map((tx: any) => {
              const config = typeColors[tx.type] || typeColors.ADJUSTMENT;
              const TxIcon = config.icon;
              const isNegative = tx.quantity < 0;
              return (
                <div key={tx.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-hover transition-colors">
                  <div className={cn("p-2 rounded-lg", config.bg)}>
                    <TxIcon className={cn("h-4 w-4", config.text)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-primary">
                        {tx.material?.name || "Unknown"}
                      </span>
                      <Badge className={cn("text-[10px]", config.bg, config.text)}>
                        {config.label}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-text-muted mt-0.5">
                      <span>{tx.material?.category}</span>
                      {tx.reason && (
                        <>
                          <span>·</span>
                          <span className="truncate">{tx.reason}</span>
                        </>
                      )}
                      {tx.user?.name && (
                        <>
                          <span>·</span>
                          <span>by {tx.user.name}</span>
                        </>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn(
                      "text-sm font-bold font-mono",
                      isNegative ? "text-rose-500" : "text-emerald-500"
                    )}>
                      {isNegative ? "" : "+"}{tx.quantity} {tx.material?.unit}
                    </p>
                    <p className="text-[10px] text-text-dim">
                      {tx.beforeQty} → {tx.afterQty}
                    </p>
                  </div>
                  <div className="text-right min-w-[80px]">
                    <p className="text-xs text-text-muted">
                      {new Date(tx.createdAt).toLocaleDateString()}
                    </p>
                    <p className="text-[10px] text-text-dim">
                      {new Date(tx.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:text-text-primary disabled:opacity-40"
          >
            Previous
          </button>
          <span className="text-sm text-text-muted">
            Page {page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
            disabled={page === pagination.totalPages}
            className="px-3 py-1.5 rounded-lg text-sm text-text-secondary hover:text-text-primary disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}

      {/* Record Usage Modal */}
      {showUsageModal && (
        <RecordUsageModal
          materials={materials}
          onClose={() => setShowUsageModal(false)}
          onSaved={() => { setShowUsageModal(false); refetch(); onRefresh(); }}
        />
      )}
    </div>
  );
}

function RecordUsageModal({ materials, onClose, onSaved }: { materials: any[]; onClose: () => void; onSaved: () => void }) {
  const [materialId, setMaterialId] = useState("");
  const [quantity, setQuantity] = useState("");
  const [reason, setReason] = useState("");
  const [workOrderId, setWorkOrderId] = useState("");
  const [action, setAction] = useState<"use" | "receive" | "return">("use");
  const [saving, setSaving] = useState(false);
  const [workOrders, setWorkOrders] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/work-orders?limit=50").then(r => r.json()).then(d => setWorkOrders(d.workOrders || [])).catch(() => {});
  }, []);

  const selectedMaterial = materials.find((m: any) => m.id === materialId);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!materialId || !quantity) {
      toast.error("Select a material and enter quantity");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/logistics/stock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          materialId,
          quantity: parseFloat(quantity),
          reason: reason || undefined,
          workOrderId: workOrderId || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed");
      }
      const actionLabels = { use: "Stock deducted", receive: "Stock received", return: "Stock returned" };
      toast.success(actionLabels[action]);
      onSaved();
    } catch (err: any) {
      toast.error(err.message || "Failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[2147483646] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-surface border border-border-medium rounded-2xl shadow-2xl w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-text-primary">Record Stock Movement</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-surface-hover text-text-muted"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-3">
          {/* Action type */}
          <div>
            <label className="text-xs font-medium text-text-muted mb-1 block">Action</label>
            <div className="flex gap-2">
              {[
                { value: "use", label: "Use / Deduct", icon: TrendingDown, color: "rose" },
                { value: "receive", label: "Receive", icon: TrendingUp, color: "emerald" },
                { value: "return", label: "Return", icon: RefreshCw, color: "blue" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setAction(opt.value as any)}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-all",
                    action === opt.value
                      ? `bg-${opt.color}-500/10 border-${opt.color}-500/30 text-${opt.color}-500`
                      : "bg-surface border-border-subtle text-text-secondary hover:bg-surface-hover"
                  )}
                >
                  <opt.icon className="h-3.5 w-3.5" />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Material */}
          <div>
            <label className="text-xs font-medium text-text-muted mb-1 block">Material *</label>
            <select
              value={materialId}
              onChange={(e) => setMaterialId(e.target.value)}
              required
              className="w-full px-3 py-2 border border-border-subtle rounded-lg text-sm bg-surface-hover text-text-primary focus:border-cyan-500/50 focus:outline-none"
            >
              <option value="">Select material...</option>
              {materials.map((m: any) => (
                <option key={m.id} value={m.id}>
                  {m.name} — {m.quantity} {m.unit} available ({m.category})
                </option>
              ))}
            </select>
            {selectedMaterial && (
              <p className="text-xs text-text-muted mt-1">
                Current stock: <span className="font-medium text-text-primary">{selectedMaterial.quantity} {selectedMaterial.unit}</span>
                {selectedMaterial.quantity <= selectedMaterial.minStock && (
                  <span className="text-rose-500 ml-2">⚠ Low stock</span>
                )}
              </p>
            )}
          </div>

          {/* Quantity */}
          <div>
            <label className="text-xs font-medium text-text-muted mb-1 block">
              Quantity * {selectedMaterial && <span className="text-text-dim">({selectedMaterial.unit})</span>}
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              required
              placeholder={action === "use" ? "How many used?" : action === "receive" ? "How many received?" : "How many returned?"}
              className="w-full px-3 py-2 border border-border-subtle rounded-lg text-sm bg-surface-hover text-text-primary focus:border-cyan-500/50 focus:outline-none"
            />
            {action === "use" && selectedMaterial && quantity && parseFloat(quantity) > selectedMaterial.quantity && (
              <p className="text-xs text-rose-500 mt-1">
                ⚠ Exceeds available stock by {parseFloat(quantity) - selectedMaterial.quantity} {selectedMaterial.unit}
              </p>
            )}
          </div>

          {/* Work Order (optional) */}
          <div>
            <label className="text-xs font-medium text-text-muted mb-1 block">Work Order (optional)</label>
            <select
              value={workOrderId}
              onChange={(e) => setWorkOrderId(e.target.value)}
              className="w-full px-3 py-2 border border-border-subtle rounded-lg text-sm bg-surface-hover text-text-primary focus:border-cyan-500/50 focus:outline-none"
            >
              <option value="">None</option>
              {workOrders.map((wo: any) => (
                <option key={wo.id} value={wo.id}>{wo.title} — {wo.address}</option>
              ))}
            </select>
          </div>

          {/* Reason */}
          <div>
            <label className="text-xs font-medium text-text-muted mb-1 block">Reason / Notes</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Used for board-up at 123 Main St"
              className="w-full px-3 py-2 border border-border-subtle rounded-lg text-sm bg-surface-hover text-text-primary focus:border-cyan-500/50 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" size="sm" type="button" onClick={onClose}>Cancel</Button>
            <Button size="sm" type="submit" disabled={saving || !materialId || !quantity}>
              {saving ? <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
              Record
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Shared Components ───────────────────────────────────────────────────────

function OrderStatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PENDING: "bg-amber-500/10 text-amber-600",
    APPROVED: "bg-blue-500/10 text-blue-600",
    ORDERED: "bg-indigo-500/10 text-indigo-600",
    IN_TRANSIT: "bg-blue-500/10 text-blue-600",
    DELIVERED: "bg-emerald-500/10 text-emerald-600",
    CANCELLED: "bg-slate-500/10 text-slate-600",
  };
  return (
    <Badge className={cn("text-[10px]", colors[status] || "bg-surface-hover text-text-muted")}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

function OrderStatusIcon({ status }: { status: string }) {
  const colors: Record<string, string> = {
    PENDING: "bg-amber-500/10 text-amber-500",
    APPROVED: "bg-blue-500/10 text-blue-500",
    ORDERED: "bg-indigo-500/10 text-indigo-500",
    IN_TRANSIT: "bg-blue-500/10 text-blue-500",
    DELIVERED: "bg-emerald-500/10 text-emerald-500",
    CANCELLED: "bg-slate-500/10 text-slate-500",
  };
  const icons: Record<string, any> = {
    PENDING: Clock,
    APPROVED: CheckCircle2,
    ORDERED: ClipboardList,
    IN_TRANSIT: Truck,
    DELIVERED: CheckCircle2,
    CANCELLED: X,
  };
  const Icon = icons[status] || Clock;
  return (
    <div className={cn("p-2 rounded-lg", colors[status] || "bg-surface-hover")}>
      <Icon className="h-4 w-4" />
    </div>
  );
}

function Calendar({ className }: { className?: string }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
      <line x1="16" x2="16" y1="2" y2="6" />
      <line x1="8" x2="8" y1="2" y2="6" />
      <line x1="3" x2="21" y1="10" y2="10" />
    </svg>
  );
}
