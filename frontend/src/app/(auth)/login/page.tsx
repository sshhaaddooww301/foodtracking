"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Lock, Mail, ArrowRight, AlertCircle } from "lucide-react";
import { useAuthStore } from "@/lib/auth-store";
import { Button, Input, Card } from "@/components/ui/primitives";

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoading } = useAuthStore();
  const [email, setEmail] = useState("admin@trustchain.local");
  const [password, setPassword] = useState("Admin@TrustChain2026!");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login(email, password);
      router.push("/admin");
    } catch (err: any) {
      setError(
        err.response?.data?.detail || "Invalid email or password. Please try again."
      );
    }
  };

  const setDemoUser = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("Admin@TrustChain2026!");
    setError(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">TrustChain</span>
          </Link>
          <h2 className="text-xl font-semibold text-slate-100">Supply Chain Portal</h2>
          <p className="text-xs text-slate-400 mt-1">
            Sign in with authorized organization credentials
          </p>
        </div>

        <Card className="bg-slate-900 border-slate-800 text-slate-100 shadow-2xl p-6 sm:p-8">
          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 bg-slate-950 border-slate-800 text-white placeholder:text-slate-600"
                  placeholder="name@company.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 bg-slate-950 border-slate-800 text-white placeholder:text-slate-600"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              className="w-full mt-2 bg-blue-600 hover:bg-blue-500"
            >
              Sign In to TrustChain
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </form>

          {/* Demo 1-Click Credentials */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2 text-center">
              Quick Demo Personas
            </p>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <button
                type="button"
                onClick={() => setDemoUser("admin@trustchain.local")}
                className="p-2 rounded bg-slate-950 border border-slate-800 hover:border-blue-500/50 text-slate-300 text-left hover:text-white transition-all truncate"
              >
                👑 Platform Admin
              </button>
              <button
                type="button"
                onClick={() => setDemoUser("pharma@cipla.demo")}
                className="p-2 rounded bg-slate-950 border border-slate-800 hover:border-blue-500/50 text-slate-300 text-left hover:text-white transition-all truncate"
              >
                🏭 Manufacturer
              </button>
              <button
                type="button"
                onClick={() => setDemoUser("dist@apollologistics.demo")}
                className="p-2 rounded bg-slate-950 border border-slate-800 hover:border-blue-500/50 text-slate-300 text-left hover:text-white transition-all truncate"
              >
                🚚 Logistics / Driver
              </button>
              <button
                type="button"
                onClick={() => setDemoUser("auditor@fda-regulator.demo")}
                className="p-2 rounded bg-slate-950 border border-slate-800 hover:border-blue-500/50 text-slate-300 text-left hover:text-white transition-all truncate"
              >
                🔍 Compliance Auditor
              </button>
            </div>
          </div>
        </Card>

        <div className="mt-6 text-center">
          <Link href="/verify" className="text-xs text-blue-400 hover:underline">
            Consumer looking to verify a package? Click here →
          </Link>
        </div>
      </div>
    </div>
  );
}
