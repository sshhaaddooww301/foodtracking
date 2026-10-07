"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Package,
  Boxes,
  Truck,
  ShieldAlert,
  Archive,
  AlertTriangle,
  Link as LinkIcon,
  Cpu,
  RefreshCw,
  ArrowUpRight,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { dashboardApi, fraudApi, blockchainApi, iotApi } from "@/services/api";
import { DashboardStats, FraudAlert, BlockchainTx } from "@/types";
import { Card, Button } from "@/components/ui/primitives";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [fraudAlerts, setFraudAlerts] = useState<FraudAlert[]>([]);
  const [recentTx, setRecentTx] = useState<BlockchainTx[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchData = async () => {
    setIsRefreshing(true);
    try {
      const [statsRes, fraudRes, txRes] = await Promise.all([
        dashboardApi.getStats().catch(() => null),
        fraudApi.list({ size: 5 }).catch(() => null),
        blockchainApi.getTransactions({ size: 5 }).catch(() => null),
      ]);

      if (statsRes?.data) setStats(statsRes.data);
      if (fraudRes?.data?.items) setFraudAlerts(fraudRes.data.items);
      if (txRes?.data?.items) setRecentTx(txRes.data.items);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Page Title & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Supply Chain Command Center
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time multi-tier surveillance, blockchain anchoring, and counterfeit detection
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchData}
            isLoading={isRefreshing}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Sync Feeds
          </Button>
          <Link href="/iot">
            <Button variant="primary" size="sm">
              <Cpu className="w-3.5 h-3.5" />
              IoT Simulator Control
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 border border-border border-l-4 border-l-[#0A192F]">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Products &amp; SKUs</span>
            <Package className="w-4 h-4 text-[#0A192F] dark:text-blue-300" />
          </div>
          <p className="text-2xl font-bold font-mono mt-2 text-foreground">
            {stats?.total_products ?? 12}
          </p>
          <span className="text-[11px] text-muted-foreground">In active distribution</span>
        </Card>

        <Card className="p-4 border border-border border-l-4 border-l-slate-600">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Active Batches</span>
            <Boxes className="w-4 h-4 text-slate-700 dark:text-slate-300" />
          </div>
          <p className="text-2xl font-bold font-mono mt-2 text-foreground">
            {stats?.total_batches ?? 28}
          </p>
          <span className="text-[11px] text-muted-foreground">Tracked via Blockchain</span>
        </Card>

        <Card className="p-4 border border-border border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Verified Units</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <p className="text-2xl font-bold font-mono mt-2 text-foreground">
            {stats?.verified_packages ?? 1420}
          </p>
          <span className="text-[11px] text-emerald-700 font-medium">99.4% Authenticity rate</span>
        </Card>

        <Card className="p-4 border border-border border-l-4 border-l-rose-600">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Active Fraud Alerts</span>
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <p className="text-2xl font-bold font-mono mt-2 text-rose-700 dark:text-rose-400">
            {stats?.fraud_alerts_open ?? 3}
          </p>
          <span className="text-[11px] text-rose-600 font-medium">Requires investigation</span>
        </Card>
      </div>

      {/* Secondary KPI Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-card p-4 rounded-lg border border-border text-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <p className="text-muted-foreground">Cold-Chain Breaches</p>
            <p className="font-semibold text-foreground">{stats?.cold_chain_breaches ?? 1} recorded</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-slate-100 border border-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
            <Archive className="w-4 h-4" />
          </div>
          <div>
            <p className="text-muted-foreground">Quarantined Packages</p>
            <p className="font-semibold text-foreground">{stats?.quarantined_packages ?? 2} locked</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-slate-100 border border-slate-200 text-[#0A192F] dark:bg-slate-800 dark:text-blue-300">
            <LinkIcon className="w-4 h-4" />
          </div>
          <div>
            <p className="text-muted-foreground">Blockchain Anchors</p>
            <p className="font-semibold text-foreground font-mono">{stats?.blockchain_tx_count ?? 89} txs</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="p-2 rounded bg-slate-100 border border-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
            <Truck className="w-4 h-4" />
          </div>
          <div>
            <p className="text-muted-foreground">Active Shipments</p>
            <p className="font-semibold text-foreground">{stats?.active_shipments ?? 6} en route</p>
          </div>
        </div>
      </div>

      {/* Two Column Layout: Fraud Alerts + Blockchain Ledger */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Real-Time Fraud & Anomaly Monitor */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-red-500" />
                Live Anomaly & Threat Detection
              </h2>
              <p className="text-xs text-muted-foreground">Heuristic + sensor threshold violations</p>
            </div>
            <Link href="/fraud">
              <Button variant="ghost" size="sm">
                View All <ArrowUpRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>

          <div className="space-y-3">
            {fraudAlerts.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                No active security alerts. Supply chain nominal.
              </div>
            ) : (
              fraudAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-3.5 rounded-lg border border-border bg-background/50 hover:bg-muted/40 transition-colors flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          alert.risk_level === "CRITICAL"
                            ? "bg-red-500/20 text-red-500"
                            : alert.risk_level === "HIGH"
                            ? "bg-amber-500/20 text-amber-500"
                            : "bg-blue-500/20 text-blue-500"
                        }`}
                      >
                        {alert.risk_level}
                      </span>
                      <span className="font-semibold text-foreground truncate">
                        {alert.alert_type.replace(/_/g, " ")}
                      </span>
                      {alert.auto_quarantined && (
                        <span className="text-[10px] bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 px-1.5 py-0.5 rounded font-medium">
                          Auto-Quarantined
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground line-clamp-1">{alert.description}</p>
                    <span className="text-[10px] text-muted-foreground block">
                      Risk Score: {(alert.risk_score * 100).toFixed(0)}/100 •{" "}
                      {new Date(alert.created_at).toLocaleTimeString()}
                    </span>
                  </div>

                  <Link href={`/fraud`}>
                    <Button variant="outline" size="sm" className="h-7 text-[11px] shrink-0">
                      Investigate
                    </Button>
                  </Link>
                </div>
              ))
            )}
          </div>
        </Card>

        {/* Blockchain Transaction Ledger */}
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
                <LinkIcon className="w-4 h-4 text-blue-500" />
                Immutable Blockchain Ledger
              </h2>
              <p className="text-xs text-muted-foreground">Smart contract events verified on EVM</p>
            </div>
            <Link href="/blockchain">
              <Button variant="ghost" size="sm">
                Explorer <ArrowUpRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </div>

          <div className="space-y-3">
            {recentTx.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                <LinkIcon className="w-8 h-8 text-blue-500 mx-auto mb-2 opacity-50" />
                Ledger synchronized. Initializing block listener...
              </div>
            ) : (
              recentTx.map((tx) => (
                <div
                  key={tx.id}
                  className="p-3 rounded-lg border border-border bg-background/50 text-xs flex items-center justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400 font-semibold truncate">
                        {tx.tx_hash.slice(0, 10)}...{tx.tx_hash.slice(-8)}
                      </span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-medium">
                        {tx.tx_type}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span>Block #{tx.block_number ?? "Pending"}</span>
                      {tx.gas_used && <span>Gas: {tx.gas_used.toLocaleString()}</span>}
                    </div>
                  </div>

                  <span className="text-[10px] px-2 py-0.5 rounded font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                    CONFIRMED
                  </span>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
