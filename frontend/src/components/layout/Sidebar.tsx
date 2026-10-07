"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Boxes,
  Truck,
  Cpu,
  ShieldAlert,
  Archive,
  AlertTriangle,
  FileText,
  Link as LinkIcon,
  Building2,
  ScrollText,
  QrCode,
  LogOut,
  ShieldCheck,
  Radio,
} from "lucide-react";
import { useAuthStore, ROLE_LABELS } from "@/lib/auth-store";
import { cn } from "@/components/ui/primitives";

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
  roles?: string[];
}

const NAV_ITEMS: NavItem[] = [
  { name: "Overview", href: "/admin", icon: LayoutDashboard },
  { name: "Products", href: "/products", icon: Package },
  { name: "Batches", href: "/batches", icon: Boxes },
  { name: "Packages & QR", href: "/packages", icon: QrCode },
  { name: "Shipments & Transit", href: "/shipments", icon: Truck },
  { name: "IoT Telemetry", href: "/iot", icon: Cpu },
  { name: "Fraud & Anomalies", href: "/fraud", icon: ShieldAlert },
  { name: "Quarantine", href: "/quarantine", icon: Archive },
  { name: "Recalls", href: "/recalls", icon: AlertTriangle },
  { name: "Documents (IPFS)", href: "/documents", icon: FileText },
  { name: "Blockchain Ledger", href: "/blockchain", icon: LinkIcon },
  { name: "Organizations", href: "/organizations", icon: Building2 },
  { name: "Audit Trail", href: "/audit", icon: ScrollText },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuthStore();

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-screen fixed left-0 top-0 text-slate-300 z-30">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800 flex items-center justify-between">
        <Link href="/admin" className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight leading-tight">
              TrustChain
            </h1>
            <p className="text-[10px] uppercase font-semibold tracking-wider text-blue-400">
              Supply Integrity
            </p>
          </div>
        </Link>
        <span className="flex h-2 w-2 relative">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 px-3 mb-2">
          Operations
        </div>
        {NAV_ITEMS.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all group",
                isActive
                  ? "bg-blue-600/15 text-blue-400 font-semibold"
                  : "text-slate-400 hover:text-slate-100 hover:bg-slate-800/60"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 transition-transform group-hover:scale-110",
                  isActive ? "text-blue-400" : "text-slate-400 group-hover:text-slate-200"
                )}
              />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}

        <div className="pt-4 mt-4 border-t border-slate-800">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 px-3 mb-2">
            Public Gateway
          </div>
          <Link
            href="/verify"
            target="_blank"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-emerald-400 hover:bg-emerald-950/30 transition-all"
          >
            <Radio className="w-4 h-4 text-emerald-400" />
            <span>Consumer Portal</span>
          </Link>
        </div>
      </nav>

      {/* User Footer */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-semibold text-slate-200 uppercase">
              {user?.full_name?.slice(0, 2) || "TC"}
            </div>
            <div className="truncate text-left">
              <p className="text-xs font-semibold text-white truncate">
                {user?.full_name || "Guest Officer"}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {user?.role ? ROLE_LABELS[user.role] || user.role : "Viewer"}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Log out"
            className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
        {user?.organization && (
          <div className="px-2 py-1 bg-slate-800/80 rounded border border-slate-700/60 text-[10px] text-slate-300 truncate">
            🏢 {user.organization.name}
          </div>
        )}
      </div>
    </aside>
  );
}
