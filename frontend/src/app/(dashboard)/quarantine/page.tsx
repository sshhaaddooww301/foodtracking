"use client";
import React, { useEffect, useState } from "react";
import {
  Archive,
  Unlock,
  AlertTriangle,
  CheckCircle2,
  Search,
  RefreshCw,
  Link as LinkIcon,
} from "lucide-react";
import { quarantineApi } from "@/services/api";
import { QuarantineRecord } from "@/types";
import { Button, Card, Input } from "@/components/ui/primitives";

export default function QuarantinePage() {
  const [records, setRecords] = useState<QuarantineRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<QuarantineRecord | null>(null);
  const [releaseReason, setReleaseReason] = useState("");
  const [releasing, setReleasing] = useState(false);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const res = await quarantineApi.list();
      if (res.data?.items) setRecords(res.data.items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecords();
  }, []);

  const handleRelease = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRecord) return;
    setReleasing(true);
    try {
      await quarantineApi.release(selectedRecord.package_id, releaseReason);
      setSelectedRecord(null);
      setReleaseReason("");
      fetchRecords();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to release package from quarantine");
    } finally {
      setReleasing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Archive className="w-6 h-6 text-orange-600" />
            Quarantine & Containment Vault
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Isolated pharmaceutical and food items locked from transit due to cold-chain breaches or clone flags
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={fetchRecords}>
          <RefreshCw className="w-3.5 h-3.5 mr-1" />
          Refresh
        </Button>
      </div>

      {/* Quarantine Table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Package ID</th>
                <th className="py-3 px-4">Quarantine Rationale</th>
                <th className="py-3 px-4">Lock Date</th>
                <th className="py-3 px-4">Containment Status</th>
                <th className="py-3 px-4 text-right">Auditor Release</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {records.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground">
                    {loading ? "Checking containment vault..." : "No items currently quarantined. All safe!"}
                  </td>
                </tr>
              ) : (
                records.map((rec) => (
                  <tr key={rec.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-foreground">
                      {rec.package_id}
                    </td>
                    <td className="py-3.5 px-4 text-foreground">
                      {rec.reason}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {new Date(rec.created_at).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4">
                      {rec.is_active ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-500">
                          LOCKED IN QUARANTINE
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/20 text-emerald-500">
                          RELEASED
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {rec.is_active ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-[11px] text-orange-600 gap-1"
                          onClick={() => setSelectedRecord(rec)}
                        >
                          <Unlock className="w-3.5 h-3.5" />
                          Release
                        </Button>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">
                          Cleared ({rec.release_reason?.slice(0, 20)}...)
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Release Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-base font-bold text-foreground mb-1">Release Package from Quarantine</h2>
            <p className="text-xs text-muted-foreground mb-4 font-mono">
              Target ID: {selectedRecord.package_id}
            </p>

            <form onSubmit={handleRelease} className="space-y-4 text-xs">
              <div>
                <label className="block font-medium mb-1 text-muted-foreground">
                  Auditor Justification (Min 10 characters)
                </label>
                <textarea
                  required
                  value={releaseReason}
                  onChange={(e) => setReleaseReason(e.target.value)}
                  placeholder="e.g. Lab chemical re-test confirmed active ingredient integrity within specs."
                  className="w-full h-24 p-3 rounded-md border border-input bg-background text-foreground text-xs focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <Button variant="outline" type="button" onClick={() => setSelectedRecord(null)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" isLoading={releasing}>
                  Authorize Release
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
