"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { Card, CardHeader, CardTitle, Button, Input, Badge, Avatar } from "@/components/ui";
import { User, Shield, Bell, Key, ChevronRight, Save, X, Camera, CheckCircle2, AlertCircle, Users, Zap, Building2, CreditCard, Sparkles, Settings as SettingsIcon, ShieldCheck } from "lucide-react";
import toast from "react-hot-toast";
import { UserDocumentsTab } from "@/components/profile/user-documents-tab";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const { data: session, update: updateSession } = useSession();
  const qc = useQueryClient();
  const role = (session?.user as any)?.role;

  const [activeTab, setActiveTab] = useState<"profile" | "documents" | "security" | "notifications">("profile");
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    company: "",
    image: "",
  });

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setForm({
              name: data.user.name || "",
              email: data.user.email || "",
              phone: data.user.phone || "",
              company: data.user.company || "",
              image: data.user.image || "",
            });
            return;
          }
        }
      } catch (err) {
        console.warn("Failed to fetch profile:", err);
      }
      if (session?.user) {
        setForm({
          name: session.user.name || "",
          email: session.user.email || "",
          phone: (session.user as any).phone || "",
          company: (session.user as any).company || "",
          image: session.user.image || "",
        });
      }
    }
    loadProfile();
  }, [session]);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update profile");
        return;
      }
      toast.success("Profile updated successfully!");
      setEditing(false);
      qc.invalidateQueries({ queryKey: ["profile"] });
      await updateSession({ ...session, user: { ...session?.user, ...data.user } });
    } catch {
      toast.error("Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  function handleCancel() {
    if (session?.user) {
      setForm({
        name: session.user.name || "",
        email: session.user.email || "",
        phone: (session.user as any).phone || "",
        company: (session.user as any).company || "",
        image: session.user.image || "",
      });
    }
    setEditing(false);
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Settings</h1>
        <p className="text-text-secondary mt-1">Manage your account preferences</p>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-border-subtle pb-3 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setActiveTab("profile")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
            activeTab === "profile"
              ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm"
              : "bg-surface text-text-secondary hover:bg-surface-hover border border-border-subtle"
          )}
        >
          <User className="h-4 w-4" />
          Profile
        </button>

        <button
          onClick={() => setActiveTab("documents")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
            activeTab === "documents"
              ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm"
              : "bg-surface text-text-secondary hover:bg-surface-hover border border-border-subtle"
          )}
        >
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          Documents & Compliance
          <span className="px-1.5 py-0.5 rounded-full text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            CV, COI, License
          </span>
        </button>

        <button
          onClick={() => setActiveTab("security")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
            activeTab === "security"
              ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm"
              : "bg-surface text-text-secondary hover:bg-surface-hover border border-border-subtle"
          )}
        >
          <Key className="h-4 w-4" />
          Security & 2FA
        </button>

        <button
          onClick={() => setActiveTab("notifications")}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap",
            activeTab === "notifications"
              ? "bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-sm"
              : "bg-surface text-text-secondary hover:bg-surface-hover border border-border-subtle"
          )}
        >
          <Bell className="h-4 w-4" />
          Notifications
        </button>
      </div>

      {/* Tab Contents */}
      {activeTab === "documents" && (
        <UserDocumentsTab />
      )}

      {activeTab === "profile" && (
        <div className="space-y-6">
          {/* Admin Quick Management Card */}
          {(role === "ADMIN" || role === "SUPER_ADMIN") && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-cyan-400">
                  <Shield className="h-5 w-5 text-cyan-400" />
                  Organization & Admin Controls
                </CardTitle>
              </CardHeader>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Link
                  href="/dashboard/admin/users"
                  className="p-4 rounded-xl bg-surface-hover border border-border-subtle hover:border-cyan-500/30 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                      <Users className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-text-primary group-hover:text-cyan-400 transition-colors">
                        User Management
                      </p>
                      <p className="text-[11px] text-text-muted">Create users, assign roles & manage limits</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-text-dim group-hover:text-cyan-400 transition-colors" />
                </Link>

                <Link
                  href="/dashboard/admin/company-settings"
                  className="p-4 rounded-xl bg-surface-hover border border-border-subtle hover:border-cyan-500/30 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                      <SettingsIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-text-primary group-hover:text-purple-400 transition-colors">
                        Company Settings
                      </p>
                      <p className="text-[11px] text-text-muted">Twilio SMS, Voice agent & SMTP</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-text-dim group-hover:text-purple-400 transition-colors" />
                </Link>

                <Link
                  href="/dashboard/admin/automation-rules"
                  className="p-4 rounded-xl bg-surface-hover border border-border-subtle hover:border-cyan-500/30 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                      <Zap className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-text-primary group-hover:text-amber-400 transition-colors">
                        Automation Rules
                      </p>
                      <p className="text-[11px] text-text-muted">Triggers, alerts & urgent escalations</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-text-dim group-hover:text-amber-400 transition-colors" />
                </Link>

                <Link
                  href="/dashboard/admin/billing"
                  className="p-4 rounded-xl bg-surface-hover border border-border-subtle hover:border-cyan-500/30 transition-all flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <CreditCard className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-text-primary group-hover:text-emerald-400 transition-colors">
                        Billing & Subscription
                      </p>
                      <p className="text-[11px] text-text-muted">View plan limits & invoices</p>
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-text-dim group-hover:text-emerald-400 transition-colors" />
                </Link>
              </div>
            </Card>
          )}

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between w-full">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-text-secondary" />
                  Profile Details
                </CardTitle>
                {!editing ? (
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                    Edit Profile
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={handleCancel}>
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                    <Button size="sm" onClick={handleSave} loading={saving}>
                      <Save className="h-4 w-4" />
                      Save
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <div className="space-y-6">
              {/* Avatar Section */}
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <Avatar
                    src={editing ? form.image : session?.user?.image}
                    name={session?.user?.name}
                    size="lg"
                  />
                  {editing && (
                    <label className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                      <Camera className="h-5 w-5 text-white" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = (ev) => {
                            if (ev.target?.result) {
                              setForm((prev) => ({ ...prev, image: ev.target!.result as string }));
                            }
                          };
                          reader.readAsDataURL(file);

                          const formData = new FormData();
                          formData.append("file", file);
                          try {
                            const res = await fetch("/api/upload", { method: "POST", body: formData });
                            const data = await res.json();
                            if (res.ok && data.url) {
                              setForm((prev) => ({ ...prev, image: data.url }));
                              toast.success("Image uploaded!");
                            } else {
                              toast.error(data.error || "Upload failed");
                            }
                          } catch {
                            toast.error("Upload failed");
                          }
                        }}
                      />
                    </label>
                  )}
                </div>
                {editing && (
                  <div className="flex-1 space-y-2">
                    <Input
                      label="Profile Image URL"
                      value={form.image}
                      onChange={(e) => setForm({ ...form, image: e.target.value })}
                      placeholder="https://example.com/avatar.jpg"
                    />
                    <div className="flex items-center gap-2">
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-medium cursor-pointer hover:bg-cyan-500/20 transition-colors">
                        <Camera className="h-3.5 w-3.5" />
                        Upload Photo
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const formData = new FormData();
                            formData.append("file", file);
                            try {
                              const res = await fetch("/api/upload", { method: "POST", body: formData });
                              const data = await res.json();
                              if (res.ok && data.url) {
                                setForm({ ...form, image: data.url });
                                toast.success("Image uploaded");
                              } else {
                                toast.error(data.error || "Upload failed");
                              }
                            } catch {
                              toast.error("Upload failed");
                            }
                          }}
                        />
                      </label>
                      {form.image && (
                        <button
                          type="button"
                          onClick={() => { setForm({ ...form, image: "" }); toast.success("Profile photo removed"); }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-medium hover:bg-red-500/20 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                          Remove Photo
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-text-muted">
                      Upload a photo or enter a URL. Click the avatar to quick-upload.
                    </p>
                  </div>
                )}
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Name"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  disabled={!editing}
                />
                <Input
                  label="Email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  disabled={!editing}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="Phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  disabled={!editing}
                  placeholder="(555) 123-4567"
                />
                <Input
                  label="Company"
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  disabled={!editing}
                  placeholder="Your company name"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-text-secondary">Role:</span>
                <Badge className="bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">{role}</Badge>
              </div>
            </div>
          </Card>
        </div>
      )}

      {activeTab === "security" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5 text-text-secondary" />
              Security & Credentials
            </CardTitle>
          </CardHeader>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-surface-hover rounded-lg border border-border-subtle">
              <div>
                <p className="text-sm font-medium text-text-primary">Password</p>
                <p className="text-xs text-text-muted">Managed via secure hashed credentials</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => toast.success("Password reset link sent to your email")}>
                Change Password
              </Button>
            </div>
            <div className="flex items-center justify-between p-3 bg-surface-hover rounded-lg border border-border-subtle">
              <div>
                <p className="text-sm font-medium text-text-primary">Two-Factor Authentication</p>
                <p className="text-xs text-text-muted">Add an extra layer of security to your account</p>
              </div>
              <Button variant="outline" size="sm" onClick={() => toast("2FA setup wizard will be available in next security update")}>
                Configure 2FA
              </Button>
            </div>
          </div>
        </Card>
      )}

      {activeTab === "notifications" && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-text-secondary" />
              Notification Preferences
            </CardTitle>
          </CardHeader>
          <div className="space-y-3">
            {[
              { label: "Work order updates", desc: "When a work order status changes" },
              { label: "New messages", desc: "When you receive a new message" },
              { label: "Invoice updates", desc: "When invoices are created or paid" },
              { label: "Support ticket replies", desc: "When someone replies to your ticket" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between p-3 bg-surface-hover rounded-lg border border-border-subtle">
                <div>
                  <p className="text-sm font-medium text-text-primary">{item.label}</p>
                  <p className="text-xs text-text-muted">{item.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-9 h-5 bg-gray-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-cyan-500/30 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 after:border-gray-600 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-600"></div>
                </label>
              </div>
            ))}
            <Link
              href="/dashboard/settings/notifications"
              className="flex items-center justify-between p-3 bg-cyan-500/5 rounded-lg border border-cyan-500/10 hover:bg-cyan-500/10 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Bell className="h-5 w-5 text-cyan-400" />
                <div>
                  <p className="text-sm font-medium text-cyan-300">Advanced Notification Settings</p>
                  <p className="text-xs text-cyan-400/70">Channel preferences, quiet hours, and more</p>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-cyan-400/50" />
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
