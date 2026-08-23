"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { redirect } from "next/navigation";
import { 
  Building2, 
  Users, 
  FileText, 
  HardDrive, 
  Settings, 
  ShieldAlert, 
  Search, 
  Plus, 
  CheckCircle2, 
  XCircle,
  Loader2,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";

interface CompanyWithStats {
  id: string;
  name: string;
  plan: string;
  isActive: boolean;
  maxUsers: number;
  maxVendors: number;
  maxWorkOrders: number;
  maxStorage: number;
  createdAt: string;
  _count: {
    users: number;
    workOrders: number;
    FileUpload: number;
    leads: number;
  };
}

export default function SuperAdminPortal() {
  const { data: session, status } = useSession();
  const [companies, setCompanies] = useState<CompanyWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<CompanyWithStats | null>(null);
  const [formName, setFormName] = useState("");
  const [formPlan, setFormPlan] = useState("TRIAL");
  const [formMaxUsers, setFormMaxUsers] = useState(5);
  const [formMaxVendors, setFormMaxVendors] = useState(10);
  const [formMaxWorkOrders, setFormMaxWorkOrders] = useState(100);
  const [formMaxStorage, setFormMaxStorage] = useState(5120); // default 5GB in MB
  const [formIsActive, setFormIsActive] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      redirect("/auth/signin");
    }
  }, [status]);

  const fetchCompanies = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/companies");
      if (res.ok) {
        const data = await res.json();
        setCompanies(data.companies || []);
      }
    } catch (err) {
      console.error("Failed to fetch companies:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (session?.user && (session.user as any).role === "SUPER_ADMIN") {
      fetchCompanies();
    }
  }, [session]);

  if (status === "loading" || loading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Redirect if not super admin
  if ((session?.user as any)?.role !== "SUPER_ADMIN") {
    return (
      <div className="flex h-[80vh] flex-col items-center justify-center text-center p-6">
        <ShieldAlert className="h-16 w-16 text-rose-500 mb-4" />
        <h1 className="text-2xl font-bold text-text-primary mb-2">Access Denied</h1>
        <p className="text-text-secondary max-w-md">
          This portal is restricted to platform administrators only. If you believe this is an error, please contact support.
        </p>
      </div>
    );
  }

  const handleEditClick = (company: CompanyWithStats) => {
    setEditingCompany(company);
    setFormName(company.name);
    setFormPlan(company.plan);
    setFormMaxUsers(company.maxUsers);
    setFormMaxVendors(company.maxVendors);
    setFormMaxWorkOrders(company.maxWorkOrders);
    setFormMaxStorage(company.maxStorage);
    setFormIsActive(company.isActive);
    setIsEditModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCompany) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/admin/companies", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingCompany.id,
          name: formName,
          plan: formPlan,
          maxUsers: formMaxUsers,
          maxVendors: formMaxVendors,
          maxWorkOrders: formMaxWorkOrders,
          maxStorage: formMaxStorage,
          isActive: formIsActive,
        }),
      });

      if (res.ok) {
        setIsEditModalOpen(false);
        fetchCompanies();
      } else {
        const err = await res.json();
        alert(err.error || "Failed to update company settings");
      }
    } catch (err) {
      console.error(err);
      alert("An unexpected error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  // Filtered companies
  const filteredCompanies = companies.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.plan.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Global aggregates
  const totalCompanies = companies.length;
  const totalActiveWorkOrders = companies.reduce((sum, c) => sum + c._count.workOrders, 0);
  const totalUsers = companies.reduce((sum, c) => sum + c._count.users, 0);
  const totalSuspended = companies.filter(c => !c.isActive).length;

  const planBadgeColor = (plan: string) => {
    switch (plan.toUpperCase()) {
      case "TRIAL": return "bg-gray-500/10 text-gray-400 border-gray-500/20";
      case "BASIC": return "bg-blue-500/10 text-blue-400 border-blue-500/20";
      case "PROFESSIONAL": return "bg-purple-500/10 text-purple-400 border-purple-500/20";
      case "ENTERPRISE": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
      case "CUSTOM": return "bg-amber-500/10 text-amber-400 border-amber-500/20";
      default: return "bg-gray-500/10 text-gray-400 border-gray-500/20";
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-text-primary">Super Admin Command Center</h1>
          <p className="text-text-secondary mt-1">Monitor tenant metrics, provision companies, suspend accounts, and update subscription plans.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchCompanies} className="h-9">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Aggregate Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="bg-slate-900/40 border-slate-800 flex items-center justify-between p-6">
          <div className="space-y-1">
            <p className="text-sm text-text-secondary">Total Tenants</p>
            <p className="text-3xl font-semibold text-text-primary">{totalCompanies}</p>
          </div>
          <div className="p-3 bg-cyan-500/10 rounded-xl text-cyan-400">
            <Building2 className="h-6 w-6" />
          </div>
        </Card>

        <Card className="bg-slate-900/40 border-slate-800 flex items-center justify-between p-6">
          <div className="space-y-1">
            <p className="text-sm text-text-secondary">Platform Users</p>
            <p className="text-3xl font-semibold text-text-primary">{totalUsers}</p>
          </div>
          <div className="p-3 bg-blue-500/10 rounded-xl text-blue-400">
            <Users className="h-6 w-6" />
          </div>
        </Card>

        <Card className="bg-slate-900/40 border-slate-800 flex items-center justify-between p-6">
          <div className="space-y-1">
            <p className="text-sm text-text-secondary">Active Work Orders</p>
            <p className="text-3xl font-semibold text-text-primary">{totalActiveWorkOrders}</p>
          </div>
          <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
            <FileText className="h-6 w-6" />
          </div>
        </Card>

        <Card className="bg-slate-900/40 border-slate-800 flex items-center justify-between p-6">
          <div className="space-y-1">
            <p className="text-sm text-text-secondary">Suspended Tenants</p>
            <p className={`text-3xl font-semibold ${totalSuspended > 0 ? "text-rose-500" : "text-text-primary"}`}>
              {totalSuspended}
            </p>
          </div>
          <div className="p-3 bg-rose-500/10 rounded-xl text-rose-400">
            <ShieldAlert className="h-6 w-6" />
          </div>
        </Card>
      </div>

      {/* Controls & Search */}
      <div className="flex items-center gap-3 bg-slate-900/20 p-4 border border-slate-800/40 rounded-xl">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-text-secondary" />
          <Input 
            placeholder="Search company name, plan..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 bg-slate-900/60 border-slate-800"
          />
        </div>
      </div>

      {/* Companies Table */}
      <Card className="bg-slate-900/20 border-slate-800/60">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-slate-800 text-xs font-semibold text-text-secondary uppercase tracking-wider bg-slate-900/40">
                <th className="py-4 px-6">Company Name</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6">Subscription</th>
                <th className="py-4 px-6 text-center">Active Users</th>
                <th className="py-4 px-6 text-center">Work Orders</th>
                <th className="py-4 px-6 text-center">Storage Capacity</th>
                <th className="py-4 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 text-sm">
              {filteredCompanies.map((company) => {
                const userPct = Math.round((company._count.users / company.maxUsers) * 100);
                const woPct = Math.round((company._count.workOrders / company.maxWorkOrders) * 100);
                
                return (
                  <tr key={company.id} className="hover:bg-slate-900/40 transition-colors">
                    <td className="py-4 px-6 font-medium text-text-primary">
                      {company.name}
                      <span className="block text-xs text-text-secondary font-normal mt-0.5">ID: {company.id}</span>
                    </td>
                    <td className="py-4 px-6">
                      {company.isActive ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-medium text-xs">
                          <CheckCircle2 className="h-4 w-4" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-rose-500 font-medium text-xs">
                          <XCircle className="h-4 w-4" /> Suspended
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium border ${planBadgeColor(company.plan)}`}>
                        {company.plan}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex flex-col items-center">
                        <span className="font-semibold text-text-primary">
                          {company._count.users} / {company.maxUsers}
                        </span>
                        <div className="w-16 bg-slate-800 h-1 rounded-full mt-1.5 overflow-hidden">
                          <div 
                            className={`h-full ${userPct > 90 ? "bg-rose-500" : userPct > 70 ? "bg-amber-500" : "bg-cyan-500"}`} 
                            style={{ width: `${Math.min(userPct, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex flex-col items-center">
                        <span className="font-semibold text-text-primary">
                          {company._count.workOrders} / {company.maxWorkOrders}
                        </span>
                        <div className="w-16 bg-slate-800 h-1 rounded-full mt-1.5 overflow-hidden">
                          <div 
                            className={`h-full ${woPct > 90 ? "bg-rose-500" : woPct > 70 ? "bg-amber-500" : "bg-cyan-500"}`} 
                            style={{ width: `${Math.min(woPct, 100)}%` }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex flex-col items-center">
                        <span className="font-semibold text-text-primary">
                          {(company.maxStorage / 1024).toFixed(1)} GB
                        </span>
                        <span className="text-xs text-text-secondary mt-0.5">Limit</span>
                      </div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Button variant="outline" size="sm" onClick={() => handleEditClick(company)} className="h-8">
                        <Settings className="h-4 w-4 mr-1.5" />
                        Manage
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Edit Settings Modal */}
      <Modal 
        isOpen={isEditModalOpen} 
        onClose={() => setIsEditModalOpen(false)} 
        title={`Manage Settings: ${editingCompany?.name}`}
        size="md"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">Company Name</label>
            <Input 
              value={formName} 
              onChange={(e) => setFormName(e.target.value)} 
              className="bg-slate-900 border-slate-800 h-9 text-text-primary"
              required 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">Subscription Plan</label>
              <select 
                value={formPlan} 
                onChange={(e) => setFormPlan(e.target.value)}
                className="block w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-text-primary focus:border-cyan-500 focus:outline-none h-9"
              >
                <option value="TRIAL">TRIAL (5 Users)</option>
                <option value="STARTER">STARTER (5 Users)</option>
                <option value="BASIC">BASIC (5 Users)</option>
                <option value="PROFESSIONAL">PROFESSIONAL (25 Users)</option>
                <option value="PREMIUM">PREMIUM (500 Users)</option>
                <option value="ENTERPRISE">ENTERPRISE (10,000 Users)</option>
                <option value="CUSTOM">CUSTOM</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">Account Status</label>
              <select 
                value={formIsActive ? "ACTIVE" : "SUSPENDED"} 
                onChange={(e) => setFormIsActive(e.target.value === "ACTIVE")}
                className="block w-full rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-text-primary focus:border-cyan-500 focus:outline-none h-9"
              >
                <option value="ACTIVE">ACTIVE</option>
                <option value="SUSPENDED">SUSPENDED (Block logins)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-slate-800/60 pt-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">Max Users</label>
              <Input 
                type="number" 
                value={formMaxUsers} 
                onChange={(e) => setFormMaxUsers(parseInt(e.target.value, 10))} 
                className="bg-slate-900 border-slate-800 h-9 text-text-primary"
                min={1}
                required 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">Max Vendors</label>
              <Input 
                type="number" 
                value={formMaxVendors} 
                onChange={(e) => setFormMaxVendors(parseInt(e.target.value, 10))} 
                className="bg-slate-900 border-slate-800 h-9 text-text-primary"
                min={1}
                required 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">Max Work Orders</label>
              <Input 
                type="number" 
                value={formMaxWorkOrders} 
                onChange={(e) => setFormMaxWorkOrders(parseInt(e.target.value, 10))} 
                className="bg-slate-900 border-slate-800 h-9 text-text-primary"
                min={1}
                required 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase mb-1">Max Storage (MB)</label>
              <Input 
                type="number" 
                value={formMaxStorage} 
                onChange={(e) => setFormMaxStorage(parseInt(e.target.value, 10))} 
                className="bg-slate-900 border-slate-800 h-9 text-text-primary"
                min={1}
                required 
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-800/60 pt-4 mt-6">
            <Button type="button" variant="outline" onClick={() => setIsEditModalOpen(false)} className="h-9">
              Cancel
            </Button>
            <Button type="submit" disabled={submitting} className="h-9">
              {submitting ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
