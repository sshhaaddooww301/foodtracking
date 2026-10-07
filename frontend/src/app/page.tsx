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
  CheckCircle2,
  Building2,
  FileCode,
  Activity,
  Layers,
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
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col font-sans selection:bg-[#0A192F] selection:text-white">
      {/* Top Enterprise Navigation */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-[#0A192F] border border-slate-800 flex items-center justify-center text-white">
              <ShieldCheck className="w-5 h-5 text-blue-300" />
            </div>
            <div>
              <span className="text-base font-bold text-[#0A192F] tracking-tight">TrustChain</span>
              <span className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold block -mt-0.5">
                Supply Chain Integrity Platform
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/verify"
              className="text-xs font-semibold text-slate-700 hover:text-[#0A192F] transition-colors px-3 py-1.5 rounded border border-slate-300 hover:border-slate-400 bg-white flex items-center gap-1.5 shadow-sm"
            >
              <QrCode className="w-3.5 h-3.5 text-slate-600" />
              Verify Package
            </Link>
            <Link
              href="/login"
              className="text-xs font-semibold text-white bg-[#0A192F] hover:bg-[#142642] px-3.5 py-1.5 rounded transition-colors shadow-sm flex items-center gap-1.5 border border-[#0A192F]"
            >
              <Lock className="w-3.5 h-3.5 text-blue-300" />
              Enterprise Portal
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* Hero Section */}
        <section className="border-b border-slate-200 bg-white pt-16 pb-20">
          <div className="max-w-5xl mx-auto px-6 text-center">
            {/* Regulatory badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-slate-200 bg-slate-50 text-slate-700 text-xs font-medium mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600"></span>
              <span>DSCSA, EU FMD & 21 CFR Part 11 Compliant Architecture</span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-bold text-[#0A192F] tracking-tight leading-[1.15] mb-5">
              Cryptographic Supply Chain Provenance &amp; Anti-Counterfeiting Platform
            </h1>

            <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto mb-10 leading-relaxed">
              Authenticate individual medicine units, enforce cold-chain temperature thresholds via IoT telemetry, and anchor custody transfers to an immutable enterprise ledger.
            </p>

            {/* Verification Search Bar */}
            <div className="max-w-xl mx-auto mb-8">
              <form onSubmit={handleVerify} className="relative flex items-center">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5" />
                <input
                  type="text"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  placeholder="Enter Package Code (e.g. PKG-IN-2026-0001)..."
                  className="w-full pl-10 pr-28 py-3 rounded-md bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-[#0A192F] text-xs sm:text-sm font-mono shadow-sm"
                />
                <button
                  type="submit"
                  className="absolute right-1.5 px-4 py-2 rounded bg-[#0A192F] hover:bg-[#142642] text-white font-medium text-xs transition-colors shadow-sm flex items-center gap-1.5"
                >
                  Verify
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </form>

              <div className="flex flex-wrap items-center justify-center gap-2 mt-3 text-xs text-slate-500">
                <span className="text-[11px] font-medium text-slate-400">Sample Records:</span>
                <button
                  type="button"
                  onClick={() => setSearchCode("PKG-IN-2026-0001")}
                  className="px-2 py-0.5 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 font-mono text-[11px] text-[#0A192F] transition-colors"
                >
                  PKG-IN-2026-0001 (Authentic)
                </button>
                <button
                  type="button"
                  onClick={() => setSearchCode("PKG-SUSPECT-001")}
                  className="px-2 py-0.5 rounded border border-slate-200 bg-slate-50 hover:bg-slate-100 font-mono text-[11px] text-slate-700 transition-colors"
                >
                  PKG-SUSPECT-001
                </button>
              </div>
            </div>

            {/* Quick Enterprise Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-4xl mx-auto pt-8 border-t border-slate-100 text-left">
              <div className="p-3.5 rounded border border-slate-200 bg-slate-50/50">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Proof Architecture</div>
                <div className="text-xl font-bold font-mono text-[#0A192F] mt-1">EVM + IPFS</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Dual-layer immutable anchor</div>
              </div>

              <div className="p-3.5 rounded border border-slate-200 bg-slate-50/50">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Verification SLA</div>
                <div className="text-xl font-bold font-mono text-[#0A192F] mt-1">&lt; 150 ms</div>
                <div className="text-[11px] text-slate-500 mt-0.5">High-availability Edge API</div>
              </div>

              <div className="p-3.5 rounded border border-slate-200 bg-slate-50/50">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Telemetry Sensors</div>
                <div className="text-xl font-bold font-mono text-[#0A192F] mt-1">Active IoT</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Temp, humidity &amp; GPS</div>
              </div>

              <div className="p-3.5 rounded border border-slate-200 bg-slate-50/50">
                <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Custody Protocol</div>
                <div className="text-xl font-bold font-mono text-[#0A192F] mt-1">Multi-Party</div>
                <div className="text-[11px] text-slate-500 mt-0.5">Cryptographic handover</div>
              </div>
            </div>
          </div>
        </section>

        {/* System Architecture Pillars */}
        <section className="py-16 max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl font-bold text-[#0A192F] tracking-tight">
              Enterprise Technology Architecture
            </h2>
            <p className="text-xs text-slate-600 mt-1.5">
              Engineered for pharmaceutical compliance, food safety logistics, and tamper-evident fraud mitigation.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
            <div className="p-5 rounded-lg border border-slate-200 bg-white shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded bg-[#0A192F] text-white flex items-center justify-center mb-3">
                  <LinkIcon className="w-4 h-4 text-blue-300" />
                </div>
                <h3 className="text-sm font-bold text-[#0A192F] mb-1.5">EVM Blockchain Ledger</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Every batch creation, serial package identity, and transfer of custody is irreversibly committed on-chain with verifiable transaction hashes.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Immutable State
              </div>
            </div>

            <div className="p-5 rounded-lg border border-slate-200 bg-white shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded bg-[#0A192F] text-white flex items-center justify-center mb-3">
                  <ThermometerSnowflake className="w-4 h-4 text-blue-300" />
                </div>
                <h3 className="text-sm font-bold text-[#0A192F] mb-1.5">Real-Time Cold Chain</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Cryptographically signed IoT telemetry continuously verifies temperature, humidity, and location compliance throughout transit.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Threshold Surveillance
              </div>
            </div>

            <div className="p-5 rounded-lg border border-slate-200 bg-white shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded bg-[#0A192F] text-white flex items-center justify-center mb-3">
                  <Cpu className="w-4 h-4 text-blue-300" />
                </div>
                <h3 className="text-sm font-bold text-[#0A192F] mb-1.5">Consensus Oracles</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Multi-oracle verification prevents sensor spoofing, GPS route falsification, and malicious payload tampering.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                Anti-Spoofing Rules
              </div>
            </div>

            <div className="p-5 rounded-lg border border-slate-200 bg-white shadow-sm flex flex-col justify-between">
              <div>
                <div className="w-9 h-9 rounded bg-[#0A192F] text-white flex items-center justify-center mb-3">
                  <FileCheck className="w-4 h-4 text-blue-300" />
                </div>
                <h3 className="text-sm font-bold text-[#0A192F] mb-1.5">IPFS Document Proofs</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Laboratory assay results, Certificates of Analysis (COA), and regulatory filings are cryptographically anchored to IPFS CID hashes.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                SHA-256 Provenance
              </div>
            </div>
          </div>
        </section>

        {/* Regulatory Compliance Badges */}
        <section className="border-t border-slate-200 bg-slate-100/50 py-10">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-slate-600" />
                <span className="font-semibold text-slate-700">Standards &amp; Conformity:</span>
              </div>
              <div className="flex flex-wrap items-center gap-6 font-mono text-[11px] text-slate-600">
                <span>FDA 21 CFR Part 11</span>
                <span>•</span>
                <span>US DSCSA 2024</span>
                <span>•</span>
                <span>EU FMD 2016/161</span>
                <span>•</span>
                <span>GS1 Digital Link EPCIS 2.0</span>
                <span>•</span>
                <span>ISO 9001:2015</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Enterprise Footer */}
      <footer className="border-t border-slate-200 bg-white py-6 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© 2026 TrustChain Supply Inc. Enterprise Grade Supply Chain Integrity &amp; Anti-Counterfeiting Platform.</p>
          <div className="flex items-center gap-4 text-[11px]">
            <Link href="/verify" className="hover:text-slate-800 transition-colors">Public Verification</Link>
            <span>•</span>
            <Link href="/login" className="hover:text-slate-800 transition-colors">Enterprise Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
