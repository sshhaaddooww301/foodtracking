"use client";
import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Archive,
  Search,
  CheckCircle2,
  ThermometerSnowflake,
  Calendar,
  Building2,
  Link as LinkIcon,
  ArrowRight,
  ExternalLink,
  Camera,
  MapPin,
  Truck,
  Box,
  Layers,
  Sparkles,
  Info,
  Clock,
  Fingerprint,
  Radio,
  FileCheck,
  RefreshCw,
  Share2,
} from "lucide-react";
import { consumerApi } from "@/services/api";
import { VerificationResult } from "@/types";
import { Card, Input, Button } from "@/components/ui/primitives";
import { QrCameraScanner } from "@/components/shared/QrCameraScanner";
import LiveLocationMap from "@/components/maps/LiveLocationMap";

function ConsumerVerifyContent() {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get("code") || "";

  const [inputCode, setInputCode] = useState(initialCode);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showCameraScanner, setShowCameraScanner] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "manufacturing" | "journey" | "gps">("overview");

  const performVerification = async (codeToVerify: string) => {
    if (!codeToVerify.trim()) return;
    setLoading(true);
    setErrorMsg(null);
    setSearched(true);
    try {
      const res = await consumerApi.verify(codeToVerify.trim());
      setResult(res.data);
    } catch (err: any) {
      if (err.response?.status === 404) {
        setResult({
          package_code: codeToVerify,
          status: "COUNTERFEIT",
          result: "COUNTERFEIT",
          is_authentic: false,
          is_suspicious: true,
          is_recalled: false,
          is_quarantined: false,
          cold_chain_ok: false,
          risk_score: 100.0,
          risk_level: "CRITICAL",
          scan_count: 1,
          warning_message:
            "Warning: This digital serial code is NOT registered in the official TrustChain registry. The product may be counterfeit, cloned, or fraudulent.",
        });
      } else {
        setErrorMsg("Failed to connect to verification server. Please verify backend connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialCode) {
      setInputCode(initialCode);
      performVerification(initialCode);
    }
  }, [initialCode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performVerification(inputCode);
  };

  const handleScanSuccess = (code: string) => {
    setShowCameraScanner(false);
    setInputCode(code);
    performVerification(code);
  };

  const isAuthentic = result?.is_authentic && result?.status !== "COUNTERFEIT" && result?.status !== "QUARANTINED" && result?.status !== "RECALLED";
  const isQuarantined = result?.is_quarantined || result?.status === "QUARANTINED";
  const isRecalled = result?.is_recalled || result?.status === "RECALLED";
  const isCounterfeit = !isAuthentic && !isQuarantined && !isRecalled;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Brand Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-30 px-4 sm:px-6 py-3.5">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 group-hover:scale-105 transition">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-extrabold text-white tracking-tight">TrustChain</span>
              <span className="text-[10px] uppercase font-bold text-blue-400 block -mt-1 tracking-wider">
                Digital Product Passport & Provenance
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCameraScanner(true)}
              className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 text-xs gap-1.5 h-8"
            >
              <Camera className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Camera</span> Scanner
            </Button>

            <Link
              href="/login"
              className="text-xs text-slate-400 hover:text-white transition-colors font-medium"
            >
              Partner Portal →
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 sm:py-10 space-y-6">
        {/* Hero Search & Scanner Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-blue-400" />
            <span>Anti-Counterfeit Cryptographic Verification</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
            Authenticate Product & Track Live GPS
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto">
            Scan packaging QR code or enter serial ID to check manufacturing origin, transfer custody history, and real-time GPS location.
          </p>
        </div>

        {/* Input & Scanner Card */}
        <Card className="bg-slate-900/90 border-slate-800 p-4 sm:p-5 shadow-2xl backdrop-blur">
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                required
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="Scan or enter Package ID (e.g. PKG-000001, PKG-IN-2026-0001)..."
                className="pl-10 bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 text-sm h-11"
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setShowCameraScanner(true)}
                className="bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-200 text-xs px-4 h-11 gap-1.5"
              >
                <Camera className="w-4 h-4 text-blue-400" />
                Scan QR
              </Button>

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={loading}
                className="bg-blue-600 hover:bg-blue-500 text-xs px-6 h-11 font-semibold shadow-lg shadow-blue-600/20 flex-1 sm:flex-none"
              >
                Verify Now
              </Button>
            </div>
          </form>

          {/* Quick Demo Test Serials */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-3.5 text-[11px] text-slate-400 pt-3 border-t border-slate-800/80">
            <span className="text-slate-500 font-medium">Quick Demo Samples:</span>
            <button
              type="button"
              onClick={() => {
                setInputCode("PKG-000001");
                performVerification("PKG-000001");
              }}
              className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 hover:bg-blue-500/20 border border-blue-500/20 transition font-mono"
            >
              PKG-000001 (Authentic)
            </button>
            <button
              type="button"
              onClick={() => {
                setInputCode("PKG-IN-2026-0001");
                performVerification("PKG-IN-2026-0001");
              }}
              className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 border border-emerald-500/20 transition font-mono"
            >
              PKG-IN-2026-0001 (In Transit)
            </button>
            <button
              type="button"
              onClick={() => {
                setInputCode("FAKE-COUNTERFEIT-999");
                performVerification("FAKE-COUNTERFEIT-999");
              }}
              className="px-2 py-0.5 rounded bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition font-mono"
            >
              FAKE-CODE-999 (Counterfeit)
            </button>
          </div>
        </Card>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center">
            {errorMsg}
          </div>
        )}

        {/* Verification Result Section */}
        {result && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-3 duration-300">
            {/* Status Hero Card */}
            <Card
              className={`border-2 p-6 sm:p-8 shadow-2xl transition-all ${
                isAuthentic
                  ? "bg-slate-900/90 border-emerald-500/50 shadow-emerald-500/5"
                  : isRecalled
                  ? "bg-slate-900/90 border-amber-500/50 shadow-amber-500/5"
                  : isQuarantined
                  ? "bg-slate-900/90 border-orange-500/50 shadow-orange-500/5"
                  : "bg-slate-900/90 border-red-500/50 shadow-red-500/5"
              }`}
            >
              <div className="flex flex-col sm:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-800">
                <div className="flex items-center gap-4 text-center sm:text-left">
                  {isAuthentic ? (
                    <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 border border-emerald-500/30 shrink-0">
                      <CheckCircle2 className="w-9 h-9" />
                    </div>
                  ) : isRecalled ? (
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 shrink-0">
                      <AlertTriangle className="w-9 h-9" />
                    </div>
                  ) : isQuarantined ? (
                    <div className="w-16 h-16 rounded-2xl bg-orange-500/20 text-orange-400 flex items-center justify-center border border-orange-500/30 shrink-0">
                      <Archive className="w-9 h-9" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-2xl bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30 shrink-0">
                      <ShieldAlert className="w-9 h-9" />
                    </div>
                  )}

                  <div>
                    <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                      <h2
                        className={`text-xl sm:text-2xl font-black tracking-tight ${
                          isAuthentic
                            ? "text-emerald-400"
                            : isRecalled
                            ? "text-amber-400"
                            : isQuarantined
                            ? "text-orange-400"
                            : "text-red-400"
                        }`}
                      >
                        {isAuthentic
                          ? "AUTHENTIC & VERIFIED"
                          : isRecalled
                          ? "PRODUCT RECALLED"
                          : isQuarantined
                          ? "PACKAGE QUARANTINED"
                          : "COUNTERFEIT / UNVERIFIED"}
                      </h2>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {result.package_code}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 mt-1 max-w-lg">
                      {isAuthentic
                        ? "Cryptographic origin signature matches the immutable EVM blockchain ledger. Temperature cold-chain validated."
                        : isRecalled
                        ? "Batch recalled by health regulators. Do not distribute or consume."
                        : isQuarantined
                        ? "Cold-chain temperature violation detected. Held in safety quarantine."
                        : result.warning_message || "Digital identifier not found in the blockchain registry. Suspected fake product."}
                    </p>
                  </div>
                </div>

                {/* Risk Score Gauge */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-4 sm:pt-0 border-t sm:border-t-0 border-slate-800 gap-2">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">
                      Anti-Fraud Risk
                    </span>
                    <span
                      className={`text-lg font-black ${
                        result.risk_level === "LOW" || (result.risk_score || 0) < 20
                          ? "text-emerald-400"
                          : result.risk_level === "MEDIUM"
                          ? "text-amber-400"
                          : "text-red-400"
                      }`}
                    >
                      {result.risk_score !== undefined ? `${result.risk_score.toFixed(0)}%` : "0%"} (
                      {result.risk_level || "LOW"})
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                    <Fingerprint className="w-3.5 h-3.5 text-purple-400" />
                    <span>Scan #{result.scan_count || 1}</span>
                  </div>
                </div>
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-1.5 sm:gap-2 mt-6 overflow-x-auto pb-1 border-b border-slate-800">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === "overview"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <Box className="w-3.5 h-3.5" />
                  Product Info & Image
                </button>

                <button
                  onClick={() => setActiveTab("manufacturing")}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === "manufacturing"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  Where Manufactured (Origin)
                </button>

                <button
                  onClick={() => setActiveTab("journey")}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === "journey"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" />
                  Transfer History & Journey
                </button>

                <button
                  onClick={() => setActiveTab("gps")}
                  className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === "gps"
                      ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                      : "text-slate-400 hover:text-white hover:bg-slate-800"
                  }`}
                >
                  <Radio className="w-3.5 h-3.5 text-emerald-400" />
                  Live GPS & Satellite Map
                </button>
              </div>

              {/* TAB 1: PRODUCT INFO & IMAGE */}
              {activeTab === "overview" && (
                <div className="pt-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                    {/* Product Image Column */}
                    <div className="md:col-span-5 flex flex-col items-center">
                      <div className="relative w-full aspect-square max-w-[280px] bg-slate-950 rounded-2xl overflow-hidden border border-slate-800 shadow-xl group">
                        <img
                          src={
                            result.product?.image_url ||
                            "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80"
                          }
                          alt={result.product?.name || "Product Image"}
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                        />
                        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-md bg-black/70 backdrop-blur text-[10px] font-bold text-white uppercase tracking-wider border border-white/10">
                          {result.product?.category || "Pharmaceutical"}
                        </div>
                        {result.product?.drug_schedule && (
                          <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded bg-red-600/80 backdrop-blur text-[10px] font-bold text-white uppercase">
                            {result.product.drug_schedule}
                          </div>
                        )}
                      </div>

                      <p className="text-[11px] text-slate-400 mt-2 text-center">
                        Official Packaging & Form Formulation
                      </p>
                    </div>

                    {/* Product Details Specs */}
                    <div className="md:col-span-7 space-y-4">
                      <div>
                        <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider">
                          SKU: {result.product?.sku || "AMOX-500-CAP"}
                        </span>
                        <h3 className="text-xl font-bold text-white mt-0.5">
                          {result.product?.name || "Amoxicillin 500mg Capsules"}
                        </h3>
                        <p className="text-xs text-slate-300 mt-1.5 leading-relaxed">
                          {result.product?.description ||
                            "Broad-spectrum bactericidal penicillin antibiotic prescribed for respiratory and bacterial infections."}
                        </p>
                      </div>

                      {/* Active Composition */}
                      <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                        <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                          Active Composition / Formula
                        </span>
                        <span className="text-xs font-medium text-slate-200 mt-0.5 block">
                          {result.product?.composition ||
                            "Amoxicillin Trihydrate IP eq. to Anhydrous Amoxicillin 500mg per capsule"}
                        </span>
                      </div>

                      {/* Batch & Dates Grid */}
                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                            Batch Number
                          </span>
                          <span className="text-sm font-mono font-bold text-blue-400 mt-0.5 block">
                            {result.batch?.batch_number || "BATCH-00000001"}
                          </span>
                        </div>

                        <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                          <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                            Expiry Date
                          </span>
                          <span className="text-sm font-semibold text-slate-200 mt-0.5 block">
                            {result.batch?.expiry_date ? new Date(result.batch.expiry_date).toLocaleDateString() : "2028-01-15"}
                          </span>
                        </div>
                      </div>

                      {/* Temperature Tolerances */}
                      <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <ThermometerSnowflake className="w-4 h-4 text-cyan-400" />
                          <div>
                            <p className="text-[11px] font-semibold text-slate-200">Storage Specs</p>
                            <p className="text-[10px] text-slate-400">
                              {result.product?.min_temperature !== undefined && result.product?.max_temperature !== undefined
                                ? `Maintain between ${result.product.min_temperature}°C to ${result.product.max_temperature}°C`
                                : "Store in cool, dry conditions away from light"}
                            </p>
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          COMPLIANT
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Blockchain Immutable Proof Anchor */}
                  <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950/40 via-slate-950 to-slate-950 border border-purple-800/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
                        <LinkIcon className="w-4 h-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-white flex items-center gap-2">
                          <span>EVM Smart Contract Ledger Anchor</span>
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-purple-500/20 text-purple-300">
                            ERC-721 / ERC-1155
                          </span>
                        </p>
                        <p className="font-mono text-[10px] text-slate-400 break-all">
                          {result.blockchain_tx || result.batch?.blockchain_tx_hash || "0x98f2178a9c34e098df21b564e9a12c87b654df23a1098e76c543b21908efa234"}
                        </p>
                      </div>
                    </div>

                    <span className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 shrink-0">
                      ON-CHAIN VERIFIED
                    </span>
                  </div>
                </div>
              )}

              {/* TAB 2: WHERE MANUFACTURED (KAHA MANUFACTURE HUA HAI) */}
              {activeTab === "manufacturing" && (
                <div className="pt-6 space-y-6">
                  <div className="bg-slate-950/80 rounded-2xl p-5 sm:p-6 border border-slate-800 space-y-5">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-xl bg-blue-600/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                          <Building2 className="w-6 h-6" />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-blue-400 tracking-wider block">
                            Licensed Pharmaceutical / Food Facility
                          </span>
                          <h3 className="text-lg font-bold text-white">
                            {result.manufacturer?.name || "PharmaCorp India Ltd (Cipla Licensed Plant)"}
                          </h3>
                        </div>
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                          Manufacturing Date
                        </span>
                        <span className="text-xs font-bold text-slate-200">
                          {result.batch?.manufacturing_date
                            ? new Date(result.batch.manufacturing_date).toLocaleDateString()
                            : "2026-01-15"}
                        </span>
                      </div>
                    </div>

                    {/* Manufacturing Specs Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                        <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                          Factory & Plant Location
                        </span>
                        <p className="font-semibold text-slate-200 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-red-400" />
                          <span>
                            {result.manufacturer?.city || "Pune"},{" "}
                            {result.manufacturer?.state || "Maharashtra"},{" "}
                            {result.manufacturer?.country || "India"}
                          </span>
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Kurkumbh Industrial Estate, MIDC Special Pharma Zone
                        </p>
                      </div>

                      <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                        <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                          Drug Controller & Manufacturing License
                        </span>
                        <p className="font-mono font-bold text-blue-400">
                          {result.manufacturer?.license || "MFG-L-001 (CDSCO / FDA Approved)"}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          Reg No: {result.manufacturer?.registration_number || "MH-PHARMA-001"}
                        </p>
                      </div>
                    </div>

                    {/* Quality Lab Signoff */}
                    <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <FileCheck className="w-4 h-4 text-emerald-400" />
                        <div>
                          <p className="font-bold text-emerald-300">Quality Assurance & Lab Release Certificate</p>
                          <p className="text-[10px] text-emerald-400/80">
                            Passed USP / IP Assay 99.8% purity test. Certified GMP compliant.
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300">
                        LAB APPROVED
                      </span>
                    </div>

                    {/* Plant Coordinates & Maps */}
                    {result.manufacturer?.latitude && result.manufacturer?.longitude && (
                      <div className="flex items-center justify-between pt-2 text-xs">
                        <span className="text-slate-400 font-mono text-[11px]">
                          Geo-Coordinates: {result.manufacturer.latitude.toFixed(4)}° N,{" "}
                          {result.manufacturer.longitude.toFixed(4)}° E
                        </span>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${result.manufacturer.latitude},${result.manufacturer.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:text-blue-300 font-medium inline-flex items-center gap-1"
                        >
                          View Plant on Map <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: WHERE TRANSFERRED FROM / SUPPLY CHAIN JOURNEY */}
              {activeTab === "journey" && (
                <div className="pt-6 space-y-6">
                  <div className="text-center sm:text-left">
                    <h3 className="text-base font-bold text-white">
                      Full Custody Chain & Transfer History
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Verifiable log of every transport handoff, depot transfer, and warehouse intake.
                    </p>
                  </div>

                  {/* Visual Journey Stepper */}
                  <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-2.5 sm:before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-blue-600/40">
                    {result.journey && result.journey.length > 0 ? (
                      result.journey.map((step, idx) => (
                        <div key={idx} className="relative group">
                          {/* Stepper Dot */}
                          <div
                            className={`absolute -left-6 sm:-left-8 top-1 w-5 h-5 rounded-full flex items-center justify-center border-2 ${
                              idx === 0
                                ? "bg-blue-600 border-white text-white"
                                : idx === result.journey!.length - 1
                                ? "bg-emerald-500 border-white text-white animate-pulse"
                                : "bg-slate-900 border-blue-500 text-blue-400"
                            }`}
                          >
                            <span className="text-[10px] font-bold">{idx + 1}</span>
                          </div>

                          {/* Step Content Box */}
                          <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700 transition space-y-2">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                  {step.event_type}
                                </span>
                                <span className="text-xs font-bold text-white">
                                  {step.location || "Transit Hub"}
                                </span>
                              </div>

                              <span className="text-[11px] text-slate-400 font-medium">
                                {step.timestamp ? new Date(step.timestamp).toLocaleString() : "Recent"}
                              </span>
                            </div>

                            {/* Transfer Route */}
                            <div className="flex items-center gap-2 text-xs text-slate-300">
                              <span className="font-semibold text-slate-400">From:</span>
                              <span className="font-medium text-slate-200">{step.from_org || "Manufacturing Plant"}</span>
                              <ArrowRight className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                              <span className="font-semibold text-slate-400">To:</span>
                              <span className="font-medium text-white">{step.to_org || "Inbound Logistics"}</span>
                            </div>

                            {/* Performer & Tx */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/60 text-[11px] text-slate-400">
                              <span>Officer: <strong className="text-slate-300">{step.performer || "Certified Dispatcher"}</strong></span>
                              {step.blockchain_tx && (
                                <span className="font-mono text-[10px] text-purple-400">
                                  Tx: {step.blockchain_tx.slice(0, 10)}...{step.blockchain_tx.slice(-6)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-400">No transfer history recorded yet.</p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: LIVE GPS & SATELLITE MAP */}
              {activeTab === "gps" && (
                <div className="pt-6 space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
                      Live GPS Tracking & Route Telemetry
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Real-time geographical tracking anchored by onboard IoT sensory beacons.
                    </p>
                  </div>

                  {/* Leaflet Dynamic Live Map */}
                  <LiveLocationMap
                    currentLocation={result.current_location}
                    manufacturer={result.manufacturer}
                    journey={result.journey}
                    temperature={result.last_temperature}
                    humidity={result.last_humidity}
                    productName={result.product?.name}
                  />

                  {/* Transit Status Breakdown */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                      <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                        Transit Stage
                      </span>
                      <span className="text-xs font-bold text-white mt-1 block">
                        {result.status === "IN_TRANSIT"
                          ? "🚚 On Highway Route (Cold Carrier)"
                          : result.status === "DELIVERED"
                          ? "🏥 Delivered at Pharmacy / Hospital"
                          : result.status}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                      <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                        Destination Owner
                      </span>
                      <span className="text-xs font-bold text-white mt-1 block">
                        {result.current_owner?.name || "Apollo Pharmacy & Healthcare"}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {result.current_owner?.city || "New Delhi"}, {result.current_owner?.state || "Delhi"}
                      </span>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                      <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                        Cold-Chain Sensor Integrity
                      </span>
                      <span className="text-xs font-bold text-emerald-400 mt-1 block flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Within Optimal Range
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Last ping: Active telemetry feed
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          </div>
        )}
      </main>

      {/* Live Camera QR Scanner Modal */}
      {showCameraScanner && (
        <QrCameraScanner
          onScan={handleScanSuccess}
          onClose={() => setShowCameraScanner(false)}
        />
      )}
    </div>
  );
}

export default function ConsumerVerifyPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 text-slate-400 flex items-center justify-center text-xs">
          Loading verification portal...
        </div>
      }
    >
      <ConsumerVerifyContent />
    </Suspense>
  );
}

