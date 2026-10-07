"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Boxes,
  Plus,
  QrCode,
  Link as LinkIcon,
  FileCheck,
  Search,
  CheckCircle,
  RefreshCw,
  Sparkles,
} from "lucide-react";
import { batchesApi, productsApi } from "@/services/api";
import { Batch, Product } from "@/types";
import { Button, Card, Input, Select } from "@/components/ui/primitives";

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [generatingFor, setGeneratingFor] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    batch_number: `BATCH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    product_id: "",
    quantity_manufactured: 500,
    manufacturing_date: new Date().toISOString().split("T")[0],
    expiry_date: new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().split("T")[0],
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [bRes, pRes] = await Promise.all([
        batchesApi.list({ search }),
        productsApi.list(),
      ]);
      if (bRes.data?.items) setBatches(bRes.data.items);
      if (pRes.data?.items) {
        setProducts(pRes.data.items);
        if (pRes.data.items.length > 0 && !formData.product_id) {
          setFormData((prev) => ({ ...prev, product_id: pRes.data.items[0].id }));
        }
      }
    } catch (err) {
      console.error(err);
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
      const payload = {
        ...formData,
        quantity: formData.quantity_manufactured,
      };
      await batchesApi.create(payload);
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to register batch");
    } finally {
      setCreating(false);
    }
  };

  const handleGeneratePackages = async (batchId: string) => {
    setGeneratingFor(batchId);
    try {
      const res = await batchesApi.generatePackages(batchId);
      const count = res.data?.packages_generated ?? res.data?.created_count ?? 10;
      if (res.data?.already_serialized) {
        alert(res.data.message || `Notice: Batch already has ${count} serialized packages.`);
      } else {
        alert(res.data?.message || `Successfully serialized ${count} unit packages with QR identities!`);
      }
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || err.response?.data?.message || "Failed to serialize packages");
    } finally {
      setGeneratingFor(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Boxes className="w-6 h-6 text-navy-900" />
            Batch Management & Serialization
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Production batches anchored to EVM blockchain and linked to IPFS Certificates of Analysis (COA)
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          Create Production Batch
        </Button>
      </div>

      {/* Batches Table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Batch Number</th>
                <th className="py-3 px-4">Product / SKU</th>
                <th className="py-3 px-4">Units (Mfg / Left)</th>
                <th className="py-3 px-4">Dates (Mfg → Exp)</th>
                <th className="py-3 px-4">Blockchain Anchor</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {batches.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-muted-foreground">
                    {loading ? "Loading batches..." : "No batches recorded yet. Create one above!"}
                  </td>
                </tr>
              ) : (
                batches.map((batch) => (
                  <tr key={batch.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-semibold text-foreground">
                        {batch.batch_number}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-medium text-foreground">
                        {batch.product?.name || "Product Formulation"}
                      </div>
                      <div className="font-mono text-[10px] text-muted-foreground">
                        {batch.product?.sku}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-mono">
                      {(batch.quantity_manufactured ?? (batch as any).quantity ?? 0).toLocaleString()} units
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      <div>Mfg: {batch.manufacturing_date?.slice(0, 10)}</div>
                      <div>Exp: {batch.expiry_date?.slice(0, 10)}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      {batch.blockchain_tx_hash ? (
                        <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-mono text-[11px]">
                          <LinkIcon className="w-3.5 h-3.5" />
                          <span>{batch.blockchain_tx_hash.slice(0, 10)}...</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-[10px]">Anchoring...</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        {batch.status || "RELEASED"}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-[11px] h-7 gap-1"
                        isLoading={generatingFor === batch.id}
                        onClick={() => handleGeneratePackages(batch.id)}
                      >
                        <QrCode className="w-3.5 h-3.5" />
                        Serialize Units
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Batch Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-foreground mb-1">Create Production Batch</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Enter batch details. A blockchain transaction will record this batch upon creation.
            </p>

            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium mb-1 text-muted-foreground">Batch Number</label>
                <Input
                  required
                  value={formData.batch_number}
                  onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
                />
              </div>

              <div>
                <label className="block font-medium mb-1 text-muted-foreground">Product Formulation</label>
                <Select
                  required
                  value={formData.product_id}
                  onChange={(e) => setFormData({ ...formData, product_id: e.target.value })}
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sku})
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block font-medium mb-1 text-muted-foreground">Quantity (Units)</label>
                <Input
                  type="number"
                  required
                  value={formData.quantity_manufactured}
                  onChange={(e) => setFormData({ ...formData, quantity_manufactured: Number(e.target.value) })}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1 text-muted-foreground">Mfg Date</label>
                  <Input
                    type="date"
                    required
                    value={formData.manufacturing_date}
                    onChange={(e) => setFormData({ ...formData, manufacturing_date: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1 text-muted-foreground">Expiry Date</label>
                  <Input
                    type="date"
                    required
                    value={formData.expiry_date}
                    onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <Button variant="outline" type="button" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" isLoading={creating}>
                  Mint Batch On-Chain
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
