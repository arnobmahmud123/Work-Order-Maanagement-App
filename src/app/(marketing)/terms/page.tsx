"use client";

import Link from "next/link";
import { Button } from "@/components/ui";
import { Shield, FileCheck, Scale, ArrowLeft } from "lucide-react";

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-background text-text-primary">
      {/* Header */}
      <header className="border-b border-border-subtle bg-surface/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-bold text-text-secondary hover:text-text-primary">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
          <div className="flex items-center gap-2">
            <Scale className="h-5 w-5 text-cyan-400" />
            <span className="font-bold text-sm">PropPreserve Terms of Service</span>
          </div>
          <Link href="/contact">
            <Button size="sm" variant="outline">Contact Us</Button>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
        <div className="space-y-2 border-b border-border-subtle pb-6">
          <h1 className="text-3xl font-black tracking-tight">Terms of Service</h1>
          <p className="text-xs text-text-muted">Last Updated: August 2026</p>
        </div>

        <section className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <FileCheck className="h-4 w-4 text-cyan-400" /> 1. Platform Use & User Accounts
          </h2>
          <p>
            PropPreserve is an enterprise property preservation workflow management platform. User accounts and access roles are managed and provisioned directly by authorized organization administrators.
          </p>
        </section>

        <section className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <Shield className="h-4 w-4 text-cyan-400" /> 2. Work Order & Field Compliance
          </h2>
          <p>
            Contractors and field vendors agree to upload authentic, unedited GPS-verified photos and accurate field reports for all completed tasks and inspections.
          </p>
        </section>
      </main>
    </div>
  );
}
