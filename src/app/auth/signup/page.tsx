"use client";

import Link from "next/link";
import { Button } from "@/components/ui";
import { Shield, Lock, ArrowRight, Mail, Building2, UserPlus, CheckCircle2 } from "lucide-react";

export default function SignUp() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-hover p-4 relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-cyan-500/10 via-purple-500/5 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-gradient-to-t from-purple-500/10 to-transparent rounded-full blur-3xl" />

      <div className="w-full max-w-md relative z-10 space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-600 mb-2 shadow-lg shadow-cyan-500/20">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-text-primary">Admin-Managed Registration</h1>
          <p className="text-xs text-text-muted">PropPreserve Organization Access</p>
        </div>

        <div className="bg-surface/80 backdrop-blur-xl rounded-3xl border border-border-subtle shadow-2xl shadow-black/50 p-8 space-y-6 text-center">
          <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-xs text-text-secondary leading-relaxed space-y-2">
            <p className="font-bold text-cyan-400">
              Public self-registration is currently disabled.
            </p>
            <p className="text-text-muted text-[11px]">
              User accounts and role permissions (Contractor, Processor, Coordinator, Client) are provisioned directly by your company administrator.
            </p>
          </div>

          <div className="space-y-3 text-left text-xs text-text-muted">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Contact your company administrator to obtain login credentials.</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>Administrators can create and invite users in the Admin panel.</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>For new enterprise inquiries, please get in touch with sales.</span>
            </div>
          </div>

          <div className="pt-2 space-y-2.5">
            <Link href="/auth/signin" className="block w-full">
              <Button className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-bold text-xs">
                Go to Sign In
                <ArrowRight className="h-4 w-4 ml-1.5" />
              </Button>
            </Link>

            <Link href="/contact" className="block w-full">
              <Button variant="outline" className="w-full text-xs font-semibold">
                <Mail className="h-3.5 w-3.5 mr-1.5" />
                Contact Sales / Support
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
