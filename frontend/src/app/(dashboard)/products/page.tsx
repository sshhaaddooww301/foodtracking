"use client";
import React, { useEffect, useState } from "react";
import { Package, Plus, Search, ShieldCheck, ThermometerSnowflake, RefreshCw } from "lucide-react";
import { productsApi } from "@/services/api";
import { Product } from "@/types";
import { Button, Card, Input, Select } from "@/components/ui/primitives";

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    category: "PHARMACEUTICAL",
    dosage_form: "Tablet",
    strength: "500mg",
    requires_cold_chain: false,
    temp_min_celsius: 2.0,
    temp_max_celsius: 8.0,
    shelf_life_days: 730,
    fda_ndc_number: "",
    regulatory_approval_number: "",
  });

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await productsApi.list({ search, category: category || undefined });
      if (res.data?.items) setProducts(res.data.items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [category]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await productsApi.create(formData);
      setShowModal(false);
      fetchProducts();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to create product");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Package className="w-6 h-6 text-blue-600" />
            Product Catalog & Master Data
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Registered pharmaceutical formulations, food batches, and storage specifications
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          Register New SKU
        </Button>
      </div>

      {/* Filters Bar */}
      <Card className="p-4 flex flex-col sm:flex-row items-center gap-4">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
          <Input
            type="text"
            placeholder="Search by SKU, Product Name, or Regulatory ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchProducts()}
            className="pl-9 text-xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="text-xs w-48"
          >
            <option value="">All Categories</option>
            <option value="PHARMACEUTICAL">Pharmaceutical</option>
            <option value="FOOD_BEVERAGE">Food & Beverage</option>
            <option value="OTHER">Other Goods</option>
          </Select>

          <Button variant="outline" size="sm" onClick={fetchProducts}>
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </Card>

      {/* Products Table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Product Name & SKU</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Cold-Chain Specs</th>
                <th className="py-3 px-4">Shelf Life</th>
                <th className="py-3 px-4">Regulatory Approval</th>
                <th className="py-3 px-4 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    {loading ? "Loading product catalog..." : "No products found. Register one above!"}
                  </td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-foreground">{product.name}</div>
                      <div className="font-mono text-[11px] text-blue-600 dark:text-blue-400">
                        {product.sku}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {product.category}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      {product.requires_cold_chain ? (
                        <div className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium">
                          <ThermometerSnowflake className="w-3.5 h-3.5" />
                          <span>
                            {product.temp_min_celsius}°C to {product.temp_max_celsius}°C
                          </span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">Ambient storage</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {product.shelf_life_days} days
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-mono text-[11px] text-foreground">
                        {product.regulatory_approval_number || "DCGI-APP-APPROVED"}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        NDC: {product.fda_ndc_number || "N/A"}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                        ACTIVE
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Product Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl max-w-lg w-full p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-foreground mb-1">Register New SKU</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Enter product specifications to bind with cryptographic package identifiers.
            </p>

            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1 text-muted-foreground">Product Name</label>
                  <Input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Paracetamol 500mg"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1 text-muted-foreground">SKU Code</label>
                  <Input
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="e.g. MED-PARA-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1 text-muted-foreground">Category</label>
                  <Select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="PHARMACEUTICAL">Pharmaceutical</option>
                    <option value="FOOD_BEVERAGE">Food & Beverage</option>
                    <option value="OTHER">Other</option>
                  </Select>
                </div>
                <div>
                  <label className="block font-medium mb-1 text-muted-foreground">Shelf Life (Days)</label>
                  <Input
                    type="number"
                    value={formData.shelf_life_days}
                    onChange={(e) => setFormData({ ...formData, shelf_life_days: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-border">
                <label className="flex items-center gap-2 cursor-pointer font-medium mb-2">
                  <input
                    type="checkbox"
                    checked={formData.requires_cold_chain}
                    onChange={(e) => setFormData({ ...formData, requires_cold_chain: e.target.checked })}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  <span>Requires Strict Cold-Chain Monitoring (IoT Enforced)</span>
                </label>

                {formData.requires_cold_chain && (
                  <div className="grid grid-cols-2 gap-3 pl-6 mt-2">
                    <div>
                      <label className="block text-[11px] text-muted-foreground mb-1">Min Temp (°C)</label>
                      <Input
                        type="number"
                        step="0.5"
                        value={formData.temp_min_celsius}
                        onChange={(e) => setFormData({ ...formData, temp_min_celsius: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-muted-foreground mb-1">Max Temp (°C)</label>
                      <Input
                        type="number"
                        step="0.5"
                        value={formData.temp_max_celsius}
                        onChange={(e) => setFormData({ ...formData, temp_max_celsius: Number(e.target.value) })}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <Button variant="outline" type="button" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" isLoading={creating}>
                  Register SKU
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
