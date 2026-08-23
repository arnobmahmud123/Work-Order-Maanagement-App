"use client";

import Link from "next/link";
import { Button } from "@/components/ui";
import { Shield, Lock, Eye, FileText, ArrowLeft } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background text-text-primary">
      {/* Header */}
      <header className="border-b border-border-subtle bg-surface/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-bold text-text-secondary hover:text-text-primary">
            <ArrowLeft className="h-4 w-4" /> Back to Home
          </Link>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-cyan-400" />
            <span className="font-bold text-sm">PropPreserve Privacy Policy</span>
          </div>
          <Link href="/contact">
            <Button size="sm" variant="outline">Contact Us</Button>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12 space-y-8">
        <div className="space-y-2 border-b border-border-subtle pb-6">
          <h1 className="text-3xl font-black tracking-tight">Privacy Policy</h1>
          <p className="text-xs text-text-muted">Last Updated: August 2026</p>
        </div>

        <section className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <Lock className="h-4 w-4 text-cyan-400" /> 1. Information We Collect
          </h2>
          <p>
            PropPreserve collects information necessary to facilitate property preservation work orders, contractor field coordination, GPS photo geotagging, invoicing, and quality assurance review.
          </p>
          <ul className="list-disc pl-5 space-y-1.5 text-xs text-text-muted">
            <li><strong>Account & Organization Data:</strong> Name, business email, organization affiliation, and role assignment.</li>
            <li><strong>Work Order & Field Data:</strong> Property addresses, service descriptions, bids, contractor notes, and completion timestamps.</li>
            <li><strong>Geotagged Photo & EXIF Data:</strong> GPS coordinates, altitude, orientation, and device timestamps embedded in field inspection photos.</li>
          </ul>
        </section>

        <section className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <Eye className="h-4 w-4 text-cyan-400" /> 2. How We Use Information
          </h2>
          <p>
            Information collected is strictly utilized to process property preservation jobs, enforce SLA timelines, trigger automated operational workflows, and generate client compliance reports.
          </p>
        </section>

        <section className="space-y-4 text-sm text-text-secondary leading-relaxed">
          <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <FileText className="h-4 w-4 text-cyan-400" /> 3. Data Security & Storage
          </h2>
          <p>
            All data and high-resolution photo assets are encrypted in transit and stored in secure cloud infrastructure with strict access control and multi-tenant isolation.
          </p>
        </section>
      </main>
    </div>
  );
}
