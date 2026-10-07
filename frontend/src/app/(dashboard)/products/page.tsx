"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Package,
  Plus,
  Search,
  ShieldCheck,
  ThermometerSnowflake,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  QrCode,
  ExternalLink,
  Download,
  X,
} from "lucide-react";
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
  const [modalError, setModalError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [selectedQrProduct, setSelectedQrProduct] = useState<Product | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    category: "PHARMACEUTICAL",
    description: "",
    composition: "",
    image_url: "",
    regulatory_license: "",
    shelf_life_days: 730,
    requires_cold_chain: false,
    temp_min_celsius: 2.0,
    temp_max_celsius: 8.0,
  });

  const parseErrorMessage = (err: any): string => {
    const detail = err.response?.data?.detail;
    if (!detail) return err.message || "Failed to register SKU";
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail
        .map((d: any) => {
          const field = Array.isArray(d.loc) ? d.loc.slice(-1)[0] : "Field";
          return `${field}: ${d.msg}`;
        })
        .join(". ");
    }
    if (typeof detail === "object") {
      return Object.entries(detail)
        .map(([k, v]) => `${k}: ${v}`)
        .join(". ");
    }
    return "Failed to register product SKU";
  };

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
    setModalError(null);
    try {
      const payload: any = {
        name: formData.name.trim(),
        sku: formData.sku.trim().toUpperCase(),
        category: formData.category,
        description: formData.description.trim() || undefined,
        composition: formData.composition.trim() || undefined,
        image_url: formData.image_url.trim() || undefined,
        regulatory_license: formData.regulatory_license.trim() || undefined,
        expiry_period_days: Number(formData.shelf_life_days) || 730,
        min_temperature: formData.requires_cold_chain ? Number(formData.temp_min_celsius) : undefined,
        max_temperature: formData.requires_cold_chain ? Number(formData.temp_max_celsius) : undefined,
      };

      await productsApi.create(payload);
      setShowModal(false);
      setSuccessMsg(`Successfully registered ${payload.name} (${payload.sku})!`);
      setTimeout(() => setSuccessMsg(null), 4000);
      setFormData({
        name: "",
        sku: "",
        category: "PHARMACEUTICAL",
        description: "",
        composition: "",
        image_url: "",
        regulatory_license: "",
        shelf_life_days: 730,
        requires_cold_chain: false,
        temp_min_celsius: 2.0,
        temp_max_celsius: 8.0,
      });
      fetchProducts();
    } catch (err: any) {
      const msg = parseErrorMessage(err);
      setModalError(msg);
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
            <option value="FOOD">Food & Groceries</option>
            <option value="BEVERAGE">Beverages & Drinks</option>
            <option value="SUPPLEMENT">Health Supplements</option>
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
                <th className="py-3 px-4 text-right">Digital Passport QR</th>
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
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden shrink-0">
                          {product.image_url ? (
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-slate-400">
                              {product.category === "FOOD" ? "🌾" : product.category === "BEVERAGE" ? "☕" : "💊"}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="font-semibold text-foreground line-clamp-1">{product.name}</div>
                          <div className="font-mono text-[10px] text-blue-500 font-bold">
                            {product.sku}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          product.category === "FOOD"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400"
                            : product.category === "BEVERAGE"
                            ? "bg-amber-50 text-amber-800 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-400"
                            : product.category === "SUPPLEMENT"
                            ? "bg-slate-100 text-slate-700 border border-slate-300 dark:bg-slate-800 dark:text-slate-300"
                            : "bg-slate-100 text-navy-900 border border-slate-200"
                        }`}
                      >
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
                      <div className="flex items-center justify-end gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                          ACTIVE
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-[11px] h-7 gap-1 border-blue-500/30 text-blue-500 dark:text-blue-400 hover:bg-blue-500/10"
                          onClick={() => setSelectedQrProduct(product)}
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          View QR
                        </Button>
                      </div>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4 my-8">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div>
                <h2 className="text-lg font-bold text-foreground">Register New SKU</h2>
                <p className="text-xs text-muted-foreground">
                  Define master product specifications, active formulation, and cryptographic tracking parameters.
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => { setShowModal(false); setModalError(null); }}>
                ✕
              </Button>
            </div>

            {modalError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <div className="space-y-0.5">
                  <p className="font-semibold">Unable to register product:</p>
                  <p className="text-slate-300 leading-relaxed whitespace-pre-line">{modalError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1 text-muted-foreground">Product Name *</label>
                  <Input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Royal Basmati Rice 5kg"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1 text-muted-foreground">SKU Code (Unique ID) *</label>
                  <Input
                    required
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="e.g. RICE-BASM-5KG"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1 text-muted-foreground">Category *</label>
                  <Select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  >
                    <option value="PHARMACEUTICAL">Pharmaceutical Medicine</option>
                    <option value="FOOD">Food & Groceries</option>
                    <option value="BEVERAGE">Beverages & Drinks</option>
                    <option value="SUPPLEMENT">Dietary Supplement</option>
                    <option value="MEDICAL_DEVICE">Medical Device</option>
                  </Select>
                </div>
                <div>
                  <label className="block font-medium mb-1 text-muted-foreground">Shelf Life (Days) *</label>
                  <Input
                    type="number"
                    min="1"
                    required
                    value={formData.shelf_life_days}
                    onChange={(e) => setFormData({ ...formData, shelf_life_days: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1 text-muted-foreground">Active Formula / Composition</label>
                <Input
                  value={formData.composition}
                  onChange={(e) => setFormData({ ...formData, composition: e.target.value })}
                  placeholder="e.g. 100% Traditional Himalayan Long-Grain Rice, Moisture < 12.5%"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1 text-muted-foreground">Regulatory License / FDA / FSSAI</label>
                  <Input
                    value={formData.regulatory_license}
                    onChange={(e) => setFormData({ ...formData, regulatory_license: e.target.value })}
                    placeholder="e.g. FSSAI-10022011000412"
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1 text-muted-foreground">Image URL (Optional)</label>
                  <Input
                    value={formData.image_url}
                    onChange={(e) => setFormData({ ...formData, image_url: e.target.value })}
                    placeholder="https://images.unsplash.com/... (auto-assigned if blank)"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1 text-muted-foreground">Description & Specification</label>
                <Input
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Certified origin product tracked through verified immutable supply chain."
                />
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
                <Button variant="outline" type="button" onClick={() => { setShowModal(false); setModalError(null); }}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" isLoading={creating} className="bg-blue-600 hover:bg-blue-500">
                  Register SKU
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Product QR Code Modal */}
      {selectedQrProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 text-center shadow-2xl space-y-4 relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setSelectedQrProduct(null)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Product Preview Header */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-950 border border-slate-800 text-left">
              {selectedQrProduct.image_url && (
                <img
                  src={selectedQrProduct.image_url}
                  alt={selectedQrProduct.name}
                  className="w-12 h-12 rounded-lg object-cover border border-slate-700 shrink-0"
                />
              )}
              <div>
                <h3 className="text-xs font-bold text-white line-clamp-1">{selectedQrProduct.name}</h3>
                <p className="text-[10px] font-mono font-bold text-blue-400">SKU: {selectedQrProduct.sku}</p>
                <p className="text-[10px] text-slate-400">{selectedQrProduct.category}</p>
              </div>
            </div>

            {/* Crisp QR Code Display */}
            <div className="p-4 bg-white rounded-2xl inline-block border border-slate-200 shadow-xl">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
                  `${typeof window !== "undefined" ? window.location.origin : ""}/verify?code=${selectedQrProduct.sku}`
                )}`}
                alt="Product SKU QR"
                className="w-44 h-44 mx-auto"
              />
            </div>

            <p className="text-[11px] text-slate-400">
              Scan to verify product origin, formulation specs, and authenticity certificate.
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col gap-2 pt-1">
              <a
                href={`/verify?code=${selectedQrProduct.sku}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full"
              >
                <Button variant="primary" size="sm" className="w-full gap-1.5 text-xs bg-blue-600 hover:bg-blue-500">
                  <ExternalLink className="w-3.5 h-3.5" />
                  Test Live Scan / Verify
                </Button>
              </a>

              <div className="flex gap-2">
                <a
                  href={`https://api.qrserver.com/v1/create-qr-code/?size=500x500&data=${encodeURIComponent(
                    `${typeof window !== "undefined" ? window.location.origin : ""}/verify?code=${selectedQrProduct.sku}`
                  )}`}
                  download={`${selectedQrProduct.sku}-QR.png`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1"
                >
                  <Button variant="outline" size="sm" className="w-full text-xs gap-1 border-slate-700 text-slate-200">
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    Download PNG
                  </Button>
                </a>

                <Link href={`/packages?search=${selectedQrProduct.sku}`} className="flex-1">
                  <Button variant="outline" size="sm" className="w-full text-xs gap-1 border-slate-700 text-slate-200">
                    <Package className="w-3.5 h-3.5 text-amber-400" />
                    Unit Packages
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
