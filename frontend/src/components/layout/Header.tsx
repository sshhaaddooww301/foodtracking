"use client";
import React, { useEffect, useState } from "react";
import { Link as LinkIcon, ShieldCheck, Cpu, Search, Bell } from "lucide-react";
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
    <header className="h-16 border-b border-border bg-card/80 backdrop-blur sticky top-0 z-20 px-6 flex items-center justify-between">
      {/* Quick Search */}
      <div className="flex items-center gap-3 w-96">
        <div className="relative w-full">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search packages, batches, shipments, hashes..."
            className="w-full pl-9 pr-4 py-1.5 text-xs rounded-lg border border-border bg-background focus:outline-none focus:ring-1 focus:ring-primary text-foreground placeholder:text-muted-foreground"
          />
        </div>
      </div>

      {/* Network & Node Badges */}
      <div className="flex items-center gap-4">
        {/* Blockchain Status */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium border bg-background">
          <LinkIcon className="w-3.5 h-3.5 text-blue-500" />
          <span className="text-muted-foreground">Blockchain:</span>
          {blockchainOnline === null ? (
            <span className="text-slate-400">Connecting...</span>
          ) : blockchainOnline ? (
            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
              Synchronized
            </span>
          ) : (
            <span className="text-amber-600 dark:text-amber-400 font-medium">Degraded (Local)</span>
          )}
        </div>

        {/* IoT Live Stream */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium border bg-background">
          <Cpu className="w-3.5 h-3.5 text-indigo-500" />
          <span className="text-muted-foreground">IoT Telemetry:</span>
          <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 inline-block"></span>
            Streaming
          </span>
        </div>

        <button className="p-2 rounded-lg border border-border hover:bg-muted text-muted-foreground hover:text-foreground transition-colors relative">
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-background"></span>
        </button>
      </div>
    </header>
  );
}
