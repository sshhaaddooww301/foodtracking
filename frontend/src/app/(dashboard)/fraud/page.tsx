"use client";
import React, { useEffect, useState } from "react";
import {
  ShieldAlert,
  Search,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Archive,
  ArrowRight,
  RefreshCw,
  FileText,
} from "lucide-react";
import { fraudApi } from "@/services/api";
import { FraudAlert } from "@/types";
import { Button, Card, Input, Select } from "@/components/ui/primitives";

export default function FraudAlertsPage() {
  const [alerts, setAlerts] = useState<FraudAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [riskLevel, setRiskLevel] = useState("");
  const [selectedAlert, setSelectedAlert] = useState<FraudAlert | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [resolving, setResolving] = useState(false);

  const fetchAlerts = async () => {
    setLoading(true);
    try {
      const res = await fraudApi.list({
        status: status || undefined,
        risk_level: riskLevel || undefined,
      });
      if (res.data?.items) setAlerts(res.data.items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, [status, riskLevel]);

  const handleResolve = async (action: "RESOLVED" | "DISMISSED") => {
    if (!selectedAlert) return;
    setResolving(true);
    try {
      await fraudApi.resolve(selectedAlert.id, {
        status: action,
        resolution_notes: resolutionNotes || "Reviewed and verified by compliance officer.",
      });
      setSelectedAlert(null);
      setResolutionNotes("");
      fetchAlerts();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to resolve alert");
    } finally {
      setResolving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ShieldAlert className="w-6 h-6 text-red-600" />
            Fraud Detection & Threat Analysis
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Automated sensor anomaly triggers, clone detection, replay prevention, and regulatory investigations
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={fetchAlerts}>
          <RefreshCw className="w-3.5 h-3.5 mr-1" />
          Refresh Alerts
        </Button>
      </div>

      {/* Filter Bar */}
      <Card className="p-4 flex flex-col sm:flex-row items-center gap-3">
        <Select
          value={riskLevel}
          onChange={(e) => setRiskLevel(e.target.value)}
          className="text-xs w-full sm:w-48"
        >
          <option value="">All Risk Levels</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </Select>

        <Select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="text-xs w-full sm:w-48"
        >
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="INVESTIGATING">Investigating</option>
          <option value="RESOLVED">Resolved</option>
          <option value="DISMISSED">Dismissed</option>
        </Select>
      </Card>

      {/* Alerts Table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Threat Type</th>
                <th className="py-3 px-4">Risk Severity</th>
                <th className="py-3 px-4">Description & Evidence</th>
                <th className="py-3 px-4">Associated Entity</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {alerts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    {loading ? "Analyzing fraud feeds..." : "No alerts matching current filters."}
                  </td>
                </tr>
              ) : (
                alerts.map((alert) => (
                  <tr key={alert.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-foreground">
                        {alert.alert_type.replace(/_/g, " ")}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {new Date(alert.created_at).toLocaleString()}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            alert.risk_level === "CRITICAL"
                              ? "bg-red-500/20 text-red-500"
                              : alert.risk_level === "HIGH"
                              ? "bg-amber-500/20 text-amber-500"
                              : "bg-blue-500/20 text-blue-500"
                          }`}
                        >
                          {alert.risk_level}
                        </span>
                        <span className="font-mono text-[11px] text-muted-foreground">
                          {(alert.risk_score * 100).toFixed(0)}%
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground max-w-xs">
                      <p className="line-clamp-2 text-foreground">{alert.description}</p>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-muted-foreground">
                      {alert.package_id ? (
                        <span className="text-blue-600 dark:text-blue-400">
                          Package: {alert.package_id.slice(0, 8)}...
                        </span>
                      ) : alert.shipment_id ? (
                        <span>Shipment: {alert.shipment_id.slice(0, 8)}...</span>
                      ) : (
                        <span>General Feed</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          alert.status === "RESOLVED"
                            ? "bg-emerald-500/20 text-emerald-500"
                            : alert.status === "OPEN"
                            ? "bg-red-500/20 text-red-500"
                            : "bg-slate-500/20 text-slate-500"
                        }`}
                      >
                        {alert.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      {alert.status === "OPEN" ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-[11px]"
                          onClick={() => setSelectedAlert(alert)}
                        >
                          Review & Resolve
                        </Button>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">Closed</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Resolve Alert Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-base font-bold text-foreground mb-1">Investigate Alert</h2>
            <p className="text-xs text-muted-foreground mb-3 font-semibold">
              {selectedAlert.alert_type.replace(/_/g, " ")} ({selectedAlert.risk_level})
            </p>
            <p className="text-xs text-muted-foreground mb-4 p-3 bg-muted rounded-lg">
              {selectedAlert.description}
            </p>

            <div className="space-y-3 text-xs mb-4">
              <label className="block font-medium text-muted-foreground">
                Audit & Resolution Notes
              </label>
              <textarea
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Detail corrective action, physical inspection result, or false positive rationale..."
                className="w-full h-24 p-3 rounded-md border border-input bg-background text-foreground text-xs focus:ring-1 focus:ring-primary"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedAlert(null)}
              >
                Cancel
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-slate-500"
                isLoading={resolving}
                onClick={() => handleResolve("DISMISSED")}
              >
                Dismiss False Alarm
              </Button>
              <Button
                variant="primary"
                size="sm"
                isLoading={resolving}
                onClick={() => handleResolve("RESOLVED")}
              >
                Confirm & Resolve
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
