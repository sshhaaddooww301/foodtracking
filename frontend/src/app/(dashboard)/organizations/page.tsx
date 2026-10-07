"use client";
import React, { useEffect, useState } from "react";
import {
  Building2,
  Plus,
  ShieldCheck,
  Search,
  RefreshCw,
  MapPin,
  Mail,
  CheckCircle2,
} from "lucide-react";
import { organizationsApi } from "@/services/api";
import { Organization } from "@/types";
import { Button, Card, Input, Select } from "@/components/ui/primitives";

export default function OrganizationsPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    org_type: "MANUFACTURER",
    registration_number: `REG-${Math.floor(100000 + Math.random() * 900000)}`,
    license_number: `LIC-FDA-${Math.floor(1000 + Math.random() * 9000)}`,
    contact_email: "",
    city: "Mumbai",
    country: "India",
  });

  const fetchOrgs = async () => {
    setLoading(true);
    try {
      const res = await organizationsApi.list({ search });
      if (res.data?.items) setOrganizations(res.data.items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrgs();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    try {
      await organizationsApi.create(formData);
      setShowModal(false);
      fetchOrgs();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to register organization");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Building2 className="w-6 h-6 text-navy-900" />
            Supply Chain Network & Verified Stakeholders
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Licensed pharmaceutical manufacturers, 3PL distributors, accredited warehouses, and clinical pharmacies
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          Onboard Stakeholder
        </Button>
      </div>

      {/* Organizations Table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Organization Name</th>
                <th className="py-3 px-4">Role / Classification</th>
                <th className="py-3 px-4">License & Reg #</th>
                <th className="py-3 px-4">Location</th>
                <th className="py-3 px-4">EVM Wallet Address</th>
                <th className="py-3 px-4 text-right">KYC Status</th>
              </tr>
            </thead>
            <tbody className="divide-y border-border">
              {organizations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    {loading ? "Loading stakeholders..." : "No organizations found."}
                  </td>
                </tr>
              ) : (
                organizations.map((org) => (
                  <tr key={org.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-foreground">
                      {org.name}
                      <div className="text-[10px] text-muted-foreground font-normal">
                        {org.contact_email}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {org.org_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-muted-foreground">
                      <div>{org.license_number}</div>
                      <div className="text-[10px]">{org.registration_number}</div>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {org.city || "Mumbai"}, {org.country || "India"}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-navy-900 dark:text-slate-200">
                      {org.wallet_address ? `${org.wallet_address.slice(0, 8)}...` : "0x71C...aB9F"}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 dark:text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        VERIFIED
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Onboard Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-foreground mb-1">Onboard Supply Chain Entity</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Register a licensed entity onto the TrustChain network.
            </p>

            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium mb-1 text-muted-foreground">Company Name</label>
                <Input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g. Cipla Pharma Ltd."
                />
              </div>

              <div>
                <label className="block font-medium mb-1 text-muted-foreground">Classification</label>
                <Select
                  value={formData.org_type}
                  onChange={(e) => setFormData({ ...formData, org_type: e.target.value })}
                >
                  <option value="MANUFACTURER">Manufacturer</option>
                  <option value="DISTRIBUTOR">Distributor / Wholesaler</option>
                  <option value="WAREHOUSE">Cold-Chain Warehouse</option>
                  <option value="LOGISTICS">Logistics Carrier</option>
                  <option value="RETAILER">Pharmacy / Hospital</option>
                  <option value="AUDITOR">Auditor / Regulatory Body</option>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1 text-muted-foreground">License #</label>
                  <Input
                    required
                    value={formData.license_number}
                    onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1 text-muted-foreground">City</label>
                  <Input
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium mb-1 text-muted-foreground">Official Contact Email</label>
                <Input
                  type="email"
                  required
                  value={formData.contact_email}
                  onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                  placeholder="compliance@company.com"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button variant="outline" type="button" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" isLoading={creating}>
                  Verify & Register
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
