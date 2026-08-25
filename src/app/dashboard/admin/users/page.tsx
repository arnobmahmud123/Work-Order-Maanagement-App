"use client";

import { useUsersWithQuota } from "@/hooks/use-data";
import { Button, Card, Badge, Avatar, Modal, Input } from "@/components/ui";
import {
  Plus,
  Users,
  Shield,
  UserCheck,
  UserX,
  Edit,
  Trash2,
  Mail,
  Phone,
  Building2,
  X,
  Search,
  KeyRound,
  Sparkles,
  ArrowUpRight,
  AlertTriangle,
  CheckCircle2,
  Lock,
  ShieldCheck,
  FileText,
} from "lucide-react";
import { formatDate, cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import toast from "react-hot-toast";
import Link from "next/link";
import { UserDocumentsTab } from "@/components/profile/user-documents-tab";

const roleColors: Record<string, string> = {
  SUPER_ADMIN: "bg-rose-500/15 text-rose-400 border border-rose-500/30",
  ADMIN: "bg-purple-500/15 text-purple-400 border border-purple-500/30",
  COORDINATOR: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  INCHARGE_COORDINATOR: "bg-indigo-500/15 text-indigo-400 border border-indigo-500/30",
  PROCESSOR: "bg-cyan-500/15 text-cyan-400 border border-cyan-500/30",
  PROCESSOR_INCHARGE: "bg-teal-500/15 text-teal-400 border border-teal-500/30",
  ACCOUNTANT: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  CLIENT_MANAGER: "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30",
  INCHARGE_CLIENT_MANAGER: "bg-lime-500/15 text-lime-400 border border-lime-500/30",
  CONTRACTOR: "bg-green-500/15 text-green-400 border border-green-500/30",
  CLIENT: "bg-gray-500/15 text-text-secondary border border-gray-500/20",
};

const ALL_ROLES = [
  { value: "ALL", label: "All Roles" },
  { value: "CLIENT", label: "Client" },
  { value: "CONTRACTOR", label: "Contractor" },
  { value: "COORDINATOR", label: "Coordinator" },
  { value: "INCHARGE_COORDINATOR", label: "Incharge Coordinator" },
  { value: "PROCESSOR", label: "Processor" },
  { value: "PROCESSOR_INCHARGE", label: "Processor Incharge" },
  { value: "ACCOUNTANT", label: "Accountant" },
  { value: "CLIENT_MANAGER", label: "Client Manager" },
  { value: "INCHARGE_CLIENT_MANAGER", label: "Incharge Client Manager" },
  { value: "ADMIN", label: "Admin" },
  { value: "SUPER_ADMIN", label: "Super Admin" },
];

export default function AdminUsersPage() {
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingUser, setEditingUser] = useState<any>(null);
  const [viewingDocsUser, setViewingDocsUser] = useState<any>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addingUser, setAddingUser] = useState(false);

  const { data, isLoading, refetch } = useUsersWithQuota(roleFilter, statusFilter, searchQuery);

  const users = data?.users || [];
  const quota = data?.quota;

  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "CONTRACTOR",
    phone: "",
    company: "",
  });

  async function handleAddSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!addForm.name.trim() || !addForm.email.trim() || !addForm.password.trim()) {
      toast.error("Name, email, and password are required");
      return;
    }
    setAddingUser(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addForm.name.trim(),
          email: addForm.email.trim(),
          password: addForm.password.trim(),
          role: addForm.role,
          phone: addForm.phone.trim() || null,
          company: addForm.company.trim() || null,
        }),
      });
      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Failed to create user");
      }
      toast.success("User created successfully");
      setIsAddModalOpen(false);
      setAddForm({
        name: "",
        email: "",
        password: "",
        role: "CONTRACTOR",
        phone: "",
        company: "",
      });
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to create user");
    } finally {
      setAddingUser(false);
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, role: newRole }),
      });
      if (!res.ok) throw new Error("Failed to update role");
      toast.success("User role updated");
      refetch();
    } catch {
      toast.error("Failed to update user role");
    }
  }

  async function handleToggleActive(userId: string, currentStatus: boolean) {
    try {
      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId, isActive: !currentStatus }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      toast.success(!currentStatus ? "User activated" : "User deactivated");
      refetch();
    } catch {
      toast.error("Failed to update user status");
    }
  }

  async function handleDeleteUser(userId: string) {
    if (!confirm("Are you sure you want to delete this user? This cannot be undone.")) return;
    try {
      const res = await fetch("/api/admin/users", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: userId }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Failed");
      toast.success("User deleted");
      refetch();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete user");
    }
  }

  const quotaPercent = quota ? Math.min(100, Math.round((quota.currentCount / quota.maxAllowed) * 100)) : 0;

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-text-primary tracking-tight">User & Role Management</h1>
          <p className="text-xs text-text-muted mt-1">
            Create, manage, and assign roles for organization members, contractors, and processors.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setIsAddModalOpen(true)}
            disabled={quota?.isLimitReached}
            className={cn(
              "flex items-center gap-1.5 h-10 px-5 text-xs font-bold uppercase tracking-wider rounded-xl shadow-lg",
              quota?.isLimitReached
                ? "opacity-50 cursor-not-allowed bg-gray-700"
                : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:opacity-95 text-white shadow-cyan-500/20"
            )}
          >
            <Plus className="h-4 w-4" /> Create User
          </Button>
        </div>
      </div>

      {/* Plan & Quota Indicator Banner */}
      {quota && (
        <div className="p-5 rounded-2xl bg-surface border border-border-subtle shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1.5 flex-1">
            <div className="flex items-center gap-2.5">
              <span className="text-xs font-bold text-text-muted uppercase tracking-wider">
                Current Plan:
              </span>
              <Badge className="bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 text-xs font-black px-2.5 py-0.5">
                <Sparkles className="h-3 w-3 mr-1" />
                {quota.planName} PLAN
              </Badge>
              {quota.isLimitReached && (
                <span className="text-[11px] font-bold text-rose-400 flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5" /> Plan Limit Reached
                </span>
              )}
            </div>

            <div className="flex items-center justify-between text-xs text-text-secondary pt-1">
              <span>
                <strong>{quota.currentCount}</strong> of <strong>{quota.maxAllowed}</strong> maximum users used
              </span>
              <span className="text-text-muted">
                {quota.remaining} slots remaining ({quotaPercent}%)
              </span>
            </div>

            {/* Quota Progress Bar */}
            <div className="w-full h-2.5 bg-surface-hover rounded-full overflow-hidden border border-border-subtle">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  quotaPercent >= 95
                    ? "bg-gradient-to-r from-rose-500 to-red-600"
                    : quotaPercent >= 80
                    ? "bg-gradient-to-r from-amber-500 to-orange-500"
                    : "bg-gradient-to-r from-cyan-500 to-blue-500"
                )}
                style={{ width: `${quotaPercent}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 self-start md:self-center shrink-0">
            <Link href="/contact">
              <Button size="sm" variant="outline" className="text-xs font-bold gap-1 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10">
                Upgrade Plan <ArrowUpRight className="h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      )}

      {/* Filters & Search Controls */}
      <Card padding={false}>
        <div className="p-4 border-b border-border-subtle flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-dim" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search users by name, email, company, or phone..."
              className="w-full pl-9 pr-4 py-2 bg-surface-hover border border-border-medium rounded-xl text-xs text-text-primary focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 border border-border-medium rounded-xl text-xs bg-surface-hover text-text-primary focus:border-cyan-500 focus:outline-none"
            >
              {ALL_ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-border-medium rounded-xl text-xs bg-surface-hover text-text-primary focus:border-cyan-500 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Users</option>
              <option value="INACTIVE">Inactive Users</option>
            </select>
          </div>
        </div>

        {/* Users List */}
        {isLoading ? (
          <div className="p-12 text-center text-xs text-text-muted">Loading users...</div>
        ) : users.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <Users className="h-10 w-10 text-text-dim mx-auto" />
            <p className="text-sm font-semibold text-text-primary">No users found</p>
            <p className="text-xs text-text-muted">Try adjusting your filters or search query.</p>
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {users.map((user: any) => (
              <div
                key={user.id}
                className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-surface-hover/50 transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <Avatar name={user.name} src={user.image} size="md" />
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-text-primary">{user.name}</span>
                      <Badge className={cn("text-[10px] font-bold", roleColors[user.role] || "bg-gray-500/15 text-text-secondary")}>
                        {user.role}
                      </Badge>
                      {user.isActive ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-400" /> Inactive
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
                      <span className="flex items-center gap-1">
                        <Mail className="h-3 w-3 text-text-dim" /> {user.email}
                      </span>
                      {user.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3 text-text-dim" /> {user.phone}
                        </span>
                      )}
                      {user.company && (
                        <span className="flex items-center gap-1 font-medium text-text-secondary">
                          <Building2 className="h-3 w-3 text-text-dim" /> {user.company}
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] text-text-dim">
                      {user._count?.assignedWorkOrders || 0} work orders • {user._count?.supportTickets || 0} tickets • Joined {formatDate(user.createdAt)}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 self-start md:self-center shrink-0">
                  {/* Role Selector */}
                  <select
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value)}
                    className="px-2.5 py-1 border border-border-medium rounded-lg text-xs bg-surface text-text-primary focus:border-cyan-500 focus:outline-none font-medium"
                  >
                    {ALL_ROLES.filter((r) => r.value !== "ALL").map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>

                  {/* Toggle Active/Inactive */}
                  <button
                    onClick={() => handleToggleActive(user.id, user.isActive)}
                    className={cn(
                      "p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition-all",
                      user.isActive
                        ? "border-emerald-500/30 text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20"
                        : "border-rose-500/30 text-rose-400 bg-rose-500/10 hover:bg-rose-500/20"
                    )}
                    title={user.isActive ? "Deactivate User" : "Activate User"}
                  >
                    {user.isActive ? <UserCheck className="h-3.5 w-3.5" /> : <UserX className="h-3.5 w-3.5" />}
                  </button>

                  {/* Documents & Compliance */}
                  <button
                    onClick={() => setViewingDocsUser(user)}
                    className="px-2 py-1.5 rounded-lg border border-border-medium text-text-secondary hover:text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/30 transition-colors flex items-center gap-1.5 text-xs font-bold"
                    title="View Documents & Compliance (CV, License, COI, W9)"
                  >
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Docs</span>
                  </button>

                  {/* Edit */}
                  <button
                    onClick={() => setEditingUser(user)}
                    className="p-1.5 rounded-lg border border-border-medium text-text-muted hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
                    title="Edit User & Password"
                  >
                    <Edit className="h-3.5 w-3.5" />
                  </button>

                  {/* Delete */}
                  <button
                    onClick={() => handleDeleteUser(user.id)}
                    className="p-1.5 rounded-lg border border-border-medium text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Delete User"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Add User Modal */}
      {isAddModalOpen && (
        <AddUserModal
          isOpen={isAddModalOpen}
          onClose={() => setIsAddModalOpen(false)}
          form={addForm}
          setForm={setAddForm}
          onSubmit={handleAddSubmit}
          loading={addingUser}
          quota={quota}
        />
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={() => {
            setEditingUser(null);
            refetch();
          }}
        />
      )}

      {/* User Documents & Compliance Modal */}
      {viewingDocsUser && (
        <Modal
          isOpen={!!viewingDocsUser}
          onClose={() => setViewingDocsUser(null)}
          title={`${viewingDocsUser.name}'s Documents & Compliance`}
          size="xl"
        >
          <div className="py-2">
            <UserDocumentsTab
              userId={viewingDocsUser.id}
              userName={viewingDocsUser.name}
            />
          </div>
        </Modal>
      )}
    </div>
  );
}

