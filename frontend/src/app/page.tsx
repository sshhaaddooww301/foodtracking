"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ShieldCheck,
  Search,
  Cpu,
  Link as LinkIcon,
  ArrowRight,
  Lock,
  ThermometerSnowflake,
  FileCheck,
  QrCode,
  Sparkles,
} from "lucide-react";

export default function HomePage() {
  const router = useRouter();
  const [searchCode, setSearchCode] = useState("");

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchCode.trim()) {
      router.push(`/verify?code=${encodeURIComponent(searchCode.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Top Navigation */}
      <header className="border-b border-slate-800/80 bg-slate-950/60 backdrop-blur sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-lg font-bold text-white tracking-tight">TrustChain</span>
              <span className="text-xs uppercase tracking-wider text-blue-400 font-semibold block -mt-1">
                Supply Integrity
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/verify"
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 transition-colors px-3 py-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/10 flex items-center gap-1.5"
            >
              <QrCode className="w-3.5 h-3.5" />
              Verify Product
            </Link>
            <Link
              href="/login"
              className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 px-4 py-2 rounded-lg transition-all shadow-md shadow-blue-600/30 flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5" />
              Portal Access
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="relative pt-20 pb-24 overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(59,130,246,0.15),rgba(255,255,255,0))]"></div>
          
          <div className="max-w-5xl mx-auto px-6 text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-blue-500/30 bg-blue-500/10 text-blue-400 text-xs font-medium mb-8">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Next-Gen Pharmaceutical & Food Safety Infrastructure</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tight leading-[1.1] mb-6">
              Zero-Trust Supply Chain Verification &{" "}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">
                Anti-Counterfeiting
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto mb-10 leading-relaxed">
              Cryptographically authenticate every medicine unit, monitor cold-chain telemetric compliance in real time, and protect consumers with immutable blockchain provenance.
            </p>

            {/* Instant Consumer Verification Search Bar */}
            <div className="max-w-xl mx-auto mb-12">
              <form onSubmit={handleVerify} className="relative flex items-center">
                <Search className="w-5 h-5 text-slate-400 absolute left-4" />
                <input
                  type="text"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  placeholder="Enter Package Code (e.g. PKG-IN-2026-0001)..."
                  className="w-full pl-12 pr-32 py-4 rounded-xl bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-xl"
                />
                <button
                  type="submit"
                  className="absolute right-2 px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition-all shadow-md shadow-blue-600/30 flex items-center gap-1.5"
                >
                  Verify Now
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>
              <div className="flex items-center justify-center gap-4 mt-3 text-xs text-slate-500">
                <span>Try sample code:</span>
                <button
                  type="button"
                  onClick={() => setSearchCode("PKG-IN-2026-0001")}
                  className="text-blue-400 hover:underline"
                >
                  PKG-IN-2026-0001
                </button>
              </div>
            </div>

            {/* Key Platform Pillars */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-left pt-8 border-t border-slate-800/80">
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center mb-3">
                  <LinkIcon className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">EVM Blockchain Ledger</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Every batch, serial identity, and ownership handover is permanently timestamped on-chain.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3">
                  <ThermometerSnowflake className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">Real-Time Cold Chain</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Cryptographically signed IoT telemetry continuously verifies temperature compliance.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3">
                  <Cpu className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">Byzantine Oracles</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Decentralized multi-oracle consensus prevents sensor spoofing and GPS spoofing.
                </p>
              </div>

              <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/40">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3">
                  <FileCheck className="w-4 h-4" />
                </div>
                <h3 className="text-sm font-semibold text-white mb-1">IPFS Certificates</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Lab assay results & Certificates of Analysis (COA) anchored to SHA-256 IPFS hashes.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
        <p>© 2026 TrustChain Supply Inc. Enterprise Grade Supply Chain Integrity & Anti-Counterfeiting Platform.</p>
      </footer>
    </div>
  );
}
