"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button, Input } from "@/components/ui";
import { Shield } from "lucide-react";

export default function SignIn() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email: email.trim().toLowerCase(),
        password: password.trim(),
        redirect: false,
      });

      if (result?.error) {
        setError(
          result.error === "CredentialsSignin"
            ? "Invalid email or password"
            : `Login error: ${result.error}`
        );
      } else {
        window.location.href = "/dashboard";
      }
    } catch (err: any) {
      setError(err?.message || "Something went wrong during sign in");
    } finally {
      setLoading(false);
    }
  }

  async function handleQuickLogin(demoEmail: string, demoPass: string) {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email: demoEmail.trim().toLowerCase(),
        password: demoPass.trim(),
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password");
      } else {
        window.location.href = "/dashboard";
      }
    } catch (err: any) {
      setError(err?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-hover p-4 relative overflow-hidden">
      {/* Background gradient orbs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] bg-gradient-to-b from-cyan-500/10 via-purple-500/5 to-transparent rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-1/4 w-[400px] h-[400px] bg-gradient-to-t from-purple-500/10 to-transparent rounded-full blur-3xl" />

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-2xl bg-gradient-to-br from-cyan-500 to-purple-600 mb-4 shadow-lg shadow-cyan-500/20">
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-text-primary">Welcome back</h1>
          <p className="text-text-muted mt-1">Sign in to PropPreserve</p>
        </div>

        <div className="bg-surface/80 backdrop-blur-xl rounded-2xl border border-border-subtle shadow-2xl shadow-black/50 p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400">
                {error}
              </div>
            )}

            <Input
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
            />

            <Input
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />

            <Button type="submit" loading={loading} className="w-full">
              Sign in
            </Button>
          </form>

          {/* Quick Demo Accounts */}
          <div className="mt-6 pt-5 border-t border-border-subtle">
            <p className="text-[11px] font-bold uppercase tracking-wider text-text-muted mb-2.5 text-center">
              1-Click Instant Login
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin("admin@vanguard.com", "password123")}
                className="px-2.5 py-2 rounded-xl bg-surface-hover hover:bg-surface-hover/80 border border-border-subtle text-[11px] font-bold text-cyan-400 text-left transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                🏢 Vanguard Admin
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin("john@contractor.com", "password123")}
                className="px-2.5 py-2 rounded-xl bg-surface-hover hover:bg-surface-hover/80 border border-border-subtle text-[11px] font-bold text-emerald-400 text-left transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                🔨 Contractor John
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin("admin@proppreserve.com", "password123")}
                className="px-2.5 py-2 rounded-xl bg-surface-hover hover:bg-surface-hover/80 border border-border-subtle text-[11px] font-bold text-purple-400 text-left transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                ⚡ PropPreserve Admin
              </button>
              <button
                type="button"
                disabled={loading}
                onClick={() => handleQuickLogin("superadmin@platform.com", "password123")}
                className="px-2.5 py-2 rounded-xl bg-surface-hover hover:bg-surface-hover/80 border border-border-subtle text-[11px] font-bold text-amber-400 text-left transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                👑 Super Admin
              </button>
            </div>
          </div>

          <div className="mt-6 text-center text-xs text-text-muted">
            Need access or an account?{" "}
            <Link href="/contact" className="text-cyan-400 font-medium hover:text-cyan-300 transition-colors">
              Contact Administrator
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
