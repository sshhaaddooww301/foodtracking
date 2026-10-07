"use client";
import React, { useEffect, useState } from "react";
import {
  ScrollText,
  Search,
  RefreshCw,
  ShieldCheck,
  Download,
  Filter,
} from "lucide-react";
import { auditApi } from "@/services/api";
import { Button, Card, Input } from "@/components/ui/primitives";

export default function AuditPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await auditApi.list({ action: search || undefined });
      if (res.data?.items) setLogs(res.data.items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const exportCSV = () => {
    if (logs.length === 0) return;
    const headers = ["Timestamp", "Action", "Resource Type", "Resource ID", "Description", "IP Address"];
    const rows = logs.map((l) => [
      l.created_at,
      l.action,
      l.resource_type || "",
      l.resource_id || "",
      `"${(l.description || "").replace(/"/g, '""')}"`,
      l.ip_address || "",
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `trustchain_audit_trail_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <ScrollText className="w-6 h-6 text-slate-700 dark:text-slate-300" />
            Regulatory Audit Trail (21 CFR Part 11)
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Immutable system provenance and tamper-evident administrative action log
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV}>
            <Download className="w-3.5 h-3.5 mr-1" />
            Export Audit CSV
          </Button>
          <Button variant="outline" size="sm" onClick={fetchLogs}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Logs Table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Event Action</th>
                <th className="py-3 px-4">Resource Target</th>
                <th className="py-3 px-4">Audit Description</th>
                <th className="py-3 px-4">Client IP</th>
                <th className="py-3 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border font-mono text-[11px]">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-muted-foreground font-sans">
                    {loading ? "Loading audit records..." : "No audit trail logs found."}
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4 font-semibold text-blue-600 dark:text-blue-400 font-sans">
                      {log.action}
                    </td>
                    <td className="py-3.5 px-4 text-foreground">
                      {log.resource_type || "SYSTEM"}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground font-sans max-w-sm truncate">
                      {log.description}
                    </td>
                    <td className="py-3.5 px-4 text-muted-foreground">
                      {log.ip_address || "127.0.0.1"}
                    </td>
                    <td className="py-3.5 px-4 text-right text-muted-foreground">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