function AddUserModal({
  isOpen,
  onClose,
  form,
  setForm,
  onSubmit,
  loading,
  quota,
}: {
  isOpen: boolean;
  onClose: () => void;
  form: any;
  setForm: (f: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  loading: boolean;
  quota?: any;
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create New User Account" size="md">
      <form onSubmit={onSubmit} className="space-y-4">
        {quota?.isLimitReached ? (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 space-y-1">
            <p className="font-bold">Plan User Limit Reached</p>
            <p>Your {quota.planName} plan allows up to {quota.maxAllowed} users. Please upgrade your plan to add more accounts.</p>
          </div>
        ) : (
          <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-xs text-text-secondary">
            Creating account under <strong>{quota?.planName || "Starter"} Plan</strong> ({quota?.currentCount || 0}/{quota?.maxAllowed || 5} used).
          </div>
        )}

        <Input
          label="Full Name *"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          placeholder="John Smith"
          required
        />
        <Input
          label="Email Address *"
          type="email"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          placeholder="john@company.com"
          required
        />
        <Input
          label="Password *"
          type="password"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          placeholder="••••••••"
          required
        />

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            placeholder="(555) 000-0000"
          />
          <Input
            label="Company"
            value={form.company}
            onChange={(e) => setForm({ ...form, company: e.target.value })}
            placeholder="Apex Preservation"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-text-secondary uppercase mb-1.5">
            Role Assignment *
          </label>
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="block w-full rounded-xl border border-border-medium bg-surface-hover px-3 py-2 text-sm text-text-primary focus:border-cyan-500 focus:outline-none"
          >
            {ALL_ROLES.filter((r) => r.value !== "ALL").map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle mt-6">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="submit"
            loading={loading}
            disabled={quota?.isLimitReached}
            className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold"
          >
            Create User Account
          </Button>
        </div>
      </form>
    </Modal>
  );
}

function EditUserModal({
  user,
  onClose,
  onSaved,
}: {
  user: any;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    name: user.name || "",
    email: user.email || "",
    phone: user.phone || "",
    company: user.company || "",
    role: user.role || "CONTRACTOR",
    isActive: user.isActive ?? true,
    newPassword: "",
  });
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Name and email are required");
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        id: user.id,
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || null,
        company: form.company.trim() || null,
        role: form.role,
        isActive: form.isActive,
      };
      if (form.newPassword.trim()) {
        payload.password = form.newPassword.trim();
      }

      const res = await fetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("Failed to update user");
      toast.success("User updated successfully");
      onSaved();
    } catch (err: any) {
      toast.error(err.message || "Failed to update user");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} />
      <div className="relative w-full max-w-lg mx-4 bg-surface border border-border-medium rounded-2xl shadow-2xl shadow-black/60 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle">
          <h2 className="text-base font-bold text-text-primary flex items-center gap-2">
            <Edit className="h-4 w-4 text-cyan-400" /> Edit User Account
          </h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-surface-hover text-text-muted transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="px-6 py-5 space-y-4">
          <div className="flex items-center gap-3 mb-2 p-3 rounded-xl bg-surface-hover border border-border-subtle">
            <Avatar name={form.name} src={user.image} size="md" />
            <div>
              <p className="text-sm font-bold text-text-primary">{form.name || "User"}</p>
              <p className="text-xs text-text-muted">{form.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Full Name *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
            />
            <Input
              label="Email *"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="(555) 123-4567"
            />
            <Input
              label="Company"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
              placeholder="Company name"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1.5">
                Role Assignment
              </label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="w-full px-3 py-2 bg-surface-hover border border-border-medium rounded-xl text-xs text-text-primary focus:border-cyan-500 focus:outline-none"
              >
                {ALL_ROLES.filter((r) => r.value !== "ALL").map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs font-semibold text-text-secondary block mb-1.5">
                Account Status
              </label>
              <div className="flex items-center gap-3 h-[38px]">
                <button
                  type="button"
                  onClick={() => setForm({ ...form, isActive: !form.isActive })}
                  className={cn(
                    "relative inline-flex h-6 w-11 items-center rounded-full transition-colors",
                    form.isActive ? "bg-emerald-500" : "bg-gray-600"
                  )}
                >
                  <span
                    className={cn(
                      "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                      form.isActive ? "translate-x-6" : "translate-x-1"
                    )}
                  />
                </button>
                <span className="text-xs font-bold text-text-secondary">
                  {form.isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>

          <Input
            label="Reset Password (Optional)"
            type="password"
            value={form.newPassword}
            onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
            placeholder="Enter new password to change"
          />

          <div className="flex justify-end gap-3 pt-4 border-t border-border-subtle mt-4">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={saving} className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold">
              Save Changes
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
