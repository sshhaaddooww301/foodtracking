"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Package as PackageIcon,
  QrCode,
  Search,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Archive,
  RefreshCw,
  MapPin,
  CheckCircle,
} from "lucide-react";
import { packagesApi } from "@/services/api";
import { Package } from "@/types";
import { Button, Card, Input, Select } from "@/components/ui/primitives";

export default function PackagesPage() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [selectedPkg, setSelectedPkg] = useState<Package | null>(null);

  const fetchPackages = async () => {
    setLoading(true);
    try {
      const res = await packagesApi.list({ search, status: status || undefined });
      if (res.data?.items) setPackages(res.data.items);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, [status]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <QrCode className="w-6 h-6 text-blue-600" />
            Serialized Unit Packages & Digital IDs
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Individual medicine strips, bottles, and food containers with unique cryptographic identities
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={fetchPackages}>
          <RefreshCw className="w-3.5 h-3.5 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Search by Package Code (e.g. PKG-IN-2026-0001)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchPackages()}
            className="pl-9 text-xs"
          />
        </div>

        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="text-xs w-48"
        >
          <option value="">All Statuses</option>
          <option value="REGISTERED">Registered</option>
          <option value="IN_TRANSIT">In Transit</option>
          <option value="DELIVERED">Delivered</option>
          <option value="QUARANTINED">Quarantined</option>
          <option value="RECALLED">Recalled</option>
        </Select>
      </Card>

      {/* Packages Table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Medicine / Product</th>
                <th className="py-3 px-4">Package Code (Digital ID)</th>
                <th className="py-3 px-4">Batch Number</th>
                <th className="py-3 px-4">Current Location</th>
                <th className="py-3 px-4">Blockchain Hash</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Verification QR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {packages.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    {loading ? "Loading packages..." : "No serialized packages found."}
                  </td>
                </tr>
              ) : (
                packages.map((pkg) => (
                  <tr key={pkg.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 overflow-hidden shrink-0">
                          {pkg.batch?.product?.image_url ? (
                            <img
                              src={pkg.batch.product.image_url}
                              alt={pkg.batch.product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-400 font-bold">
                              Rx
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground line-clamp-1">
                            {pkg.batch?.product?.name || "Pharmaceutical Item"}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {pkg.batch?.product?.sku || "SKU-REG"}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-semibold text-blue-600 dark:text-blue-400">
                        {pkg.package_code}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-muted-foreground">
                      {pkg.batch?.batch_number || "BATCH-2026-001"}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {pkg.current_location_lat && pkg.current_location_lng ? (
                        <div className="flex items-center gap-1 font-mono text-[11px]">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {pkg.current_location_lat.toFixed(4)}, {pkg.current_location_lng.toFixed(4)}
                          </span>
                        </div>
                      ) : (
                        <span>Warehouse Storage</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-muted-foreground">
                      {pkg.blockchain_tx_hash ? `${pkg.blockchain_tx_hash.slice(0, 10)}...` : "Anchored"}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          pkg.status === "QUARANTINED"
                            ? "bg-red-500/20 text-red-500"
                            : pkg.status === "RECALLED"
                            ? "bg-amber-500/20 text-amber-500"
                            : pkg.status === "DELIVERED" || pkg.status === "RETAIL"
                            ? "bg-emerald-500/20 text-emerald-500"
                            : "bg-blue-500/20 text-blue-500"
                        }`}
                      >
                        {pkg.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[11px] h-7 gap-1"
                        onClick={() => setSelectedPkg(pkg)}
                      >
                        <QrCode className="w-3.5 h-3.5 text-blue-400" />
                        View QR
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* QR Code Modal */}
      {selectedPkg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl space-y-4">
            {/* Product Header */}
            {selectedPkg.batch?.product && (
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-muted/40 border border-border text-left">
                {selectedPkg.batch.product.image_url && (
                  <img
                    src={selectedPkg.batch.product.image_url}
                    alt={selectedPkg.batch.product.name}
                    className="w-12 h-12 rounded-lg object-cover border border-border shrink-0"
                  />
                )}
                <div>
                  <h3 className="text-xs font-bold text-foreground line-clamp-1">
                    {selectedPkg.batch.product.name}
                  </h3>
                  <p className="text-[10px] text-muted-foreground font-mono">
                    Batch: {selectedPkg.batch?.batch_number}
                  </p>
                  <p className="text-[10px] font-mono text-blue-500 font-bold">
                    {selectedPkg.package_code}
                  </p>
                </div>
              </div>
            )}

            <div className="p-4 bg-white rounded-2xl inline-block border border-slate-200 shadow-lg">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(
                  `${typeof window !== "undefined" ? window.location.origin : ""}/verify?code=${selectedPkg.package_code}`
                )}`}
                alt="Product QR Code"
                className="w-44 h-44 mx-auto"
              />
            </div>

            <p className="text-[11px] text-muted-foreground">
              Scan with mobile camera or click below to simulate instant consumer verification
            </p>

            <div className="flex items-center justify-center gap-2 pt-1">
              <Link href={`/verify?code=${selectedPkg.package_code}`} target="_blank">
                <Button variant="primary" size="sm" className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-500">
                  <ExternalLink className="w-3.5 h-3.5" />
                  Verify This Product
                </Button>
              </Link>
              <Button variant="outline" size="sm" onClick={() => setSelectedPkg(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
