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
    <aside className="w-64 bg-[#0B1528] border-r border-[#1B2A4A] flex flex-col h-screen fixed left-0 top-0 text-slate-300 z-30 select-none">
      {/* Enterprise Brand Header */}
      <div className="px-5 py-4 border-b border-[#1B2A4A] flex items-center justify-between bg-[#081020]">
        <Link href="/admin" className="flex items-center gap-3">
          <div className="w-8 h-8 rounded bg-[#132A4A] border border-[#233D66] flex items-center justify-center text-white">
            <ShieldCheck className="w-4 h-4 text-blue-300" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white tracking-tight leading-none">
              TrustChain
            </h1>
            <p className="text-[10px] font-semibold tracking-wider text-slate-400 mt-0.5">
              Enterprise Supply Integrity
            </p>
          </div>
        </Link>
        <div className="flex items-center gap-1.5" title="Network Synchronized">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
        </div>
      </div>

      {/* Navigation Items */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-4 space-y-0.5 scrollbar-thin">
        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-2">
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
                "flex items-center gap-2.5 px-3 py-2 rounded text-xs font-medium transition-colors",
                isActive
                  ? "bg-[#142642] text-white font-semibold border-l-2 border-blue-400 pl-2.5"
                  : "text-slate-300 hover:text-white hover:bg-[#101E38]"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 shrink-0",
                  isActive ? "text-blue-300" : "text-slate-400"
                )}
              />
              <span className="truncate">{item.name}</span>
            </Link>
          );
        })}

        <div className="pt-3 mt-3 border-t border-[#1B2A4A]">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 mb-1.5">
            Verification
          </div>
          <Link
            href="/verify"
            target="_blank"
            className="flex items-center gap-2.5 px-3 py-2 rounded text-xs font-medium text-slate-300 hover:text-white hover:bg-[#101E38] transition-colors"
          >
            <Radio className="w-4 h-4 text-slate-400" />
            <span>Public Product Passport</span>
          </Link>
        </div>
      </nav>

      {/* Enterprise User Profile Footer */}
      <div className="p-3.5 border-t border-[#1B2A4A] bg-[#081020]">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded bg-[#132A4A] border border-[#233D66] flex items-center justify-center text-[10px] font-bold text-white uppercase shrink-0">
              {user?.full_name?.slice(0, 2) || "TC"}
            </div>
            <div className="truncate text-left">
              <p className="text-xs font-semibold text-white truncate">
                {user?.full_name || "Enterprise Officer"}
              </p>
              <p className="text-[10px] text-slate-400 truncate">
                {user?.role ? ROLE_LABELS[user.role] || user.role : "Auditor"}
              </p>
            </div>
          </div>
          <button
            onClick={logout}
            title="Sign Out"
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-[#132A4A] transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
        {user?.organization && (
          <div className="px-2 py-1 bg-[#101E38] rounded border border-[#1B2A4A] text-[10px] text-slate-300 truncate flex items-center gap-1.5">
            <span className="text-slate-400">Org:</span>
            <span className="font-medium text-white truncate">{user.organization.name}</span>
          </div>
        )}
      </div>
    </aside>
  );
}
