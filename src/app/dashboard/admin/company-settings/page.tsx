"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, Button, Input, Badge } from "@/components/ui";
import { Building2, Phone, Sparkles, Mail, Save, AlertCircle, CheckCircle2 } from "lucide-react";
import toast from "react-hot-toast";

export default function CompanySettingsPage() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    twilioPhone: "",
    twilioSid: "",
    twilioToken: "",
    elevenlabsAgentId: "",
    elevenlabsPhoneId: "",
    smtpHost: "",
    smtpPort: "",
    smtpUser: "",
    smtpPass: "",
    smtpFrom: "",
  });

  useEffect(() => {
    fetchCompanySettings();
  }, []);

  async function fetchCompanySettings() {
    try {
      const res = await fetch("/api/company/settings");
      if (res.ok) {
        const data = await res.json();
        setForm({
          twilioPhone: data.twilioPhone || "",
          twilioSid: data.twilioSid || "",
          twilioToken: "", // Don't expose token to frontend
          elevenlabsAgentId: data.elevenlabsAgentId || "",
          elevenlabsPhoneId: data.elevenlabsPhoneId || "",
          smtpHost: data.smtpHost || "",
          smtpPort: data.smtpPort ? data.smtpPort.toString() : "",
          smtpUser: data.smtpUser || "",
          smtpPass: "", // Don't expose password
          smtpFrom: data.smtpFrom || "",
        });
      }
    } catch (err) {
      console.error("Failed to load company settings", err);
      toast.error("Failed to load settings");
    } finally {
      setLoading(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/company/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || "Failed to update settings");
        return;
      }
      toast.success("Company settings updated successfully!");
    } catch (error) {
      toast.error("An error occurred");
    } finally {
      setSaving(false);
    }
  }

  if (role !== "ADMIN" && role !== "SUPER_ADMIN") {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-text-muted mt-2">Only administrators can access company settings.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Company Integration Settings</h1>
          <p className="text-text-muted mt-1">Configure your telephony, AI, and email integrations.</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <div className="h-4 w-4 rounded-full border-2 border-white/20 border-t-white animate-spin" /> : <Save className="h-4 w-4" />}
          Save Settings
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Telephony & AI */}
        <div className="space-y-6">
          <Card className="bg-surface border-border-subtle shadow-sm">
            <CardHeader className="border-b border-border-subtle pb-4 bg-surface-hover/30">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-500/10 rounded-lg">
                  <Phone className="h-5 w-5 text-blue-500" />
                </div>
                <CardTitle className="text-lg">Twilio Configuration</CardTitle>
              </div>
            </CardHeader>
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Twilio Phone Number</label>
                <Input
                  value={form.twilioPhone}
                  onChange={(e) => setForm({ ...form, twilioPhone: e.target.value })}
                  placeholder="+1234567890"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Account SID</label>
                <Input
                  value={form.twilioSid}
                  onChange={(e) => setForm({ ...form, twilioSid: e.target.value })}
                  placeholder="ACxxxxxxxxxxxxx"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Auth Token</label>
                <Input
                  type="password"
                  value={form.twilioToken}
                  onChange={(e) => setForm({ ...form, twilioToken: e.target.value })}
                  placeholder={form.twilioSid ? "•••••••• (Leave blank to keep existing)" : "Enter Auth Token"}
                />
              </div>
            </div>
          </Card>

          <Card className="bg-surface border-border-subtle shadow-sm">
            <CardHeader className="border-b border-border-subtle pb-4 bg-surface-hover/30">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-cyan-500/10 rounded-lg">
                  <Sparkles className="h-5 w-5 text-cyan-500" />
                </div>
                <CardTitle className="text-lg">ElevenLabs AI</CardTitle>
              </div>
            </CardHeader>
            <div className="p-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">AI Agent ID</label>
                <Input
                  value={form.elevenlabsAgentId}
                  onChange={(e) => setForm({ ...form, elevenlabsAgentId: e.target.value })}
                  placeholder="agent_xxxxxxxxxxxxx"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">ElevenLabs Phone Number ID</label>
                <Input
                  value={form.elevenlabsPhoneId}
                  onChange={(e) => setForm({ ...form, elevenlabsPhoneId: e.target.value })}
                  placeholder="pn_xxxxxxxxxxxxx"
                />
              </div>
            </div>
          </Card>
        </div>

        {/* Email Settings */}
        <div className="space-y-6">
          <Card className="bg-surface border-border-subtle shadow-sm h-full">
            <CardHeader className="border-b border-border-subtle pb-4 bg-surface-hover/30">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-violet-500/10 rounded-lg">
                  <Mail className="h-5 w-5 text-violet-500" />
                </div>
                <CardTitle className="text-lg">SMTP Email Settings</CardTitle>
              </div>
            </CardHeader>
            <div className="p-5 space-y-4">
              <div className="p-4 bg-violet-500/5 border border-violet-500/20 rounded-xl mb-4">
                <p className="text-sm text-violet-600 dark:text-violet-400">
                  Configure your SMTP credentials to send all automated emails and notifications from your own custom domain name.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <label className="text-sm font-medium">SMTP Host</label>
                  <Input
                    value={form.smtpHost}
                    onChange={(e) => setForm({ ...form, smtpHost: e.target.value })}
                    placeholder="smtp.example.com"
                  />
                </div>
                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                  <label className="text-sm font-medium">SMTP Port</label>
                  <Input
                    value={form.smtpPort}
                    onChange={(e) => setForm({ ...form, smtpPort: e.target.value })}
                    placeholder="587"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">SMTP Username</label>
                <Input
                  value={form.smtpUser}
                  onChange={(e) => setForm({ ...form, smtpUser: e.target.value })}
                  placeholder="user@example.com"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">SMTP Password</label>
                <Input
                  type="password"
                  value={form.smtpPass}
                  onChange={(e) => setForm({ ...form, smtpPass: e.target.value })}
                  placeholder={form.smtpHost ? "•••••••• (Leave blank to keep existing)" : "Enter password"}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">From Address</label>
                <Input
                  value={form.smtpFrom}
                  onChange={(e) => setForm({ ...form, smtpFrom: e.target.value })}
                  placeholder="Acme Support <support@acme.com>"
                />
                <p className="text-xs text-text-muted">This will be the sender name and address for all outgoing emails.</p>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
