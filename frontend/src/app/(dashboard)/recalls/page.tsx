"use client";
import React, { useEffect, useState } from "react";
import {
  AlertTriangle,
  Plus,
  Search,
  RefreshCw,
  ShieldAlert,
  Link as LinkIcon,
} from "lucide-react";
import { recallsApi, batchesApi } from "@/services/api";
import { RecallRecord, Batch } from "@/types";
import { Button, Card, Input, Select } from "@/components/ui/primitives";

export default function RecallsPage() {
  const [recalls, setRecalls] = useState<RecallRecord[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);

  const [formData, setFormData] = useState({
    batch_id: "",
    reason: "Chemical assay impurity detected exceeding pharmacopeia limits.",
    description: "Urgent Class-1 recall across all retail pharmacies and hospital distributors.",
    severity: "CRITICAL",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [rRes, bRes] = await Promise.all([
        recallsApi.list().catch(() => null),
        batchesApi.list().catch(() => null),
      ]);
      if (rRes?.data?.items) setRecalls(rRes.data.items);
      if (bRes?.data?.items) {
        setBatches(bRes.data.items);
        if (bRes.data.items.length > 0 && !formData.batch_id) {
          setFormData((prev) => ({ ...prev, batch_id: bRes.data.items[0].id }));
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await recallsApi.create(formData);
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to initiate recall");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-red-600" />
            Batch Recalls & Safety Advisories
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Emergency recall execution with instant on-chain flagging and public verification blacklisting
          </p>
        </div>

        <Button variant="danger" size="sm" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          Initiate Batch Recall
        </Button>
      </div>

      {/* Recalls Table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Recall #</th>
                <th className="py-3 px-4">Batch Number</th>
                <th className="py-3 px-4">Severity</th>
                <th className="py-3 px-4">Recall Reason & Scope</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Blockchain Tx</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {recalls.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    {loading ? "Checking regulatory recall records..." : "No active recalls issued."}
                  </td>
                </tr>
              ) : (
                recalls.map((rec) => (
                  <tr key={rec.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-semibold text-red-600 dark:text-red-400">
                      {rec.recall_number}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-foreground">
                      {rec.batch?.batch_number || "BATCH-2026-X"}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/20 text-red-500">
                        {rec.severity}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground max-w-sm">
                      <p className="font-medium text-foreground">{rec.reason}</p>
                      <p className="text-[11px] truncate">{rec.description}</p>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-500/20 text-amber-500">
                        {rec.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-[11px] text-blue-600 dark:text-blue-400">
                      {rec.blockchain_tx_hash ? `${rec.blockchain_tx_hash.slice(0, 10)}...` : "Anchored"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Recall Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-red-600 mb-1 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              Issue Emergency Product Recall
            </h2>
            <p className="text-xs text-muted-foreground mb-4">
              This will lock the entire batch across all pharmacies, flag smart contracts, and warn consumers.
            </p>

            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium mb-1 text-muted-foreground">Select Batch</label>
                <Select
                  value={formData.batch_id}
                  onChange={(e) => setFormData({ ...formData, batch_id: e.target.value })}
                >
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.batch_number} ({b.product?.name || "Product"})
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block font-medium mb-1 text-muted-foreground">Recall Severity</label>
                <Select
                  value={formData.severity}
                  onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                >
                  <option value="CRITICAL">Class I — Critical (Life Threatening)</option>
                  <option value="HIGH">Class II — High (Adverse Health Risk)</option>
                  <option value="MEDIUM">Class III — Medium (Labeling / Packaging Defect)</option>
                </Select>
              </div>

              <div>
                <label className="block font-medium mb-1 text-muted-foreground">Clinical Reason</label>
                <Input
                  required
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                />
              </div>

              <div>
                <label className="block font-medium mb-1 text-muted-foreground">Public Action Notice</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full h-20 p-2.5 rounded-md border border-input bg-background text-foreground text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button variant="outline" type="button" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button variant="danger" type="submit" isLoading={creating}>
                  Execute Recall
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
