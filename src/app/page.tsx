"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui";
import {
  Shield,
  ClipboardList,
  Camera,
  MessageSquare,
  Receipt,
  Users,
  CheckCircle2,
  ArrowRight,
  Star,
  Zap,
  BarChart3,
  Clock,
  Globe,
  ChevronRight,
  ChevronDown,
  Play,
  Sparkles,
  Building2,
  Wrench,
  TrendingUp,
  Lock,
  Layers,
  Smartphone,
} from "lucide-react";

const features = [
  {
    icon: ClipboardList,
    title: "Work Order Management",
    desc: "Create, assign, and track property preservation work orders from start to finish with real-time status updates.",
    color: "cyan",
    gradient: "from-cyan-500 to-blue-600",
  },
  {
    icon: Camera,
    title: "Field Documentation",
    desc: "Before, during, and after photo uploads with automatic geo-tagging and timestamp organization.",
    color: "purple",
    gradient: "from-violet-500 to-purple-600",
  },
  {
    icon: MessageSquare,
    title: "Team Messaging",
    desc: "Slack-like threaded conversations tied to work orders for seamless team communication.",
    color: "blue",
    gradient: "from-blue-500 to-indigo-600",
  },
  {
    icon: Receipt,
    title: "Invoicing & Billing",
    desc: "Generate professional invoices, track payments, and manage contractor billing in one place.",
    color: "emerald",
    gradient: "from-emerald-500 to-teal-600",
  },
  {
    icon: Users,
    title: "Role-Based Access",
    desc: "Client, contractor, coordinator, and admin dashboards with granular permission controls.",
    color: "amber",
    gradient: "from-amber-500 to-orange-600",
  },
  {
    icon: BarChart3,
    title: "Analytics & Reports",
    desc: "Real-time dashboards with completion rates, revenue tracking, and performance insights.",
    color: "rose",
    gradient: "from-rose-500 to-pink-600",
  },
];

const stats = [
  { value: "2,400+", label: "Work Orders Completed" },
  { value: "98.7%", label: "On-Time Completion" },
  { value: "150+", label: "Active Contractors" },
  { value: "4.9★", label: "Client Satisfaction" },
];

const serviceTypes = [
  { name: "Grass Cut", icon: "🌿" },
  { name: "Debris Removal", icon: "🗑️" },
  { name: "Winterization", icon: "❄️" },
  { name: "Board-Up", icon: "🪟" },
  { name: "Inspection", icon: "🔍" },
  { name: "Mold Remediation", icon: "🧪" },
  { name: "Roof Repair", icon: "🏠" },
  { name: "Lock Change", icon: "🔐" },
  { name: "Pool Drain", icon: "🏊" },
];

const testimonials = [
  {
    name: "Marcus Johnson",
    role: "Operations Director, Premier Preservation",
    quote: "PropPreserve cut our admin time by 60%. The work order system alone paid for itself in the first month.",
    avatar: "MJ",
  },
  {
    name: "Sarah Chen",
    role: "Field Supervisor, National Property Care",
    quote: "The mobile experience is incredible. My crews can upload photos and update status right from the job site.",
    avatar: "SC",
  },
  {
    name: "David Rodriguez",
    role: "Owner, Rodriguez Property Services",
    quote: "Finally, a platform built specifically for our industry. The invoicing and contractor management is top-notch.",
    avatar: "DR",
  },
];

const colorMap: Record<string, { bg: string; text: string; border: string; glow: string }> = {
  cyan: {
    bg: "bg-cyan-500/10",
    text: "text-cyan-400",
    border: "border-cyan-500/20",
    glow: "shadow-cyan-500/20",
  },
  purple: {
    bg: "bg-violet-500/10",
    text: "text-violet-400",
    border: "border-violet-500/20",
    glow: "shadow-violet-500/20",
  },
  blue: {
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/20",
    glow: "shadow-blue-500/20",
  },
  emerald: {
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/20",
    glow: "shadow-emerald-500/20",
  },
  amber: {
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/20",
    glow: "shadow-amber-500/20",
  },
  rose: {
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    border: "border-rose-500/20",
    glow: "shadow-rose-500/20",
  },
};

