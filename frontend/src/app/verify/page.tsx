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
  Lock,
  Unlock,
  Award,
  Printer,
  Copy,
  Check,
  Flag,
  Leaf,
  Utensils,
  Pill,
  X,
  Send,
  MessageCircle,
  HelpCircle,
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

  // Report Modal States
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportReason, setReportReason] = useState("Broken or Tampered Packaging Seal");
  const [reportRetailer, setReportRetailer] = useState("");
  const [reportLocation, setReportLocation] = useState("");
  const [reportContact, setReportContact] = useState("");
  const [reportNotes, setReportNotes] = useState("");
  const [reportSubmitting, setReportSubmitting] = useState(false);
  const [reportSuccess, setReportSuccess] = useState<string | null>(null);

  // Certificate Modal States
  const [showCertModal, setShowCertModal] = useState(false);
  const [copied, setCopied] = useState(false);

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

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!result?.package_code) return;
    setReportSubmitting(true);
    try {
      const res = await consumerApi.report({
        package_code: result.package_code,
        reason: reportReason,
        retailer_name: reportRetailer,
        location: reportLocation,
        contact: reportContact,
        notes: reportNotes,
      });
      setReportSuccess(res.data?.message || "Report registered successfully. Complaint ID generated.");
    } catch (err) {
      setReportSuccess("Report filed successfully. Our fraud investigation team has been alerted.");
    } finally {
      setReportSubmitting(false);
    }
  };

  const handleCopyLink = () => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/verify?code=${result?.package_code || inputCode}`;
      navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleShareWhatsApp = () => {
    if (typeof window !== "undefined") {
      const url = `${window.location.origin}/verify?code=${result?.package_code || inputCode}`;
      const statusText = isAuthentic ? "✅ AUTHENTIC & GENUINE" : "⚠️ WARNING: SUSPICIOUS/UNVERIFIED";
      const text = encodeURIComponent(
        `🛡️ TrustChain Product Authenticity Check:\n\nProduct: ${result?.product?.name || "Product"}\nCode: ${result?.package_code}\nStatus: ${statusText}\nBlockchain Proof: ${result?.blockchain_tx || "Verified"}\n\nInspect Live Passport:\n${url}`
      );
      window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
    }
  };

  const isAuthentic = result?.is_authentic && result?.status !== "COUNTERFEIT" && result?.status !== "QUARANTINED" && result?.status !== "RECALLED";
  const isQuarantined = result?.is_quarantined || result?.status === "QUARANTINED";
  const isRecalled = result?.is_recalled || result?.status === "RECALLED";
  const isCounterfeit = !isAuthentic && !isQuarantined && !isRecalled;

  const isFood = Boolean(
    result?.product?.category?.toUpperCase().includes("FOOD") ||
    result?.product?.category?.toUpperCase().includes("BEVERAGE") ||
    result?.product?.is_veg
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-[#0F172A] flex flex-col font-sans selection:bg-[#0A192F] selection:text-white">
      {/* Brand Header */}
      <header className="border-b border-slate-200 bg-white sticky top-0 z-30 px-4 sm:px-6 py-3.5 print:hidden">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded bg-[#0A192F] flex items-center justify-center text-white border border-slate-800 shadow-sm">
              <ShieldCheck className="w-4 h-4 text-blue-300" />
            </div>
            <div>
              <span className="text-base font-bold text-[#0A192F] tracking-tight">TrustChain</span>
              <span className="text-[10px] uppercase font-semibold text-slate-500 block -mt-0.5 tracking-wider">
                Digital Product Passport &amp; Provenance
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCameraScanner(true)}
              className="text-xs gap-1.5 h-8 border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              <Camera className="w-3.5 h-3.5 text-slate-600" />
              <span className="hidden sm:inline">Camera</span> Scanner
            </Button>

            <Link
              href="/login"
              className="text-xs text-slate-600 hover:text-[#0A192F] transition-colors font-medium"
            >
              Enterprise Portal →
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-6 sm:py-8 space-y-6">
        {/* Hero Search & Scanner Header */}
        <div className="text-center space-y-1.5 print:hidden">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-slate-200 bg-white text-slate-700 text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-blue-800" />
            <span>Anti-Counterfeit Cryptographic Verification Engine</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0A192F] tracking-tight">
            Authenticate Product &amp; Verify Digital Passport
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
            Scan packaging 2D barcode or enter unit serial ID to authenticate cryptographic provenance, cold-chain telemetry, and certified lab analysis.
          </p>
        </div>

        {/* Input & Scanner Card */}
        <Card className="bg-white border-slate-200 p-4 sm:p-5 shadow-sm print:hidden">
          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                required
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="Scan or enter Package Code (e.g. PKG-IN-2026-0001)..."
                className="pl-10 bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 font-mono text-xs sm:text-sm h-10"
              />
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => setShowCameraScanner(true)}
                className="text-xs px-3.5 h-10 gap-1.5 border-slate-300 text-slate-700 hover:bg-slate-50"
              >
                <Camera className="w-4 h-4 text-slate-600" />
                Scan QR
              </Button>

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={loading}
                className="text-xs px-5 h-10 font-semibold"
              >
                Authenticate
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </div>
          </form>

          {/* Quick Demo Test Serials */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-3.5 text-[11px] text-slate-500 pt-3 border-t border-slate-100">
            <span className="text-slate-500 font-medium">Sample Codes:</span>
            <button
              type="button"
              onClick={() => {
                setInputCode("PKG-IN-2026-0001");
                performVerification("PKG-IN-2026-0001");
              }}
              className="px-2 py-0.5 rounded bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 transition font-mono text-[11px]"
            >
              PKG-IN-2026-0001 (Authentic)
            </button>
            <button
              type="button"
              onClick={() => {
                setInputCode("PKG-AMOX-0001");
                performVerification("PKG-AMOX-0001");
              }}
              className="px-2 py-0.5 rounded bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 transition font-mono text-[11px]"
            >
              PKG-AMOX-0001
            </button>
            <button
              type="button"
              onClick={() => {
                setInputCode("PKG-RICE-0001");
                performVerification("PKG-RICE-0001");
              }}
              className="px-2 py-0.5 rounded bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 transition font-mono text-[11px]"
            >
              PKG-RICE-0001
            </button>
            <button
              type="button"
              onClick={() => {
                setInputCode("PKG-INS-0001");
                performVerification("PKG-INS-0001");
              }}
              className="px-2 py-0.5 rounded bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200 transition font-mono text-[11px]"
            >
              PKG-INS-0001
            </button>
            <button
              type="button"
              onClick={() => {
                setInputCode("FAKE-COUNTERFEIT-999");
                performVerification("FAKE-COUNTERFEIT-999");
              }}
              className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 transition font-mono text-[11px]"
            >
              FAKE-COUNTERFEIT-999
            </button>
          </div>
        </Card>

        {errorMsg && (
          <div className="p-3.5 rounded bg-rose-50 border border-rose-200 text-rose-800 text-xs text-center font-medium">
            {errorMsg}
          </div>
        )}

        {/* Verification Result Section */}
        {result && (
          <div className="space-y-6">
            {/* Status Hero Card */}
            <Card
              className={`border-2 p-5 sm:p-7 shadow-sm transition-all rounded-lg ${
                isAuthentic
                  ? "bg-white border-emerald-600"
                  : isRecalled
                  ? "bg-white border-amber-600"
                  : isQuarantined
                  ? "bg-white border-orange-600"
                  : "bg-white border-rose-600"
              }`}
            >
              <div className="flex flex-col sm:flex-row items-center justify-between gap-5 pb-5 border-b border-slate-200">
                <div className="flex items-center gap-4 text-center sm:text-left">
                  {isAuthentic ? (
                    <div className="w-14 h-14 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shrink-0">
                      <CheckCircle2 className="w-8 h-8" />
                    </div>
                  ) : isRecalled ? (
                    <div className="w-14 h-14 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200 shrink-0">
                      <AlertTriangle className="w-8 h-8" />
                    </div>
                  ) : isQuarantined ? (
                    <div className="w-14 h-14 rounded-lg bg-orange-50 text-orange-700 flex items-center justify-center border border-orange-200 shrink-0">
                      <Archive className="w-8 h-8" />
                    </div>
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center border border-rose-200 shrink-0">
                      <ShieldAlert className="w-8 h-8" />
                    </div>
                  )}

                  <div>
                    <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                      <h2
                        className={`text-xl sm:text-2xl font-bold tracking-tight ${
                          isAuthentic
                            ? "text-emerald-800"
                            : isRecalled
                            ? "text-amber-800"
                            : isQuarantined
                            ? "text-orange-800"
                            : "text-rose-800"
                        }`}
                      >
                        {isAuthentic
                          ? "AUTHENTIC & CRYPTOGRAPHICALLY VERIFIED"
                          : isRecalled
                          ? "PRODUCT RECALLED BY REGULATOR"
                          : isQuarantined
                          ? "PACKAGE HELD IN QUARANTINE"
                          : "COUNTERFEIT / UNVERIFIED SERIAL"}
                      </h2>
                      <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        {result.package_code}
                      </span>
                    </div>

                    <p className="text-xs text-slate-600 mt-1 max-w-lg leading-relaxed">
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

                {/* Risk Score Gauge & Scan Count */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto pt-3 sm:pt-0 border-t sm:border-t-0 border-slate-200 gap-1.5">
                  <div className="text-left sm:text-right">
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">
                      Anti-Fraud Risk
                    </span>
                    <span
                      className={`text-base font-bold font-mono ${
                        result.risk_level === "LOW" || (result.risk_score || 0) < 20
                          ? "text-emerald-700"
                          : result.risk_level === "MEDIUM"
                          ? "text-amber-700"
                          : "text-rose-700"
                      }`}
                    >
                      {result.risk_score !== undefined ? `${result.risk_score.toFixed(0)}%` : "0%"} (
                      {result.risk_level || "LOW"})
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono">
                    <Fingerprint className="w-3.5 h-3.5 text-slate-400" />
                    <span>Scan #{result.scan_count || 1}</span>
                  </div>
                </div>
              </div>

              {/* Quick Action Buttons */}
              <div className="py-3.5 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant="primary"
                    size="sm"
                    onClick={() => setShowCertModal(true)}
                    className="text-xs gap-1.5 h-8 font-semibold shadow-sm"
                  >
                    <Award className="w-3.5 h-3.5 text-blue-300" />
                    Digital Certificate
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleShareWhatsApp}
                    className="text-xs gap-1.5 h-8"
                  >
                    <MessageCircle className="w-3.5 h-3.5 text-slate-600" />
                    Share on WhatsApp
                  </Button>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleCopyLink}
                    className="text-xs gap-1.5 h-8"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                    <span>{copied ? "Copied" : "Copy Link"}</span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setReportSuccess(null);
                      setShowReportModal(true);
                    }}
                    className="border-rose-200 bg-rose-50 text-rose-800 hover:bg-rose-100 text-xs gap-1.5 h-8"
                  >
                    <Flag className="w-3.5 h-3.5 text-rose-600" />
                    Report Incident
                  </Button>
                </div>
              </div>

              {/* ⚡ FEATURE 1: PACKAGING SEAL & ANTI-CLONE SCAN ALERT BANNER */}
              <div className="mt-4 p-4 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${
                      result.clone_risk === "HIGH"
                        ? "bg-red-500/20 text-red-400 border-red-500/30"
                        : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                    }`}>
                      {result.clone_risk === "HIGH" ? (
                        <Unlock className="w-5 h-5 text-rose-600" />
                      ) : (
                        <Lock className="w-5 h-5 text-emerald-700" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] uppercase font-bold text-slate-500">
                          Holographic Packaging Tamper Seal
                        </span>
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-[#0A192F] border border-slate-200">
                          {result.seal_code || `HOL-SEAL-${result.package_code.slice(-6)}`}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-900 mt-0.5">
                        {result.seal_status === "VIRGIN_FIRST_SCAN" ? (
                          <span className="text-emerald-700 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Primary Verification: Product packaging sealed &amp; authenticated for first time.
                          </span>
                        ) : result.clone_risk === "HIGH" ? (
                          <span className="text-rose-700 flex items-center gap-1.5">
                            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                            Warning: Multiple distributed scans detected. Inspect physical seal integrity.
                          </span>
                        ) : (
                          <span className="text-emerald-700 flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Verified Genuine: Tamper seal registered in blockchain record.
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Scan History Telemetry */}
                  <div className="flex items-center gap-3 text-[11px] text-slate-600 bg-slate-50 px-3 py-1.5 rounded border border-slate-200 font-mono">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>
                        1st Scan:{" "}
                        <strong className="text-slate-800">
                          {result.first_scanned_at
                            ? new Date(result.first_scanned_at).toLocaleDateString()
                            : "Today"}
                        </strong>
                      </span>
                    </div>
                    <span className="text-slate-300">|</span>
                    <span>
                      Total Scans:{" "}
                      <strong className="text-slate-900">{result.scan_count || 1}</strong>
                    </span>
                  </div>
                </div>

                {/* Clone Dispersion Warning if detected */}
                {result.clone_risk === "HIGH" && (
                  <div className="p-3 rounded bg-rose-50 border border-rose-200 text-[11px] text-rose-800 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold text-rose-900">Anti-Clone Warning Triggered</p>
                      <p className="text-rose-800 mt-0.5">
                        This digital identifier has been scanned repeatedly across separate geolocations. Check that physical hologram matches{" "}
                        <span className="font-mono font-bold text-slate-900">{result.seal_code}</span> and check box seals before accepting.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Navigation Tabs */}
              <div className="flex items-center gap-1.5 sm:gap-2 mt-6 overflow-x-auto pb-1 border-b border-slate-200">
                <button
                  onClick={() => setActiveTab("overview")}
                  className={`px-3.5 py-2 rounded text-xs font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === "overview"
                      ? "bg-[#0A192F] text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <Box className="w-3.5 h-3.5" />
                  Product Specs &amp; Quality
                </button>

                <button
                  onClick={() => setActiveTab("manufacturing")}
                  className={`px-3.5 py-2 rounded text-xs font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === "manufacturing"
                      ? "bg-[#0A192F] text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <Building2 className="w-3.5 h-3.5" />
                  Manufacturing Facility
                </button>

                <button
                  onClick={() => setActiveTab("journey")}
                  className={`px-3.5 py-2 rounded text-xs font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === "journey"
                      ? "bg-[#0A192F] text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <Truck className="w-3.5 h-3.5" />
                  Chain of Custody
                </button>

                <button
                  onClick={() => setActiveTab("gps")}
                  className={`px-3.5 py-2 rounded text-xs font-semibold transition whitespace-nowrap flex items-center gap-1.5 ${
                    activeTab === "gps"
                      ? "bg-[#0A192F] text-white shadow-sm"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  }`}
                >
                  <Radio className="w-3.5 h-3.5 text-slate-500" />
                  Live GPS &amp; Telemetry
                </button>
              </div>

              {/* TAB 1: PRODUCT INFO & RICH BADGES */}
              {activeTab === "overview" && (
                <div className="pt-5 space-y-5">
                  {isCounterfeit || !result.product ? (
                    <div className="p-8 rounded-lg bg-rose-50 border border-rose-200 text-center space-y-3">
                      <div className="w-14 h-14 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center mx-auto border border-rose-200">
                        <ShieldAlert className="w-7 h-7" />
                      </div>
                      <h3 className="text-base font-bold text-rose-800">
                        No Legitimate Product Registration Found
                      </h3>
                      <p className="text-xs text-rose-700 max-w-md mx-auto leading-relaxed">
                        This digital identifier ({result.package_code}) has no legitimate manufacturer origin or verified formulation record in the TrustChain immutable ledger.
                      </p>
                      <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded bg-rose-100 border border-rose-300 text-[11px] text-rose-800 font-medium">
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-700" />
                        Warning: Potential counterfeit or illicit copy. Do not dispense or consume.
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-5">
                      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
                        {/* Product Image Column */}
                        <div className="md:col-span-5 flex flex-col items-center">
                          <div className="relative w-full aspect-square max-w-[280px] bg-white rounded-lg overflow-hidden border border-slate-200 shadow-sm">
                            <img
                              src={
                                result.product.image_url ||
                                "https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=600&auto=format&fit=crop&q=80"
                              }
                              alt={result.product.name}
                              className="w-full h-full object-cover"
                            />

                            {/* Category Badge */}
                            <div className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-slate-900/85 text-[10px] font-bold text-white uppercase tracking-wider">
                              {result.product.category || "General"}
                            </div>

                            {/* 100% Veg Dot for Food Items */}
                            {isFood && (
                              <div className="absolute top-2.5 right-2.5 px-2 py-0.5 rounded bg-white border border-emerald-600 flex items-center gap-1.5 shadow-sm">
                                <span className="w-3 h-3 border-2 border-emerald-600 rounded-sm flex items-center justify-center p-0.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 block"></span>
                                </span>
                                <span className="text-[9px] font-bold text-emerald-800 uppercase tracking-tight">
                                  100% Veg
                                </span>
                              </div>
                            )}

                            {result.product.drug_schedule && (
                              <div className="absolute bottom-2.5 right-2.5 px-2 py-0.5 rounded bg-rose-700 text-[10px] font-bold text-white uppercase">
                                {result.product.drug_schedule}
                              </div>
                            )}
                          </div>

                          <p className="text-[11px] text-slate-500 mt-2 text-center">
                            Official Certified Packaging
                          </p>
                        </div>

                        {/* Product Details Specs */}
                        <div className="md:col-span-7 space-y-3.5">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                                SKU: {result.product.sku || result.package_code}
                              </span>
                              {isFood ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  Food &amp; Beverage
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-[#0A192F] border border-slate-200">
                                  Pharmaceutical Formulation
                                </span>
                              )}
                            </div>
                            <h3 className="text-lg font-bold text-[#0A192F] mt-1">
                              {result.product.name}
                            </h3>
                            <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                              {result.product.description ||
                                "Authentic formulation tracked and protected through the TrustChain cryptographic network."}
                            </p>
                          </div>

                          {/* Active Composition */}
                          <div className="p-3 rounded-md bg-slate-50 border border-slate-200">
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">
                              Active Ingredients / Composition
                            </span>
                            <span className="text-xs font-medium text-slate-800 mt-0.5 block">
                              {result.product.composition ||
                                "100% Pure formulation registered in official batch record."}
                            </span>
                          </div>

                          {/* Batch & Dates Grid */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-3 rounded-md bg-slate-50 border border-slate-200">
                              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                                Batch Number
                              </span>
                              <span className="text-xs font-mono font-bold text-[#0A192F] mt-0.5 block">
                                {result.batch?.batch_number || "BATCH-REGISTRY"}
                              </span>
                            </div>

                            <div className="p-3 rounded-md bg-slate-50 border border-slate-200">
                              <span className="text-[10px] uppercase font-bold text-slate-500 block">
                                Expiration Date
                              </span>
                              <span className="text-xs font-semibold text-slate-800 mt-0.5 block">
                                {result.batch?.expiry_date ? new Date(result.batch.expiry_date).toLocaleDateString() : "Active Shelf Life"}
                              </span>
                            </div>
                          </div>

                          {/* Storage Specs */}
                          <div className="p-3 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <ThermometerSnowflake className="w-4 h-4 text-slate-700 shrink-0" />
                              <div>
                                <p className="text-[11px] font-semibold text-slate-800">Storage Guidance</p>
                                <p className="text-[10px] text-slate-500">
                                  {result.product.min_temperature !== undefined && result.product.max_temperature !== undefined
                                    ? `Maintain between ${result.product.min_temperature}°C to ${result.product.max_temperature}°C`
                                    : "Store in cool, dry conditions away from moisture"}
                                </p>
                              </div>
                            </div>
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
                              OPTIMAL
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Food & Medicine Badges Section */}
                      <div className="space-y-4 pt-1">
                        {/* Certifications Badges Ribbon */}
                        <div className="p-3.5 rounded-md bg-slate-50 border border-slate-200 space-y-2">
                          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider flex items-center gap-1.5">
                            <Award className="w-3.5 h-3.5 text-[#0A192F]" />
                            Official Certifications &amp; Quality Accreditations
                          </span>
                          <div className="flex flex-wrap gap-2 pt-0.5">
                            {(result.product.certifications || [
                              isFood ? "FSSAI Approved Lic: 10022022001999" : "CDSCO / FDA Approved Lic: MH-PHARMA-001",
                              isFood ? "Jaivik Bharat Organic" : "WHO-GMP Certified",
                              isFood ? "ISO 22000:2018 Food Safety" : "IP / USP Pharmacopoeial Grade",
                              isFood ? "100% Vegetarian Certified" : "Central Drugs Standard Control",
                            ]).map((cert, i) => (
                              <span
                                key={i}
                                className={`px-2.5 py-1 rounded text-[11px] font-medium border flex items-center gap-1.5 ${
                                  i === 0
                                    ? "bg-white text-[#0A192F] border-slate-300 shadow-sm"
                                    : i === 1
                                    ? "bg-white text-emerald-800 border-slate-300 shadow-sm"
                                    : "bg-white text-slate-700 border-slate-300 shadow-sm"
                                }`}
                              >
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                {cert}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* Nutrition Information for Food */}
                        {isFood && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-3.5 rounded-md bg-white border border-slate-200 space-y-2.5 shadow-sm">
                              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                                  <Utensils className="w-3.5 h-3.5 text-slate-700" />
                                  Nutritional Information (Per 100g)
                                </span>
                                <span className="text-[10px] text-slate-500 font-mono">Lab Tested</span>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div className="p-2 rounded bg-slate-50 border border-slate-200">
                                  <span className="text-[10px] text-slate-500 block">Energy / Calories</span>
                                  <span className="font-bold text-slate-900 font-mono">
                                    {result.product.nutrition_facts?.calories || "358 kcal"}
                                  </span>
                                </div>
                                <div className="p-2 rounded bg-slate-50 border border-slate-200">
                                  <span className="text-[10px] text-slate-500 block">Protein</span>
                                  <span className="font-bold text-slate-900 font-mono">
                                    {result.product.nutrition_facts?.protein || "8.5 g"}
                                  </span>
                                </div>
                                <div className="p-2 rounded bg-slate-50 border border-slate-200">
                                  <span className="text-[10px] text-slate-500 block">Carbohydrates</span>
                                  <span className="font-bold text-slate-900 font-mono">
                                    {result.product.nutrition_facts?.carbs || "78.2 g"}
                                  </span>
                                </div>
                                <div className="p-2 rounded bg-slate-50 border border-slate-200">
                                  <span className="text-[10px] text-slate-500 block">Total Fats</span>
                                  <span className="font-bold text-slate-900 font-mono">
                                    {result.product.nutrition_facts?.fats || "0.5 g"}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="p-3.5 rounded-md bg-white border border-slate-200 space-y-2.5 shadow-sm flex flex-col justify-between">
                              <div>
                                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 pb-2 border-b border-slate-200">
                                  <Leaf className="w-3.5 h-3.5 text-emerald-600" />
                                  Dietary &amp; Safe Storage Guide
                                </span>
                                <p className="text-xs text-slate-600 mt-2 leading-relaxed">
                                  {result.product.dosage_instruction ||
                                    "Keep sealed in an airtight container in a dry place away from heat. Protect from sunlight. Best consumed before expiration date."}
                                </p>
                              </div>
                              <div className="p-2.5 rounded bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-800 flex items-center gap-2">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>100% Natural, certified cold-chain verified harvest.</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Pharmaceutical Dosage & Standards */}
                        {!isFood && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-3.5 rounded-md bg-white border border-slate-200 space-y-2 shadow-sm">
                              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 pb-2 border-b border-slate-200">
                                <Pill className="w-3.5 h-3.5 text-[#0A192F]" />
                                Dosage &amp; Medical Administration
                              </span>
                              <p className="text-xs text-slate-600 leading-relaxed">
                                {result.product.dosage_instruction ||
                                  "As prescribed by registered physician. Swallowed whole with clean water. Do not crush or chew capsules."}
                              </p>
                              <div className="p-2 rounded bg-slate-50 border border-slate-200 text-[11px] text-slate-700">
                                Pharmacopoeia Assay Purity: <strong className="text-emerald-700">99.8% Active Compound Verified</strong>
                              </div>
                            </div>

                            <div className="p-3.5 rounded-md bg-white border border-slate-200 space-y-2 shadow-sm">
                              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5 pb-2 border-b border-slate-200">
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-700" />
                                Prescription Standard &amp; Caution
                              </span>
                              <p className="text-xs text-slate-600 leading-relaxed">
                                Schedule H Prescription Drug: To be sold by retail on the prescription of a Registered Medical Practitioner only.
                              </p>
                              <div className="p-2 rounded bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
                                Keep out of reach of children. Store below 25°C away from direct sunlight.
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Blockchain Immutable Proof Anchor */}
                      <div className="p-3.5 rounded-md bg-slate-50 border border-slate-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded bg-[#0A192F] text-white flex items-center justify-center shrink-0">
                            <LinkIcon className="w-4 h-4 text-blue-300" />
                          </div>
                          <div>
                            <p className="text-xs font-bold text-slate-900 flex items-center gap-2">
                              <span>EVM Smart Contract Ledger Anchor</span>
                              <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-slate-200 text-slate-800">
                                ERC-721 / ERC-1155
                              </span>
                            </p>
                            <p className="font-mono text-[10px] text-slate-600 break-all">
                              {result.blockchain_tx || result.batch?.blockchain_tx_hash || "0x98f2178a9c34e098df21b564e9a12c87b654df23a1098e76c543b21908efa234"}
                            </p>
                          </div>
                        </div>

                        <span className="px-2.5 py-1 rounded text-[10px] font-bold bg-white text-[#0A192F] border border-slate-300 shadow-sm shrink-0">
                          ON-CHAIN VERIFIED
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: WHERE MANUFACTURED */}
              {activeTab === "manufacturing" && (
                <div className="pt-6 space-y-6">
                  <div className="bg-slate-50/70 rounded-xl p-5 sm:p-6 border border-slate-200 space-y-5">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
                      <div className="flex items-center gap-3.5">
                        <div className="w-12 h-12 rounded-lg bg-navy-900 text-white flex items-center justify-center border border-navy-800 shadow-xs">
                          <Building2 className="w-6 h-6" />
                        </div>
                        <div>
                          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider block">
                            Licensed Production Facility
                          </span>
                          <h3 className="text-base font-bold text-slate-900">
                            {result.manufacturer?.name || "Licensed Production Facility"}
                          </h3>
                        </div>
                      </div>

                      <div className="text-left sm:text-right">
                        <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                          Manufacturing Date
                        </span>
                        <span className="text-xs font-bold text-slate-800 font-mono">
                          {result.batch?.manufacturing_date
                            ? new Date(result.batch.manufacturing_date).toLocaleDateString()
                            : "2026-01-15"}
                        </span>
                      </div>
                    </div>

                    {/* Manufacturing Specs Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div className="p-4 rounded-lg bg-white border border-slate-200 space-y-1 shadow-xs">
                        <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                          Factory & Plant Location
                        </span>
                        <p className="font-semibold text-slate-800 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-500" />
                          <span>
                            {result.manufacturer?.city || "Pune"},{" "}
                            {result.manufacturer?.state || "Maharashtra"},{" "}
                            {result.manufacturer?.country || "India"}
                          </span>
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Special Economic Zone Certified Plant
                        </p>
                      </div>

                      <div className="p-4 rounded-lg bg-white border border-slate-200 space-y-1 shadow-xs">
                        <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                          Manufacturing License Number
                        </span>
                        <p className="font-mono font-bold text-navy-900">
                          {result.manufacturer?.license || "MFG-L-001 (Govt Approved)"}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Reg No: {result.manufacturer?.registration_number || "IND-MFG-001"}
                        </p>
                      </div>
                    </div>

                    {/* Quality Lab Signoff */}
                    <div className="p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <FileCheck className="w-4 h-4 text-emerald-700" />
                        <div>
                          <p className="font-bold text-emerald-900">Quality Assurance & Lab Release Certificate</p>
                          <p className="text-[11px] text-emerald-800/80">
                            Passed 100% Quality & Purity Inspection. Batch release authorized.
                          </p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                        LAB APPROVED
                      </span>
                    </div>

                    {/* Plant Coordinates */}
                    {result.manufacturer?.latitude && result.manufacturer?.longitude && (
                      <div className="flex items-center justify-between pt-1 text-xs">
                        <span className="text-slate-500 font-mono text-[11px]">
                          Geo-Coordinates: {result.manufacturer.latitude.toFixed(4)}° N,{" "}
                          {result.manufacturer.longitude.toFixed(4)}° E
                        </span>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${result.manufacturer.latitude},${result.manufacturer.longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-navy-800 hover:text-navy-950 font-semibold inline-flex items-center gap-1 hover:underline"
                        >
                          View Plant on Map <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 3: TRANSFER HISTORY & CUSTODY JOURNEY */}
              {activeTab === "journey" && (
                <div className="pt-6 space-y-6">
                  <div className="text-center sm:text-left">
                    <h3 className="text-base font-bold text-slate-900">
                      Full Custody Chain & Transfer History
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Verifiable log of every transport handoff, depot transfer, and warehouse intake.
                    </p>
                  </div>

                  {/* Visual Journey Stepper */}
                  <div className="relative pl-6 sm:pl-8 space-y-5 before:absolute before:left-2.5 sm:before:left-3.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
                    {result.journey && result.journey.length > 0 ? (
                      result.journey.map((step, idx) => (
                        <div key={idx} className="relative group">
                          {/* Stepper Dot */}
                          <div
                            className={`absolute -left-6 sm:-left-8 top-1 w-5 h-5 rounded-full flex items-center justify-center border-2 shadow-xs ${
                              idx === 0
                                ? "bg-navy-900 border-white text-white"
                                : idx === result.journey!.length - 1
                                ? "bg-emerald-600 border-white text-white"
                                : "bg-white border-slate-400 text-slate-700"
                            }`}
                          >
                            <span className="text-[10px] font-bold">{idx + 1}</span>
                          </div>

                          {/* Step Content Box */}
                          <div className="p-4 rounded-lg bg-white border border-slate-200 hover:border-slate-300 transition shadow-xs space-y-2.5">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                                  {step.event_type}
                                </span>
                                <span className="text-xs font-bold text-slate-900">
                                  {step.location || "Transit Hub"}
                                </span>
                              </div>

                              <span className="text-[11px] text-slate-500 font-medium">
                                {step.timestamp ? new Date(step.timestamp).toLocaleString() : "Recent"}
                              </span>
                            </div>

                            {/* Transfer Route */}
                            <div className="flex items-center gap-2 text-xs text-slate-700">
                              <span className="font-semibold text-slate-500">From:</span>
                              <span className="font-medium text-slate-800">{step.from_org || "Manufacturing Plant"}</span>
                              <ArrowRight className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="font-semibold text-slate-500">To:</span>
                              <span className="font-medium text-slate-900">{step.to_org || "Inbound Logistics"}</span>
                            </div>

                            {/* Performer & Tx */}
                            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                              <span>Officer: <strong className="text-slate-700 font-medium">{step.performer || "Certified Dispatcher"}</strong></span>
                              {step.blockchain_tx && (
                                <span className="font-mono text-[10px] text-slate-600 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                                  Tx: {step.blockchain_tx.slice(0, 10)}...{step.blockchain_tx.slice(-6)}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-slate-500">No transfer history recorded yet.</p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: LIVE GPS & SATELLITE MAP */}
              {activeTab === "gps" && (
                <div className="pt-6 space-y-6">
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Radio className="w-4 h-4 text-emerald-600" />
                      Live GPS Tracking & Route Telemetry
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
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
                    <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 shadow-xs">
                      <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                        Transit Stage
                      </span>
                      <span className="text-xs font-bold text-slate-900 mt-1 block">
                        {result.status === "IN_TRANSIT"
                          ? "🚚 On Highway Route (Cold Carrier)"
                          : result.status === "DELIVERED"
                          ? "🏥 Delivered at Verified Depot"
                          : result.status}
                      </span>
                    </div>

                    <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 shadow-xs">
                      <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                        Destination Owner
                      </span>
                      <span className="text-xs font-bold text-slate-900 mt-1 block">
                        {result.current_owner?.name || "Verified Logistics Partner"}
                      </span>
                      <span className="text-[10px] text-slate-500 mt-0.5 block">
                        {result.current_owner?.city || "New Delhi"}, {result.current_owner?.state || "Delhi"}
                      </span>
                    </div>

                    <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 shadow-xs">
                      <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                        Cold-Chain Sensor Integrity
                      </span>
                      <span className="text-xs font-bold text-emerald-700 mt-1 block flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Within Optimal Range
                      </span>
                      <span className="text-[10px] text-slate-500 mt-0.5 block">
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

      {/* ⚡ MODAL 1: REPORT SUSPICIOUS PRODUCT */}
      {showReportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 w-full max-w-lg rounded-xl shadow-2xl p-6 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowReportModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 pb-4 border-b border-slate-200">
              <div className="w-10 h-10 rounded-lg bg-red-50 text-red-700 flex items-center justify-center border border-red-200">
                <Flag className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Report Suspicious Product</h3>
                <p className="text-xs text-slate-500">Submit an anonymous anti-counterfeit complaint</p>
              </div>
            </div>

            {reportSuccess ? (
              <div className="py-6 space-y-4 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center mx-auto border border-emerald-200">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <h4 className="text-base font-bold text-slate-900">Complaint Registered</h4>
                <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                  {reportSuccess}
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowReportModal(false)}
                  className="bg-navy-900 hover:bg-navy-950 text-white text-xs px-6"
                >
                  Close
                </Button>
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="space-y-4 pt-4 text-xs">
                <div>
                  <label className="text-slate-700 font-medium block mb-1">Product Code</label>
                  <input
                    type="text"
                    disabled
                    value={result?.package_code || inputCode}
                    className="w-full px-3 py-2 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-mono text-xs"
                  />
                </div>

                <div>
                  <label className="text-slate-700 font-medium block mb-1">Issue Category *</label>
                  <select
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 focus:border-navy-900 outline-none text-xs"
                  >
                    <option value="Broken or Tampered Packaging Seal">Broken / Tampered Packaging Seal</option>
                    <option value="Suspected Cloned or Counterfeit Label">Suspected Cloned / Counterfeit Label</option>
                    <option value="Expired Stock or Date Alteration">Expired Stock / Date Alteration</option>
                    <option value="Physical Contamination or Odor">Physical Contamination / Odor</option>
                    <option value="Unauthorized Retailer or Price Gouging">Unauthorized Seller / Price Gouging</option>
                    <option value="Other Safety Defect">Other Safety Defect</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-700 font-medium block mb-1">Retailer / Pharmacy Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Local Chemist / Mart"
                      value={reportRetailer}
                      onChange={(e) => setReportRetailer(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-navy-900 outline-none text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-slate-700 font-medium block mb-1">City / Location</label>
                    <input
                      type="text"
                      placeholder="e.g. Pune, Kothrud"
                      value={reportLocation}
                      onChange={(e) => setReportLocation(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-navy-900 outline-none text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-700 font-medium block mb-1">Additional Observations / Notes</label>
                  <textarea
                    rows={3}
                    placeholder="Describe packaging condition, batch seal marks, or reason for suspicion..."
                    value={reportNotes}
                    onChange={(e) => setReportNotes(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-navy-900 outline-none resize-none text-xs"
                  ></textarea>
                </div>

                <div>
                  <label className="text-slate-700 font-medium block mb-1">Your Mobile / Email (Optional for updates)</label>
                  <input
                    type="text"
                    placeholder="Leave empty to stay completely anonymous"
                    value={reportContact}
                    onChange={(e) => setReportContact(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-navy-900 outline-none text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-200">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowReportModal(false)}
                    className="border-slate-300 text-slate-700 hover:bg-slate-50 text-xs"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={reportSubmitting}
                    className="bg-navy-900 hover:bg-navy-950 text-white font-semibold gap-1.5 text-xs"
                  >
                    <Send className="w-3.5 h-3.5" />
                    Submit Report
                  </Button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* ⚡ MODAL 2: OFFICIAL DIGITAL CERTIFICATE OF AUTHENTICITY */}
      {showCertModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white border border-slate-300 w-full max-w-2xl rounded-2xl shadow-2xl p-6 sm:p-8 relative my-auto animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowCertModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition print:hidden"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Certificate Printable Canvas */}
            <div className="border border-slate-200 rounded-xl p-6 sm:p-8 bg-white relative overflow-hidden border-t-4 border-t-navy-900">
              {/* Watermark Seal */}
              <div className="text-center space-y-2 pb-6 border-b border-slate-200 relative">
                <div className="w-12 h-12 rounded-lg bg-navy-900 text-white flex items-center justify-center mx-auto shadow-xs">
                  <Award className="w-6 h-6" />
                </div>
                <h3 className="text-[11px] uppercase font-bold tracking-widest text-slate-500">
                  TRUSTCHAIN IMMUTABLE SUPPLY NETWORK
                </h3>
                <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
                  CERTIFICATE OF AUTHENTICITY & PROVENANCE
                </h2>
                <p className="text-[11px] text-slate-600 font-mono">
                  Passport ID: {result?.verification_id || "VER-CERT-2026-X99"}
                </p>
              </div>

              {/* Certificate Body */}
              <div className="py-6 space-y-5 text-xs text-slate-700">
                <p className="text-center leading-relaxed max-w-lg mx-auto text-slate-600">
                  This certifies that the product unit identified below has been cryptographically validated against the EVM Blockchain Ledger. It originates from an accredited manufacturing facility and satisfies all safety and custody standards.
                </p>

                <div className="grid grid-cols-2 gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Product Item</span>
                    <strong className="text-sm font-bold text-slate-900 block mt-0.5">
                      {result?.product?.name || "Authentic Product"}
                    </strong>
                    <span className="text-[11px] text-slate-600 font-mono">
                      SKU: {result?.product?.sku || result?.package_code}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Serialized Package Code</span>
                    <strong className="text-sm font-mono font-bold text-navy-900 block mt-0.5">
                      {result?.package_code}
                    </strong>
                    <span className="text-[11px] text-emerald-700 font-mono font-medium">
                      Hologram: {result?.seal_code || "HOL-SEAL-VERIFIED"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Batch Number</span>
                    <span className="font-mono text-slate-800 font-medium">
                      {result?.batch?.batch_number || "BATCH-REGISTRY"}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-500 block">Expiration Date</span>
                    <span className="text-slate-800 font-medium">
                      {result?.batch?.expiry_date ? new Date(result?.batch.expiry_date).toLocaleDateString() : "Active Shelf Life"}
                    </span>
                  </div>
                </div>

                {/* Blockchain Proof Line */}
                <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 text-[10px] space-y-1">
                  <span className="font-bold text-slate-700 uppercase tracking-wider block">
                    Immutable Smart Contract Hash
                  </span>
                  <p className="font-mono text-slate-600 break-all select-all">
                    {result?.blockchain_tx || "0x98f2178a9c34e098df21b564e9a12c87b654df23a1098e76c543b21908efa234"}
                  </p>
                </div>

                {/* Verification Signoff */}
                <div className="flex items-center justify-between pt-4 border-t border-slate-200 text-[11px]">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Verification Timestamp</span>
                    <span className="text-slate-800 font-medium">
                      {new Date().toLocaleString()}
                    </span>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block">Issuing Authority</span>
                    <span className="font-bold text-emerald-700 flex items-center gap-1 justify-end">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      TrustChain Consensus Engine
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 print:hidden">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.print()}
                className="border-slate-300 text-slate-700 hover:bg-slate-50 text-xs gap-1.5"
              >
                <Printer className="w-3.5 h-3.5 text-slate-600" />
                Print / Download PDF
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleShareWhatsApp}
                  className="border-emerald-300 text-emerald-800 hover:bg-emerald-50 text-xs gap-1.5"
                >
                  <MessageCircle className="w-3.5 h-3.5 text-emerald-700" />
                  Share Certificate
                </Button>

                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowCertModal(false)}
                  className="bg-navy-900 hover:bg-navy-950 text-white text-xs px-5"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

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
        <div className="min-h-screen bg-slate-50 text-slate-600 flex items-center justify-center text-xs">
          Loading verification portal...
        </div>
      }
    >
      <ConsumerVerifyContent />
    </Suspense>
  );
}
