"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, Lock, Mail, ArrowRight, AlertCircle, Shield } from "lucide-react";
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
        err.response?.data?.detail || "Invalid email or password. Please verify your credentials."
      );
    }
  };

  const setDemoUser = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("Admin@TrustChain2026!");
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center items-center p-4 text-[#0F172A] selection:bg-[#0A192F] selection:text-white">
      <div className="w-full max-w-md">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-3">
            <div className="w-9 h-9 rounded bg-[#0A192F] border border-slate-800 flex items-center justify-center text-white shadow-sm">
              <ShieldCheck className="w-5 h-5 text-blue-300" />
            </div>
            <span className="text-xl font-bold text-[#0A192F] tracking-tight">TrustChain</span>
          </Link>
          <h2 className="text-lg font-bold text-[#0A192F]">Enterprise Identity &amp; Access Portal</h2>
          <p className="text-xs text-slate-500 mt-1">
            Authenticate using authorized organization credentials
          </p>
        </div>

        {/* Auth Card */}
        <Card className="bg-white border-slate-200 text-slate-900 shadow-sm p-6 sm:p-7 rounded-lg">
          {error && (
            <div className="mb-4 p-3 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Work Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-9 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus-visible:ring-[#0A192F]"
                  placeholder="name@organization.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-9 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus-visible:ring-[#0A192F]"
                  placeholder="••••••••••••"
                />
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
              className="w-full mt-2"
            >
              Sign In to Command Center
              <ArrowRight className="w-4 h-4 ml-1.5" />
            </Button>
          </form>

          {/* Demo 1-Click Credentials */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 text-center">
              Evaluation &amp; Demo Personas
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setDemoUser("admin@trustchain.local")}
                className="p-2 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-left transition-colors font-medium text-[11px]"
              >
                Platform Admin
              </button>
              <button
                type="button"
                onClick={() => setDemoUser("pharma@cipla.demo")}
                className="p-2 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-left transition-colors font-medium text-[11px]"
              >
                Manufacturer
              </button>
              <button
                type="button"
                onClick={() => setDemoUser("dist@apollologistics.demo")}
                className="p-2 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-left transition-colors font-medium text-[11px]"
              >
                Distributor / Transit
              </button>
              <button
                type="button"
                onClick={() => setDemoUser("auditor@fda-regulator.demo")}
                className="p-2 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-left transition-colors font-medium text-[11px]"
              >
                Regulatory Auditor
              </button>
            </div>
          </div>
        </Card>

        {/* Security & Public Link */}
        <div className="mt-5 text-center space-y-2">
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
            <Shield className="w-3.5 h-3.5 text-slate-400" />
            <span>FIPS 140-2 &amp; SOC-2 Compliant Authentication</span>
          </div>
          <div>
            <Link href="/verify" className="text-xs text-slate-600 hover:text-[#0A192F] hover:underline font-medium">
              Public package verification portal →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
