"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  UploadCloud,
  FileText,
  Loader2,
  Database,
  AlertCircle,
  ArrowRight,
} from "lucide-react";
import { API_BASE } from "@/lib/api";

interface MockCase {
  id: string;
  case_number?: string;
  court: string;
  date: string;
  pdf_path: string;
}

export default function Home() {
  const router = useRouter();

  const [cases, setCases] = useState<MockCase[]>([]);
  const [loadingCases, setLoadingCases] = useState(true);

  // Track currently processing mock case
  const [processingId, setProcessingId] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch mock CIS cases
  useEffect(() => {
    async function fetchCases() {
      try {
        const res = await fetch(`${API_BASE}/api/mock-cis/cases`);

        if (!res.ok) {
          throw new Error("Failed to fetch Mock CIS data");
        }

        const data = await res.json();

        const caseList = Array.isArray(data)
          ? data
          : data.cases || [];

        setCases(caseList);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoadingCases(false);
      }
    }

    fetchCases();
  }, []);

  // Handle mock CIS extraction
  const handleExtractMockCase = async (caseId: string) => {
    setProcessingId(caseId);
    setError(null);

    try {
      console.log("Starting extraction for:", caseId);

      const res = await fetch(
        `${API_BASE}/api/extract/${encodeURIComponent(caseId)}`,
        {
          method: "POST",
        }
      );

      if (!res.ok) {
        throw new Error("Failed to trigger extraction pipeline");
      }

      const data = await res.json();

      console.log("Extraction completed:", data);

      // Backend is now synchronous — safe to redirect immediately
      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      setError(err.message);
      setProcessingId(null);
    }
  };

  // Handle manual PDF upload
  const handleFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];

    if (!file) return;

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      console.log("Uploading PDF:", file.name);

      const res = await fetch(`${API_BASE}/api/cases/upload`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Upload failed");
      }

      const data = await res.json();

      console.log("Upload + extraction completed:", data);

      // Backend is now synchronous — redirect immediately
      router.push("/dashboard");
    } catch (err: any) {
      console.error(err);
      setError(err.message);
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bg-primary text-ink-primary flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-4xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-display font-medium text-ink-primary">
            Adhikar<span className="text-amber-glow">AI</span> Ingestion Engine
          </h1>

          <p className="text-ink-secondary text-sm">
            Upload a legal document or select a case from the High Court CIS.
          </p>
        </div>

        {error && (
          <div className="p-4 bg-verdict-red-bg border border-verdict-red/30 rounded-lg flex items-center gap-3 text-verdict-red text-sm font-medium animate-fade-in">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6">
          {/* Manual Upload */}
          <div className="bg-bg-surface border border-bg-border rounded-xl p-8 flex flex-col items-center justify-center text-center space-y-4 shadow-sm hover:border-amber-muted/30 transition-colors group">
            <div className="w-16 h-16 bg-bg-elevated rounded-full flex items-center justify-center text-amber-glow group-hover:scale-110 transition-transform">
              {uploading ? (
                <Loader2 className="animate-spin" size={28} />
              ) : (
                <UploadCloud size={28} />
              )}
            </div>

            <div>
              <h3 className="font-semibold text-lg text-ink-primary mb-1">
                Manual PDF Upload
              </h3>

              <p className="text-xs text-ink-muted mb-4 max-w-xs">
                Drag and drop a court order or judgment PDF to extract compliance directives.
              </p>
            </div>

            <label className="relative cursor-pointer px-6 py-2.5 bg-amber-subtle border border-amber-muted/40 text-amber-glow text-sm font-semibold rounded-lg hover:bg-amber-muted/20 transition-all">
              <span>
                {uploading
                  ? "Extracting directives via Gemini..."
                  : "Browse Files"}
              </span>

              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading || processingId !== null}
              />
            </label>
          </div>

          {/* Mock CIS Cases */}
          <div className="bg-bg-surface border border-bg-border rounded-xl p-6 shadow-sm flex flex-col">
            <div className="flex items-center gap-2 mb-4 pb-4 border-b border-bg-border">
              <Database size={18} className="text-ink-secondary" />
              <h3 className="font-semibold text-ink-primary">
                High Court CIS (Mock)
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 space-y-3">
              {loadingCases ? (
                <div className="flex items-center justify-center h-32">
                  <Loader2 className="animate-spin text-ink-muted" size={24} />
                </div>
              ) : (
                cases.map((c) => {
                  const identifier =
                    c.id || c.case_number || "UNKNOWN";

                  const isProcessing = processingId === identifier;

                  return (
                    <div
                      key={identifier}
                      className="flex items-center justify-between p-3 rounded-lg border border-bg-border bg-bg-elevated/50 hover:bg-bg-elevated transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        <FileText
                          size={16}
                          className="text-ink-muted mt-0.5"
                        />

                        <div>
                          <div className="text-xs font-mono font-semibold text-ink-primary mb-0.5">
                            {identifier}
                          </div>

                          <div className="text-[10px] text-ink-muted flex items-center gap-2">
                            <span>{c.court}</span>

                            <span className="w-1 h-1 rounded-full bg-bg-border-light" />

                            <span>{c.date}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleExtractMockCase(identifier)}
                        disabled={processingId !== null || uploading}
                        className="p-2 text-ink-secondary hover:text-amber-glow hover:bg-amber-subtle rounded-md transition-all disabled:opacity-30"
                        title="Process Case"
                      >
                        {isProcessing ? (
                          <Loader2
                            size={16}
                            className="animate-spin text-amber-glow"
                          />
                        ) : (
                          <ArrowRight size={16} />
                        )}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="text-center">
          <button
            onClick={() => router.push("/dashboard")}
            className="text-sm font-medium text-ink-muted hover:text-amber-glow transition-colors underline decoration-bg-border underline-offset-4 hover:decoration-amber-muted/50"
          >
            Skip to Trusted Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