export default function HomePage() {
  const [navVisible, setNavVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);

  const handleScroll = useCallback(() => {
    const currentScrollY = window.scrollY;
    if (currentScrollY < 10) {
      setNavVisible(true);
    } else if (currentScrollY > lastScrollY + 5) {
      setNavVisible(false); // scrolling down
    } else if (currentScrollY < lastScrollY - 5) {
      setNavVisible(true); // scrolling up
    }
    setLastScrollY(currentScrollY);
  }, [lastScrollY]);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  return (
    <div className="min-h-screen bg-background text-foreground overflow-hidden">
      {/* ─── Nav ────────────────────────────────────────────────────── */}
      <nav
        className={`sticky top-0 z-50 glass border-b border-border-subtle transition-transform duration-300 ${
          navVisible ? "translate-y-0" : "-translate-y-full"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center shadow-lg shadow-cyan-500/25 group-hover:shadow-cyan-500/40 transition-shadow">
                <Shield className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-black tracking-tight text-text-primary">
                Prop<span className="text-cyan-400 brand-accent">Preserve</span>
              </span>
            </Link>
            <div className="hidden md:flex items-center gap-1">
              {["Features", "Services", "Pricing", "About"].map((item) => (
                <Link
                  key={item}
                  href={`#${item.toLowerCase()}`}
                  className="px-4 py-2 text-sm font-medium text-text-muted hover:text-text-primary rounded-lg hover:bg-surface-hover transition-all"
                >
                  {item}
                </Link>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <Link href="/auth/signin">
                <Button variant="ghost" size="sm">Sign in</Button>
              </Link>
              <Link href="/auth/signup">
                <Button size="sm">
                  Get Started
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Nav show toggle — appears when nav is hidden */}
      {!navVisible && (
        <button
          onClick={() => setNavVisible(true)}
          className="fixed top-2 left-1/2 -translate-x-1/2 z-[60] h-7 w-12 rounded-b-xl bg-surface border border-t-0 border-border-subtle shadow-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-hover transition-all group"
          aria-label="Show navigation"
        >
          <ChevronDown className="h-3.5 w-3.5 group-hover:translate-y-0.5 transition-transform" />
        </button>
      )}

      {/* ─── Hero ───────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        {/* Ambient gradients */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-cyan-500/8 via-blue-500/5 to-transparent rounded-full blur-[120px]" />
          <div className="absolute top-20 right-0 w-[400px] h-[400px] bg-gradient-to-br from-violet-500/6 to-transparent rounded-full blur-[100px]" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-gradient-to-tr from-emerald-500/5 to-transparent rounded-full blur-[80px]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-28 sm:pt-28 sm:pb-36">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-surface border border-border-subtle mb-8 group hover:border-cyan-500/30 transition-colors">
              <div className="flex -space-x-1">
                {["bg-cyan-400", "bg-violet-400", "bg-emerald-400"].map((c, i) => (
                  <div key={i} className={`h-5 w-5 rounded-full ${c} border-2 border-background`} />
                ))}
              </div>
              <span className="text-xs font-semibold text-text-secondary">
                Trusted by 150+ preservation companies
              </span>
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            </div>

            {/* Headline */}
            <h1 className="text-5xl sm:text-7xl font-black tracking-tight leading-[1.05]">
              <span className="text-text-primary">Property preservation,</span>
              <br />
              <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-violet-400 bg-clip-text text-transparent">
                simplified.
              </span>
            </h1>

            <p className="mt-7 text-lg sm:text-xl text-text-muted max-w-2xl mx-auto leading-relaxed">
              The all-in-one platform for managing work orders, field documentation,
              team communication, and billing — built exclusively for property preservation.
            </p>

            {/* CTA Buttons */}
            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link href="/auth/signup">
                <Button size="lg" className="text-base px-8 py-4 shadow-xl shadow-cyan-500/20 hover:shadow-cyan-500/30">
                  Start free trial
                  <ArrowRight className="h-5 w-5" />
                </Button>
              </Link>
              <Link href="/contact">
                <Button variant="outline" size="lg" className="text-base px-8 py-4 group">
                  <Play className="h-4 w-4 text-cyan-400 group-hover:text-cyan-300" />
                  Watch demo
                </Button>
              </Link>
            </div>

            {/* Trust signals */}
            <div className="mt-12 flex items-center justify-center gap-6 text-xs text-text-dim">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>14-day free trial</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span>Cancel anytime</span>
              </div>
            </div>
          </div>

          {/* Hero visual — App preview mockup */}
          <div className="mt-20 relative max-w-5xl mx-auto">
            <div className="absolute -inset-4 bg-gradient-to-r from-cyan-500/20 via-violet-500/15 to-emerald-500/20 rounded-[2.5rem] blur-2xl opacity-50" />
            <div className="relative glass-card rounded-[2rem] p-1.5 overflow-hidden">
              {/* Fake browser chrome */}
              <div className="flex items-center gap-2 px-4 py-3 bg-surface-hover/80 rounded-t-[1.75rem]">
                <div className="flex gap-1.5">
                  <div className="h-3 w-3 rounded-full bg-rose-400/80" />
                  <div className="h-3 w-3 rounded-full bg-amber-400/80" />
                  <div className="h-3 w-3 rounded-full bg-emerald-400/80" />
                </div>
                <div className="flex-1 mx-8">
                  <div className="h-7 bg-surface rounded-lg border border-border-subtle flex items-center px-3">
                    <Lock className="h-3 w-3 text-text-dim mr-2" />
                    <span className="text-[11px] text-text-dim font-mono">app.proppreserve.com/dashboard</span>
                  </div>
                </div>
              </div>
              {/* Dashboard preview */}
              <div className="bg-surface rounded-b-[1.75rem] p-6 sm:p-8">
                <div className="grid grid-cols-4 gap-4 mb-6">
                  {[
                    { label: "Active Orders", value: "24", change: "+3", color: "cyan" },
                    { label: "In Progress", value: "12", change: "+1", color: "amber" },
                    { label: "Completed", value: "156", change: "+8", color: "emerald" },
                    { label: "Revenue", value: "$48.2K", change: "+12%", color: "violet" },
                  ].map((stat) => (
                    <div key={stat.label} className="bg-surface-hover rounded-xl p-4 border border-border-subtle">
                      <p className="text-[10px] font-bold text-text-dim uppercase tracking-wider">{stat.label}</p>
                      <p className="text-2xl font-black text-text-primary mt-1">{stat.value}</p>
                      <p className={`text-[11px] font-bold mt-1 ${
                        stat.color === "cyan" ? "text-cyan-400" :
                        stat.color === "amber" ? "text-amber-400" :
                        stat.color === "emerald" ? "text-emerald-400" : "text-violet-400"
                      }`}>
                        {stat.change} this week
                      </p>
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2 bg-surface-hover rounded-xl p-5 border border-border-subtle">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-sm font-bold text-text-primary">Work Order Activity</h3>
                      <span className="text-[10px] text-text-dim">Last 7 days</span>
                    </div>
                    {/* Fake chart bars */}
                    <div className="flex items-end gap-2 h-32">
                      {[40, 65, 45, 80, 55, 90, 70].map((h, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div
                            className="w-full rounded-t-lg bg-gradient-to-t from-cyan-500 to-blue-400 opacity-80"
                            style={{ height: `${h}%` }}
                          />
                          <span className="text-[9px] text-text-dim">{["M","T","W","T","F","S","S"][i]}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="bg-surface-hover rounded-xl p-5 border border-border-subtle">
                    <h3 className="text-sm font-bold text-text-primary mb-4">Recent Activity</h3>
                    <div className="space-y-3">
                      {[
                        { text: "WO-1847 completed", time: "2m ago", color: "bg-emerald-400" },
                        { text: "Invoice #284 sent", time: "15m ago", color: "bg-cyan-400" },
                        { text: "New photo uploaded", time: "1h ago", color: "bg-violet-400" },
                        { text: "Payment received", time: "3h ago", color: "bg-amber-400" },
                      ].map((item) => (
                        <div key={item.text} className="flex items-center gap-2">
                          <div className={`h-2 w-2 rounded-full ${item.color}`} />
                          <span className="text-xs text-text-secondary flex-1">{item.text}</span>
                          <span className="text-[10px] text-text-dim">{item.time}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Stats ──────────────────────────────────────────────────── */}
      <section className="relative py-16 border-y border-border-subtle bg-surface/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat) => (
              <div key={stat.label} className="text-center">
                <p className="text-3xl sm:text-4xl font-black bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent">
                  {stat.value}
                </p>
                <p className="mt-2 text-sm font-medium text-text-muted">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features ───────────────────────────────────────────────── */}
      <section id="features" className="relative py-24 sm:py-32">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-gradient-to-r from-violet-500/5 to-transparent rounded-full blur-[120px] -translate-y-1/2" />
          <div className="absolute top-1/3 right-0 w-[400px] h-[400px] bg-gradient-to-l from-cyan-500/5 to-transparent rounded-full blur-[100px]" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-bold uppercase tracking-wider mb-4">
              <Zap className="h-3 w-3" />
              Features
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-text-primary tracking-tight">
              Everything you need,
              <br />
              <span className="text-text-muted">nothing you don&apos;t</span>
            </h2>
            <p className="mt-5 text-lg text-text-muted max-w-xl mx-auto">
              Built from the ground up for the property preservation industry.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((feature) => {
              const c = colorMap[feature.color];
              return (
                <div
                  key={feature.title}
                  className="group glass-card p-7 hover:border-border-medium"
                >
                  <div className={`h-12 w-12 rounded-2xl ${c.bg} border ${c.border} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform shadow-lg ${c.glow}`}>
                    <feature.icon className={`h-6 w-6 ${c.text}`} />
                  </div>
                  <h3 className="text-lg font-bold text-text-primary mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-text-muted leading-relaxed">
                    {feature.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Services ───────────────────────────────────────────────── */}
      <section id="services" className="relative py-24 sm:py-32 bg-surface/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-4">
              <Wrench className="h-3 w-3" />
              Services
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-text-primary tracking-tight">
              Every service type,
              <br />
              <span className="text-text-muted">one platform</span>
            </h2>
          </div>

          <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-3">
            {serviceTypes.map((service) => (
              <div
                key={service.name}
                className="glass-card p-4 text-center group cursor-default"
              >
                <span className="text-2xl block mb-2 group-hover:scale-125 transition-transform">
                  {service.icon}
                </span>
                <span className="text-[11px] font-semibold text-text-secondary leading-tight block">
                  {service.name}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-12 glass-card p-8 sm:p-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  icon: Clock,
                  title: "Real-time Tracking",
                  desc: "Track every work order from assignment to completion with live status updates and GPS verification.",
                  color: "text-cyan-400",
                },
                {
                  icon: Smartphone,
                  title: "Mobile-First Design",
                  desc: "Full-featured mobile experience for field crews — photos, signatures, and updates from any device.",
                  color: "text-violet-400",
                },
                {
                  icon: Layers,
                  title: "Seamless Integrations",
                  desc: "Connect with your existing tools — QuickBooks, property management systems, and more.",
                  color: "text-emerald-400",
                },
              ].map((item) => (
                <div key={item.title} className="flex gap-4">
                  <div className="flex-shrink-0">
                    <item.icon className={`h-6 w-6 ${item.color}`} />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-text-primary mb-1">{item.title}</h3>
                    <p className="text-sm text-text-muted leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── Testimonials ───────────────────────────────────────────── */}
      <section className="relative py-24 sm:py-32">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/2 right-0 w-[500px] h-[500px] bg-gradient-to-l from-amber-500/5 to-transparent rounded-full blur-[120px] -translate-y-1/2" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider mb-4">
              <Star className="h-3 w-3" />
              Testimonials
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-text-primary tracking-tight">
              Loved by the teams
              <br />
              <span className="text-text-muted">who use it daily</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t) => (
              <div key={t.name} className="glass-card p-7">
                <div className="flex gap-1 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="h-4 w-4 text-amber-400 fill-amber-400" />
                  ))}
                </div>
                <p className="text-sm text-text-secondary leading-relaxed mb-6">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-gradient-to-br from-cyan-500 to-violet-500 flex items-center justify-center text-white text-xs font-bold">
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-text-primary">{t.name}</p>
                    <p className="text-[11px] text-text-dim">{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Pricing hint ───────────────────────────────────────────── */}
      <section id="pricing" className="relative py-24 sm:py-32 bg-surface/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 border border-violet-500/20 text-violet-400 text-xs font-bold uppercase tracking-wider mb-4">
              <TrendingUp className="h-3 w-3" />
              Pricing
            </div>
            <h2 className="text-3xl sm:text-5xl font-black text-text-primary tracking-tight">
              Simple, transparent pricing
            </h2>
            <p className="mt-5 text-lg text-text-muted max-w-xl mx-auto">
              Start free. Scale as you grow. No hidden fees.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {[
              {
                name: "Starter",
                price: "$49",
                period: "/mo",
                desc: "For small teams getting started",
                features: ["Up to 5 users", "50 work orders/mo", "Basic invoicing", "Email support"],
                cta: "Start free trial",
                popular: false,
              },
              {
                name: "Professional",
                price: "$149",
                period: "/mo",
                desc: "For growing preservation companies",
                features: ["Up to 25 users", "Unlimited work orders", "Advanced invoicing & reports", "Priority support", "API access"],
                cta: "Start free trial",
                popular: true,
              },
              {
                name: "Enterprise",
                price: "Custom",
                period: "",
                desc: "For large-scale operations",
                features: ["Unlimited users", "Custom integrations", "Dedicated account manager", "SLA guarantee", "White-label option"],
                cta: "Contact sales",
                popular: false,
              },
            ].map((plan) => (
              <div
                key={plan.name}
                className={`glass-card p-7 flex flex-col ${
                  plan.popular
                    ? "border-cyan-500/30 shadow-xl shadow-cyan-500/10 ring-1 ring-cyan-500/20"
                    : ""
                }`}
              >
                {plan.popular && (
                  <div className="inline-flex self-start items-center gap-1 px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-[10px] font-bold uppercase tracking-wider mb-4">
                    <Sparkles className="h-3 w-3" />
                    Most Popular
                  </div>
                )}
                <h3 className="text-lg font-bold text-text-primary">{plan.name}</h3>
                <p className="text-sm text-text-dim mt-1 mb-5">{plan.desc}</p>
                <div className="flex items-baseline gap-1 mb-6">
                  <span className="text-4xl font-black text-text-primary">{plan.price}</span>
                  <span className="text-sm text-text-dim">{plan.period}</span>
                </div>
                <ul className="space-y-3 mb-8 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-text-secondary">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href="/auth/signup">
                  <Button
                    variant={plan.popular ? "primary" : "outline"}
                    className="w-full"
                  >
                    {plan.cta}
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── CTA ────────────────────────────────────────────────────── */}
      <section className="relative py-24 sm:py-32 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 via-blue-600 to-violet-600" />
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMSIgZmlsbD0icmdiYSgyNTUsMjU1LDI1NSwwLjA1KSIvPjwvc3ZnPg==')] opacity-40" />
        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Ready to streamline
            <br />
            your operations?
          </h2>
          <p className="mt-5 text-lg text-white/70 max-w-xl mx-auto">
            Join hundreds of property preservation companies already using PropPreserve.
          </p>
          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/auth/signup">
              <Button size="lg" className="bg-white text-cyan-600 hover:bg-white/90 shadow-xl shadow-black/20 text-base px-8 py-4 font-bold">
                Get started today
                <ArrowRight className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/contact">
              <Button variant="ghost" size="lg" className="text-white/90 hover:text-white hover:bg-white/10 text-base px-8 py-4">
                Talk to sales
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ─── Footer ─────────────────────────────────────────────────── */}
      <footer className="bg-surface border-t border-border-subtle py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-10">
            <div className="md:col-span-2">
              <div className="flex items-center gap-2.5 mb-4">
                <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
                  <Shield className="h-4 w-4 text-white" />
                </div>
                <span className="text-lg font-black text-text-primary">
                  Prop<span className="text-cyan-400 brand-accent">Preserve</span>
                </span>
              </div>
              <p className="text-sm text-text-muted leading-relaxed max-w-xs">
                The modern platform for property preservation management. Built by industry experts.
              </p>
              <div className="flex gap-3 mt-6">
                {["X", "Li", "Gh"].map((s) => (
                  <div key={s} className="h-8 w-8 rounded-lg bg-surface-hover border border-border-subtle flex items-center justify-center text-[10px] font-bold text-text-dim hover:text-text-primary hover:border-border-medium transition-all cursor-pointer">
                    {s}
                  </div>
                ))}
              </div>
            </div>

            {[
              {
                title: "Product",
                links: ["Features", "Services", "Pricing", "Integrations"],
              },
              {
                title: "Company",
                links: ["About", "Blog", "Careers", "Contact"],
              },
              {
                title: "Legal",
                links: ["Privacy", "Terms", "Security", "Compliance"],
              },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-xs font-bold text-text-dim uppercase tracking-wider mb-4">
                  {col.title}
                </h4>
                <ul className="space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link}>
                      <Link href="#" className="text-sm text-text-muted hover:text-text-primary transition-colors">
                        {link}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="mt-14 pt-8 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-text-dim">
              © {new Date().getFullYear()} PropPreserve. All rights reserved.
            </p>
            <div className="flex items-center gap-1.5 text-xs text-text-dim">
              <Globe className="h-3.5 w-3.5" />
              <span>English (US)</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
