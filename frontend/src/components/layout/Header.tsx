"use client";
import React, { useEffect, useState } from "react";
import { Link as LinkIcon, Cpu, Search, Bell, ShieldCheck } from "lucide-react";
import { blockchainApi } from "@/services/api";

export function Header() {
  const [blockchainOnline, setBlockchainOnline] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;
    const checkBlockchain = async () => {
      try {
        const res = await blockchainApi.getHealth();
        if (mounted) setBlockchainOnline(res.data?.connected ?? true);
      } catch {
        if (mounted) setBlockchainOnline(false);
      }
    };
    checkBlockchain();
    const interval = setInterval(checkBlockchain, 30000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="h-14 border-b border-border bg-card sticky top-0 z-20 px-6 flex items-center justify-between">
      {/* Enterprise Global Search */}
      <div className="flex items-center gap-3 w-96">
        <div className="relative w-full">
          <Search className="w-3.5 h-3.5 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search batches, package serials, shipments, hashes..."
            className="w-full pl-9 pr-14 py-1.5 text-xs rounded-md border border-border bg-background focus:outline-none focus:ring-1 focus:ring-[#0A192F] text-foreground placeholder:text-muted-foreground"
          />
          <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border">
            ⌘K
          </kbd>
        </div>
      </div>

      {/* Network & Infrastructure Telemetry */}
      <div className="flex items-center gap-3">
        {/* Blockchain Status Chip */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-md text-xs border border-border bg-background">
          <LinkIcon className="w-3.5 h-3.5 text-[#0A192F] dark:text-blue-400" />
          <span className="text-muted-foreground text-[11px]">Consensus:</span>
          {blockchainOnline === null ? (
            <span className="text-muted-foreground text-[11px]">Connecting...</span>
          ) : blockchainOnline ? (
            <span className="text-emerald-700 dark:text-emerald-400 font-medium text-[11px] flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 inline-block"></span>
              Synchronized
            </span>
          ) : (
            <span className="text-amber-700 dark:text-amber-400 font-medium text-[11px] flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-600 inline-block"></span>
              Degraded
            </span>
          )}
        </div>

        {/* IoT Telemetry Chip */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-md text-xs border border-border bg-background">
          <Cpu className="w-3.5 h-3.5 text-slate-700 dark:text-slate-300" />
          <span className="text-muted-foreground text-[11px]">IoT Telemetry:</span>
          <span className="text-emerald-700 dark:text-emerald-400 font-medium text-[11px] flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 inline-block"></span>
            Active
          </span>
        </div>

        {/* Alerts / Notification Button */}
        <button
          className="p-1.5 rounded-md border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors relative"
          title="System Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1 right-1 h-1.5 w-1.5 rounded-full bg-rose-600"></span>
        </button>
      </div>
    </header>
  );
}
