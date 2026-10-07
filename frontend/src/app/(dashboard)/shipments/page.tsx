"use client";
import React, { useEffect, useState } from "react";
import {
  Truck,
  Plus,
  ArrowRight,
  ShieldCheck,
  ThermometerSnowflake,
  Search,
  RefreshCw,
  MapPin,
  CheckCircle2,
} from "lucide-react";
import { shipmentsApi, organizationsApi } from "@/services/api";
import { Shipment, Organization } from "@/types";
import { Button, Card, Input, Select } from "@/components/ui/primitives";

export default function ShipmentsPage() {
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);

  const [formData, setFormData] = useState({
    carrier: "Apollo Cold Express",
    vehicle_number: "MH-02-CE-8821",
    driver_name: "Vikram Rathore",
    driver_phone: "+91-98200-11223",
    origin_org_id: "",
    destination_org_id: "",
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [sRes, oRes] = await Promise.all([
        shipmentsApi.list({ search }),
        organizationsApi.list(),
      ]);
      if (sRes.data?.items) setShipments(sRes.data.items);
      if (oRes.data?.items) {
        setOrgs(oRes.data.items);
        if (oRes.data.items.length >= 2) {
          setFormData((prev) => ({
            ...prev,
            origin_org_id: oRes.data.items[0].id,
            destination_org_id: oRes.data.items[1].id,
          }));
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
      await shipmentsApi.create(formData);
      setShowModal(false);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to create shipment");
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (shipmentId: string, newStatus: string) => {
    try {
      await shipmentsApi.updateStatus(shipmentId, newStatus);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to update shipment status");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Truck className="w-6 h-6 text-blue-600" />
            Shipments & Custody Handovers
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            End-to-end custody transfer logs, GPS transit routes, and temperature compliance checks
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
          <Plus className="w-4 h-4 mr-1.5" />
          Dispatch New Shipment
        </Button>
      </div>

      {/* Shipments Table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Shipment #</th>
                <th className="py-3 px-4">Route (Origin → Dest)</th>
                <th className="py-3 px-4">Carrier & Vehicle</th>
                <th className="py-3 px-4">Cold-Chain Status</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Custody Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {shipments.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    {loading ? "Loading shipments..." : "No shipments found. Dispatch one above!"}
                  </td>
                </tr>
              ) : (
                shipments.map((s) => (
                  <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-semibold text-foreground">
                        {s.shipment_number}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(s.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5 text-foreground font-medium">
                        <span>{s.origin?.name || "Cipla Plant, Mumbai"}</span>
                        <ArrowRight className="w-3 h-3 text-muted-foreground" />
                        <span>{s.destination?.name || "Delhi Central Hub"}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      <div className="text-foreground font-medium">{s.carrier}</div>
                      <div className="font-mono text-[10px]">{s.vehicle_number}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      {s.temperature_compliant ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                          <ThermometerSnowflake className="w-3.5 h-3.5" />
                          Compliant (2-8°C)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-medium">
                          <ThermometerSnowflake className="w-3.5 h-3.5" />
                          Breach Alert
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          s.status === "DELIVERED"
                            ? "bg-emerald-500/20 text-emerald-500"
                            : s.status === "IN_TRANSIT"
                            ? "bg-blue-500/20 text-blue-500"
                            : "bg-amber-500/20 text-amber-500"
                        }`}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {s.status === "PENDING" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-[11px]"
                          onClick={() => handleStatusChange(s.id, "IN_TRANSIT")}
                        >
                          Mark Departed
                        </Button>
                      )}
                      {s.status === "IN_TRANSIT" && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-[11px] text-emerald-600"
                          onClick={() => handleStatusChange(s.id, "DELIVERED")}
                        >
                          Confirm Receipt
                        </Button>
                      )}
                      {s.status === "DELIVERED" && (
                        <span className="text-[11px] text-muted-foreground">Delivered & Signed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Create Shipment Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-foreground mb-1">Dispatch Shipment</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Create an on-chain custody record for bulk transit.
            </p>

            <form onSubmit={handleCreate} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium mb-1 text-muted-foreground">Origin Facility</label>
                <Select
                  value={formData.origin_org_id}
                  onChange={(e) => setFormData({ ...formData, origin_org_id: e.target.value })}
                >
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} ({o.org_type})
                    </option>
                  ))}
                </Select>
              </div>

              <div>
                <label className="block font-medium mb-1 text-muted-foreground">Destination Facility</label>
                <Select
                  value={formData.destination_org_id}
                  onChange={(e) => setFormData({ ...formData, destination_org_id: e.target.value })}
                >
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name} ({o.org_type})
                    </option>
                  ))}
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1 text-muted-foreground">Logistics Carrier</label>
                  <Input
                    required
                    value={formData.carrier}
                    onChange={(e) => setFormData({ ...formData, carrier: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1 text-muted-foreground">Vehicle / Reefer #</label>
                  <Input
                    required
                    value={formData.vehicle_number}
                    onChange={(e) => setFormData({ ...formData, vehicle_number: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium mb-1 text-muted-foreground">Driver Name</label>
                  <Input
                    value={formData.driver_name}
                    onChange={(e) => setFormData({ ...formData, driver_name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1 text-muted-foreground">Driver Phone</label>
                  <Input
                    value={formData.driver_phone}
                    onChange={(e) => setFormData({ ...formData, driver_phone: e.target.value })}
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
                <Button variant="outline" type="button" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" isLoading={creating}>
                  Mint Shipment On-Chain
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
