"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2 } from "lucide-react";
import { BackendCaseData, BackendDirective } from "@/lib/types";
import { getConfidenceConfig } from "@/lib/ui-config";

interface PdfViewerProps {
  extraction: BackendCaseData | null;
  activeDirective: BackendDirective | null;
}

export default function PdfViewer({ extraction, activeDirective }: PdfViewerProps) {
  const [currentPage, setCurrentPage] = useState(1);

  // Auto-jump to the directive's real source page
  useEffect(() => {
    if (activeDirective && activeDirective.source_page) {
      setCurrentPage(activeDirective.source_page);
    }
  }, [activeDirective]);

  const totalPages = Math.max(8, activeDirective?.source_page || 1);

  // Highlight dynamically based on the exact source page
  const highlightActive = activeDirective && currentPage === activeDirective.source_page;

  const cfg = activeDirective ? getConfidenceConfig(activeDirective.directive_confidence_score) : null;

  if (!extraction) return null;

  return (
    <div className="flex flex-col h-full bg-[#1a1f2e]">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-bg-border bg-bg-secondary flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 border border-bg-border rounded-md overflow-hidden">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 hover:bg-bg-elevated text-ink-secondary disabled:opacity-30 transition-colors"
            >
              <ChevronLeft size={13} />
            </button>
            <span className="px-2 text-[11px] font-mono text-ink-secondary border-x border-bg-border min-w-[60px] text-center">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 hover:bg-bg-elevated text-ink-secondary disabled:opacity-30 transition-colors"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button className="p-1.5 hover:bg-bg-elevated text-ink-muted rounded transition-colors">
            <ZoomOut size={12} />
          </button>
          <span className="text-[10px] font-mono text-ink-muted px-1">100%</span>
          <button className="p-1.5 hover:bg-bg-elevated text-ink-muted rounded transition-colors">
            <ZoomIn size={12} />
          </button>
          <div className="w-px h-4 bg-bg-border mx-1" />
          <button className="p-1.5 hover:bg-bg-elevated text-ink-muted rounded transition-colors">
            <Maximize2 size={12} />
          </button>
        </div>

        {activeDirective && cfg && (
          <div
            className="flex items-center gap-1.5 px-2 py-1 rounded text-[10px] font-mono border"
            style={{ color: cfg.color, background: `${cfg.color}15`, borderColor: `${cfg.color}33` }}
          >
            <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: cfg.color }} />
            Highlighting DIR-{activeDirective.id}
          </div>
        )}
      </div>

      {/* Page content */}
      <div className="flex-1 overflow-y-auto p-6 flex justify-center">
        <div
          className="pdf-mock-page w-full max-w-[520px] min-h-[680px] shadow-2xl rounded-sm px-10 py-12 relative text-[11px] leading-relaxed bg-white"
          style={{ fontSize: "10.5px" }}
        >
          {/* Highlight overlay */}
          {highlightActive && activeDirective && cfg && (
            <div
              className="pdf-highlight absolute"
              style={{
                top: "30%",
                left: "8%",
                right: "8%",
                height: "18%",
                background: `${cfg.color}15`,
                border: `1px solid ${cfg.color}80`,
                borderRadius: "4px"
              }}
            />
          )}

          {/* Page header */}
          <div className="text-center mb-6 text-[10px] text-gray-500 border-b border-gray-200 pb-3">
            <div className="font-bold text-[11px] text-gray-800">HON'BLE HIGH COURT</div>
            <div className="mt-0.5">CASE NO. {extraction.case_id}</div>
          </div>

          {/* Document content */}
          <div className="space-y-2 text-gray-800">
            {currentPage === 1 && (
              <>
                <div className="text-center font-bold text-[13px] text-gray-900 mb-4">
                  WRIT PETITION (CIVIL) {extraction.case_id}
                </div>
                <div className="text-center text-[10px] text-gray-500 mb-6">
                  Date of Order: {new Date().toISOString().split('T')[0]}
                </div>
                <div className="font-semibold text-gray-800 mt-4 mb-2">CORAM:</div>
                <div className="text-gray-700">HON'BLE THE CHIEF JUSTICE</div>
                <div className="text-gray-700">HON'BLE MR. JUSTICE [REDACTED]</div>
                <div className="mt-6 font-semibold text-gray-800">BETWEEN:</div>
                <div className="ml-4 mt-2 text-gray-700">Petitioner(s)</div>
                <div className="text-center text-gray-500 my-2">— versus —</div>
                <div className="ml-4 text-gray-700">Respondent(s)</div>
                <div className="mt-8 font-bold text-gray-900">JUDGMENT</div>
                <div className="mt-3 text-gray-700 leading-5">
                  The matter was heard at length. The learned counsel for the petitioner submitted that the concerned authorities had failed to discharge their constitutional and statutory obligations in the matter of civic infrastructure maintenance.
                </div>
              </>
            )}
            
            {/* Render directives dynamically on their ACTUAL source pages */}
            {extraction.directives.filter(d => d.source_page === currentPage).length > 0 && (
              <>
                <div className="font-bold text-gray-900 mb-3 mt-4">DIRECTIONS / ORDER (PAGE {currentPage})</div>
                {extraction.directives
                  .filter(d => d.source_page === currentPage)
                  .map((d) => (
                  <div
                    key={d.id}
                    className="mb-4 pl-3 border-l-2 text-gray-700 leading-5"
                    style={{
                      borderColor: activeDirective?.id === d.id ? (cfg?.color || "#f5a623") : "#d1d5db",
                    }}
                  >
                    <span className="font-semibold text-gray-800">DIR-{d.id}:</span>{" "}
                    {d.directive_text}
                  </div>
                ))}
              </>
            )}

            {/* Fallback mock text for pages without specific directives */}
            {extraction.directives.filter(d => d.source_page === currentPage).length === 0 && currentPage !== 1 && (
              <>
                <div className="font-bold text-gray-900 mb-3 mt-4">
                  {currentPage === totalPages ? "COMPLIANCE MECHANISM" : "OBSERVATIONS"}
                </div>
                <div className="text-gray-700 leading-5 space-y-3">
                  <p>
                    The Registry is directed to forward certified copies of this order to all
                    Secretaries of the concerned departments through the Additional Solicitor General.
                  </p>
                  <p>
                    The matter is posted for compliance reporting on the next date of hearing.
                    Nodal officers from each department shall be present before the Court.
                  </p>
                  <p>
                    The learned Additional Solicitor General is requested to ensure personal
                    monitoring of compliance with these directions.
                  </p>
                  {currentPage === totalPages && (
                    <div className="mt-8 text-right">
                      <div className="font-semibold text-gray-800">Sd/-</div>
                      <div className="text-gray-600 text-[10px] mt-1">Chief Justice</div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Page number */}
          <div className="absolute bottom-4 left-0 right-0 text-center text-[9px] text-gray-400">
            Page {currentPage} of {totalPages}
          </div>
        </div>
      </div>

      {/* Jump to page buttons */}
      {activeDirective && (
        <div className="px-4 py-2 border-t border-bg-border bg-bg-secondary flex items-center gap-2">
          <span className="text-[10px] text-ink-muted">Jump to:</span>
          <button
            onClick={() => setCurrentPage(activeDirective.source_page)}
            className="text-[10px] font-mono px-2 py-1 rounded border border-bg-border hover:border-amber-muted/30 hover:text-amber-glow text-ink-secondary transition-all"
          >
            Source Page ({activeDirective.source_page})
          </button>
        </div>
      )}
    </div>
  );
}