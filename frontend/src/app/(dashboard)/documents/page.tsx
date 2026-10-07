"use client";
import React, { useEffect, useState } from "react";
import {
  FileText,
  Upload,
  ExternalLink,
  ShieldCheck,
  Search,
  RefreshCw,
  FileCheck,
  AlertCircle,
} from "lucide-react";
import { documentsApi } from "@/services/api";
import { DocumentRecord } from "@/types";
import { Button, Card, Input, Select } from "@/components/ui/primitives";

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [title, setTitle] = useState("Certificate of Analysis (Batch #2026-001)");
  const [docType, setDocType] = useState("COA");
  const [file, setFile] = useState<File | null>(null);

  const fetchDocuments = async () => {
    setLoading(true);
    try {
      const res = await documentsApi.list();
      if (res.data?.items) setDocuments(res.data.items);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert("Please select a document file to anchor");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title);
      formData.append("doc_type", docType);

      await documentsApi.upload(formData);
      setShowModal(false);
      setFile(null);
      fetchDocuments();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Failed to anchor document to IPFS");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <FileText className="w-6 h-6 text-navy-900" />
            IPFS Decentralized Documents & COA Records
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Immutable regulatory Certificates of Analysis, lab assays, and shipping manifests pinned to IPFS
          </p>
        </div>

        <Button variant="primary" size="sm" onClick={() => setShowModal(true)}>
          <Upload className="w-4 h-4 mr-1.5" />
          Anchor Document
        </Button>
      </div>

      {/* Documents Table */}
      <Card className="overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b border-border font-semibold text-muted-foreground uppercase text-[10px] tracking-wider">
              <tr>
                <th className="py-3 px-4">Document Title</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">IPFS CID</th>
                <th className="py-3 px-4">SHA-256 Hash</th>
                <th className="py-3 px-4">Integrity Status</th>
                <th className="py-3 px-4 text-right">Gateway View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {documents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-muted-foreground">
                    {loading ? "Loading IPFS document records..." : "No anchored documents found."}
                  </td>
                </tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-muted/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-foreground">{doc.title}</div>
                      <div className="text-[10px] text-muted-foreground">{doc.file_name}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                        {doc.doc_type}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-blue-600 dark:text-blue-400">
                      {doc.ipfs_cid.slice(0, 14)}...{doc.ipfs_cid.slice(-6)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-muted-foreground">
                      {doc.file_hash.slice(0, 10)}...
                    </td>
                    <td className="py-3.5 px-4">
                      {!doc.is_tampered ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium text-[11px]">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          VERIFIED AUTHENTIC
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-600 dark:text-red-400 font-medium text-[11px]">
                          <AlertCircle className="w-3.5 h-3.5" />
                          TAMPER DETECTED
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <a
                        href={`https://gateway.pinata.cloud/ipfs/${doc.ipfs_cid}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-blue-600 hover:underline"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        IPFS
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Upload Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-card border border-border rounded-xl max-w-md w-full p-6 shadow-2xl">
            <h2 className="text-lg font-bold text-foreground mb-1">Anchor Document to IPFS</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Computes SHA-256 fingerprint, uploads to IPFS, and mints an on-chain verification hash.
            </p>

            <form onSubmit={handleUpload} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-medium mb-1 text-muted-foreground">Document Title</label>
                <Input
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div>
                <label className="block font-medium mb-1 text-muted-foreground">Document Classification</label>
                <Select
                  value={docType}
                  onChange={(e) => setDocType(e.target.value)}
                >
                  <option value="COA">Certificate of Analysis (COA)</option>
                  <option value="MANUFACTURING_LICENSE">Manufacturing License</option>
                  <option value="IMPORT_PERMIT">Import / Export Permit</option>
                  <option value="TEMPERATURE_LOG">Certified Temperature Log</option>
                </Select>
              </div>

              <div>
                <label className="block font-medium mb-1 text-muted-foreground">Select File</label>
                <input
                  type="file"
                  required
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <Button variant="outline" type="button" onClick={() => setShowModal(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" isLoading={uploading}>
                  Pin & Anchor
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
