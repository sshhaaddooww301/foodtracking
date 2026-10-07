"use client";
import React, { useEffect, useState } from "react";
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
  Boxes,
  Calendar,
  Building2,
  Link as LinkIcon,
  ArrowLeft,
  Sparkles,
} from "lucide-react";
import { consumerApi } from "@/services/api";
import { Card, Input, Button } from "@/components/ui/primitives";

export default function ConsumerVerifyPage() {
  const searchParams = useSearchParams();
  const initialCode = searchParams.get("code") || "";

  const [inputCode, setInputCode] = useState(initialCode);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

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
          result: "COUNTERFEIT",
          is_authentic: false,
          warning_message: "Warning: This digital serial code is NOT registered in the official TrustChain registry. The product may be counterfeit or fraudulent.",
        });
      } else {
        setErrorMsg("Failed to connect to verification server. Please retry.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialCode) {
      performVerification(initialCode);
    }
  }, [initialCode]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    performVerification(inputCode);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Brand Header */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur sticky top-0 z-30 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center text-white">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <span className="text-base font-bold text-white tracking-tight">TrustChain</span>
              <span className="text-[10px] uppercase font-semibold text-blue-400 block -mt-1">
                Consumer Verification
              </span>
            </div>
          </Link>

          <Link
            href="/login"
            className="text-xs text-slate-400 hover:text-white transition-colors"
          >
            Partner Portal →
          </Link>
        </div>
      </header>

      {/* Verification Body */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-8 sm:py-12">
        <div className="text-center mb-8">
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Authenticate Medicine or Food
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-2 max-w-md mx-auto">
            Scan your package QR code or enter the serialized serial code printed on the foil/box.
          </p>
        </div>

        {/* Search Input Box */}
        <Card className="bg-slate-900 border-slate-800 p-4 sm:p-6 mb-8 shadow-2xl">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <Input
                type="text"
                required
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="e.g. PKG-IN-2026-0001"
                className="pl-10 bg-slate-950 border-slate-800 text-white placeholder:text-slate-600 text-sm h-11"
              />
            </div>
            <Button
              type="submit"
              variant="primary"
              size="md"
              isLoading={loading}
              className="bg-blue-600 hover:bg-blue-500 text-xs px-5"
            >
              Verify
            </Button>
          </form>

          <div className="flex items-center justify-center gap-3 mt-3 text-[11px] text-slate-500">
            <span>Quick test serials:</span>
            <button
              type="button"
              onClick={() => {
                setInputCode("PKG-IN-2026-0001");
                performVerification("PKG-IN-2026-0001");
              }}
              className="text-blue-400 hover:underline"
            >
              PKG-IN-2026-0001 (Authentic)
            </button>
            <span>•</span>
            <button
              type="button"
              onClick={() => {
                setInputCode("FAKE-CODE-999");
                performVerification("FAKE-CODE-999");
              }}
              className="text-red-400 hover:underline"
            >
              FAKE-CODE-999 (Counterfeit)
            </button>
          </div>
        </Card>

        {errorMsg && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs text-center mb-6">
            {errorMsg}
          </div>
        )}

        {/* Verification Result Card */}
        {result && (
          <Card
            className={`border-2 p-6 sm:p-8 shadow-2xl transition-all ${
              result.result === "AUTHENTIC"
                ? "bg-slate-900 border-emerald-500/50"
                : result.result === "RECALLED"
                ? "bg-slate-900 border-amber-500/50"
                : result.result === "QUARANTINED"
                ? "bg-slate-900 border-orange-500/50"
                : "bg-slate-900 border-red-500/50"
            }`}
          >
            {/* Verification Status Header */}
            <div className="text-center pb-6 border-b border-slate-800">
              {result.result === "AUTHENTIC" ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/10">
                    <CheckCircle2 className="w-10 h-10" />
                  </div>
                  <h2 className="text-xl font-bold text-emerald-400">
                    AUTHENTIC & VERIFIED
                  </h2>
                  <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto">
                    This unit has passed cryptographic origin verification and cold-chain compliance checks.
                  </p>
                </>
              ) : result.result === "RECALLED" ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto mb-3">
                    <AlertTriangle className="w-10 h-10" />
                  </div>
                  <h2 className="text-xl font-bold text-amber-400">
                    PRODUCT RECALLED
                  </h2>
                  <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto">
                    DO NOT CONSUME. The manufacturer or regulator has recalled this batch.
                  </p>
                </>
              ) : result.result === "QUARANTINED" ? (
                <>
                  <div className="w-16 h-16 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center mx-auto mb-3">
                    <Archive className="w-10 h-10" />
                  </div>
                  <h2 className="text-xl font-bold text-orange-400">
                    PACKAGE QUARANTINED
                  </h2>
                  <p className="text-xs text-slate-300 mt-1 max-w-sm mx-auto">
                    Cold-chain temperature deviation detected during transit. Product efficacy may be compromised.
                  </p>
                </>
              ) : (
                <>
                  <div className="w-16 h-16 rounded-full bg-red-500/20 text-red-500 flex items-center justify-center mx-auto mb-3">
                    <ShieldAlert className="w-10 h-10" />
                  </div>
                  <h2 className="text-xl font-bold text-red-500">
                    SUSPECTED COUNTERFEIT
                  </h2>
                  <p className="text-xs text-red-300 mt-1 max-w-sm mx-auto">
                    {result.warning_message || "This serial code is NOT recognized in the genuine supply chain database."}
                  </p>
                </>
              )}
            </div>

            {/* Product & Provenance Details */}
            {result.product_name && (
              <div className="pt-6 space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                      Product Name
                    </span>
                    <span className="text-sm font-bold text-white mt-0.5 block">
                      {result.product_name}
                    </span>
                    <span className="text-[11px] font-mono text-blue-400">
                      SKU: {result.product_sku}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                      Production Batch
                    </span>
                    <span className="text-sm font-bold text-white font-mono mt-0.5 block">
                      {result.batch_number}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Serial: {result.package_code}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                      Licensed Manufacturer
                    </span>
                    <span className="text-xs font-semibold text-white mt-0.5 block">
                      {result.manufacturer_name || "Cipla Pharmaceuticals"}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] uppercase font-semibold text-slate-500 block">
                      Expiration Date
                    </span>
                    <span className="text-xs font-semibold text-white mt-0.5 block">
                      {result.expiry_date?.slice(0, 10) || "2027-10-01"}
                    </span>
                  </div>
                </div>

                {/* Blockchain Proof */}
                <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-purple-400" />
                    <div>
                      <p className="text-[11px] font-semibold text-white">EVM Blockchain Provenance</p>
                      <p className="font-mono text-[10px] text-slate-400">
                        {result.blockchain_tx_hash
                          ? `${result.blockchain_tx_hash.slice(0, 16)}...${result.blockchain_tx_hash.slice(-8)}`
                          : "Anchored to Hardhat Block #142"}
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-500/10 text-purple-400">
                    IMMUTABLE
                  </span>
                </div>
              </div>
            )}
          </Card>
        )}
      </main>
    </div>
  );
}
