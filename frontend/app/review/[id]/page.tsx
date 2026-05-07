"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  CheckCircle2, XCircle, Edit3, AlertTriangle, ChevronLeft,
  ChevronRight, Clock, Loader2, Save, RotateCcw, Database, Scale, Zap
} from "lucide-react";
import PdfViewer from "@/components/PdfViewer";
import ConfidenceBar, { ConfidenceBadge } from "@/components/ConfidenceBar";
import clsx from "clsx";

// Extracted types and configurations
import { BackendCaseData, BackendDirective, DirectiveState, ReviewStatus } from "@/lib/types";
import { getConfidenceConfig, calculateDaysLeft, getDaysLeftConfig } from "@/lib/ui-config";
import { API_BASE } from "@/lib/api";

export default function ReviewPortal() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  
  // Data Fetching State
  const [caseData, setCaseData] = useState<BackendCaseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // UI State
  const [activeIdx, setActiveIdx] = useState(0);
  const [states, setStates] = useState<Record<number, DirectiveState>>({});
  const [editMode, setEditMode] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [flash, setFlash] = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // 1. Fetch data from FastAPI (Wrapped in useCallback for the refetch logic)
  const loadData = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/review/${id}`);
      if (!res.ok) throw new Error("Failed to fetch case data");
      const data: BackendCaseData = await res.json();
      
      setCaseData(data);
      
      const initialStates: Record<number, DirectiveState> = {};
      data.directives.forEach((d) => {
        initialStates[d.id] = {
          status: d.status,
          edited: false,
          directive_text: d.directive_text,
          responsible_entity: d.responsible_entity || "",
          deadline: d.deadline || "",
          appeal_flag: d.appeal_flag,
        };
      });
      setStates(initialStates);
    } catch (err: any) {
      setFetchError(err.message);
    } finally {
      if (showLoading) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadData(true);
  }, [loadData]);

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center">
        <Loader2 size={32} className="text-amber-glow animate-spin mb-4" />
        <p className="text-ink-secondary text-sm font-mono">Loading directives from Layer 4...</p>
      </div>
    );
  }

  if (fetchError || !caseData) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle size={32} className="text-verdict-red mx-auto mb-3" />
          <h2 className="text-ink-primary font-display text-xl mb-2">Connection Error</h2>
          <p className="text-ink-secondary text-[13px] mb-4">{fetchError || "Case not found"}</p>
          <button
            onClick={() => router.push("/")}
            className="px-4 py-2 bg-amber-glow text-bg-primary text-[13px] font-semibold rounded-md"
          >
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  const directives = caseData.directives;
  const activeDirective = directives[activeIdx];
  
  // HIGH VALUE FIX: Prevent undefined field access
  if (!activeDirective) return null;

  const activeState = states[activeDirective.id] ?? {} as DirectiveState;

  const verified = Object.values(states).filter(s => s.status === "verified").length;
  const rejected = Object.values(states).filter(s => s.status === "rejected").length;
  const pending = directives.length - verified - rejected;
  const allDone = pending === 0;
  const progress = Math.round(((verified + rejected) / directives.length) * 100);

  function triggerFlash(type: "success" | "error", msg: string) {
    setFlash({ type, msg });
    setTimeout(() => setFlash(null), 3000);
  }

  async function handleApprove() {
    setSaving(true);
  
    try {
      const isEdited = activeState.edited;
  
      const endpoint = isEdited ? "edit" : "approve";
  
      const payload = isEdited
        ? {
            reviewer_id: "demo_officer",
            corrected_value: {
              directive_text: activeState.directive_text,
              responsible_entity: activeState.responsible_entity,
              deadline: activeState.deadline,
              appeal_flag: activeState.appeal_flag,
            },
          }
        : {
            reviewer_id: "demo_officer",
          };
  
      const res = await fetch(
        `${API_BASE}/api/review/${activeDirective.id}/${endpoint}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );
  
      if (!res.ok) {
        throw new Error("Approval failed");
      }
  
      // IMPORTANT FIX:
      // Immediately update local state so progress updates instantly.
      setStates((prev) => ({
        ...prev,
        [activeDirective.id]: {
          ...prev[activeDirective.id],
          status: "verified",
        },
      }));
  
      setEditMode(false);
  
      triggerFlash(
        "success",
        `Directive ${activeDirective.id} approved ✅`
      );
  
      // Find next pending directive
      const nextPendingIdx = directives.findIndex(
        (d, i) =>
          i > activeIdx &&
	  d.id !== activeDirective.id &&
          states[d.id]?.status === "pending"
      );
  
      // If another pending directive exists → move there
      if (nextPendingIdx !== -1) {
        setTimeout(() => {
          setActiveIdx(nextPendingIdx);
        }, 300);
      } else {
        // IMPORTANT FIX:
        // No more pending directives → auto redirect to dashboard
        setTimeout(() => {
          router.push("/dashboard");
        }, 700);
      }
  
      // Sync backend state silently
      await loadData(false);
  
    } catch (err) {
      console.error(err);
  
      triggerFlash(
        "error",
        "Failed to communicate with backend"
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleReject() {
    if (!rejectReason.trim()) {
      triggerFlash(
        "error",
        "Please enter a rejection reason"
      );
  
      return;
    }
  
    setSaving(true);
  
    try {
      const res = await fetch(
        `${API_BASE}/api/review/${activeDirective.id}/reject`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            reviewer_id: "demo_officer",
            rejection_reason: rejectReason,
          }),
        }
      );
  
      if (!res.ok) {
        throw new Error("Rejection failed");
      }
  
      // IMPORTANT FIX:
      // Update local state immediately
      setStates((prev) => ({
        ...prev,
        [activeDirective.id]: {
          ...prev[activeDirective.id],
          status: "rejected",
          rejectionReason: rejectReason,
        },
      }));
  
      setShowRejectInput(false);
      setRejectReason("");
  
      triggerFlash(
        "error",
        `Directive ${activeDirective.id} rejected ❌`
      );
  
      // Find next pending directive
      const nextPendingIdx = directives.findIndex(
        (d, i) =>
          i > activeIdx &&
	  d.id !== activeDirective.id &&
          states[d.id]?.status === "pending"
      );
  
      // Move to next pending directive if available
      if (nextPendingIdx !== -1) {
        setTimeout(() => {
          setActiveIdx(nextPendingIdx);
        }, 300);
      } else {
        // IMPORTANT FIX:
        // Auto redirect after final review
        setTimeout(() => {
          router.push("/dashboard");
        }, 700);
      }
  
      // Sync backend state silently
      await loadData(false);
  
    } catch (err) {
      console.error(err);
  
      triggerFlash(
        "error",
        "Failed to reject on backend"
      );
    } finally {
      setSaving(false);
    }
  }

  function handleSaveEdit() {
    setStates(prev => ({
      ...prev,
      [activeDirective.id]: { ...prev[activeDirective.id], edited: true },
    }));
    setEditMode(false);
    triggerFlash("success", "Changes saved locally — click Approve to verify");
  }

  function handleFieldChange(field: keyof DirectiveState, value: any) {
    setStates(prev => ({
      ...prev,
      [activeDirective.id]: { ...prev[activeDirective.id], [field]: value },
    }));
  }

  const cfg = getConfidenceConfig(activeDirective.directive_confidence_score || 0);
  const calculatedDays = calculateDaysLeft(activeState.deadline);
  const dCfg = getDaysLeftConfig(calculatedDays);

  const statusIcon = (s: ReviewStatus) =>
    s === "verified" ? "✅" : s === "rejected" ? "❌" : "⏳";

  return (
    <div className="h-screen flex flex-col bg-bg-primary overflow-hidden">
      {/* ── Top bar ── */}
      <header className="flex-shrink-0 h-13 border-b border-bg-border bg-bg-secondary/90 backdrop-blur-md flex items-center px-4 gap-4 z-40">
        <button onClick={() => router.push("/")} className="flex items-center gap-1.5 text-ink-secondary hover:text-ink-primary text-[12px] transition-colors">
          <ChevronLeft size={14} /> Home
        </button>
        <div className="w-px h-4 bg-bg-border" />
        <div className="flex items-center gap-2">
          <Scale size={14} className="text-amber-glow" />
          <span className="font-mono text-[12px] text-ink-primary font-medium">Case ID: {caseData.case_id}</span>
        </div>

        {/* Progress bar */}
        <div className="flex-1 flex items-center gap-3 ml-4">
          <div className="flex-1 max-w-xs">
            <div className="flex justify-between text-[10px] font-mono text-ink-muted mb-1">
              <span>{verified + rejected} of {directives.length} reviewed</span>
              <span>{progress}%</span>
            </div>
            <div className="h-1 bg-bg-elevated rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, background: allDone ? "#10d9a8" : "#f5a623" }}
              />
            </div>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-mono">
            <span className="text-verdict-green">{verified} ✅</span>
            <span className="text-verdict-red">{rejected} ❌</span>
            <span className="text-amber-glow">{pending} ⏳</span>
          </div>
        </div>

        {allDone && (
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-verdict-green text-bg-primary text-[12px] font-semibold rounded-md hover:opacity-90 transition-all ml-2"
          >
            <Database size={12} />
            Go to Dashboard
          </button>
        )}
      </header>

      {/* ── Flash message ── */}
      {flash && (
        <div className={clsx("absolute top-14 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-full text-[12px] font-medium shadow-lg border transition-all animate-slide-up", flash.type === "success" ? "bg-verdict-green-bg border-verdict-green/30 text-verdict-green" : "bg-verdict-red-bg border-verdict-red/30 text-verdict-red")}>
          {flash.type === "success" ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
          {flash.msg}
        </div>
      )}

      {/* ── Main split layout ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT: PDF Viewer (50%) */}
        <div className="w-1/2 flex flex-col border-r border-bg-border overflow-hidden">
          {/* HIGH VALUE FIX: Eliminated the 'as any' casting by strictly typing the props */}
          <PdfViewer extraction={caseData} activeDirective={activeDirective} />
        </div>

        {/* RIGHT: Review Panel (50%) */}
        <div className="w-1/2 flex flex-col overflow-hidden bg-bg-primary">
          {/* Directive tabs */}
          <div className="flex-shrink-0 flex overflow-x-auto border-b border-bg-border bg-bg-secondary/30 scrollbar-none px-2 pt-2 gap-1">
            {directives.map((d, i) => {
              const s = states[d.id];
              const isActive = i === activeIdx;
              const dcfg = getConfidenceConfig(d.directive_confidence_score);
              return (
                <button
                  key={d.id}
                  onClick={() => { setActiveIdx(i); setEditMode(false); setShowRejectInput(false); }}
                  className={clsx("flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-t-md text-[11px] font-mono border-b-2 transition-all", isActive ? "bg-bg-surface border-amber-glow text-ink-primary" : "border-transparent text-ink-secondary hover:text-ink-primary hover:bg-bg-elevated")}
                >
                  <span>{statusIcon(s?.status ?? "pending")}</span>
                  DIR-{d.id}
                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: dcfg.color }} />
                </button>
              );
            })}
          </div>

          {/* Directive detail */}
          <div className="flex-1 overflow-y-auto">
            {activeDirective && (
              <div className="p-5 space-y-5 animate-fade-in">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[10px] font-mono text-ink-muted">DIR-{activeDirective.id}</span>
                      <span className="text-[10px] font-mono" style={{ color: cfg.color }}>{cfg.emoji} {(activeDirective.directive_confidence_score * 100).toFixed(0)}%</span>
                      {activeState.edited && (
                        <span className="text-[10px] bg-amber-subtle text-amber-glow border border-amber-muted/30 px-1.5 py-0.5 rounded font-mono">✏️ Edited</span>
                      )}
                      {activeDirective.ambiguity_flag && (
                        <span className="text-[10px] bg-verdict-red-bg text-verdict-red border border-verdict-red/30 px-1.5 py-0.5 rounded font-mono flex items-center gap-1"><AlertTriangle size={10} /> Ambiguous</span>
                      )}
                    </div>
                    {activeState.status !== "pending" && (
                      <div className={clsx("inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded border mb-2", activeState.status === "verified" ? "bg-verdict-green-bg border-verdict-green/25 text-verdict-green" : "bg-verdict-red-bg border-verdict-red/25 text-verdict-red")}>
                        {activeState.status === "verified" ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                        {activeState.status === "verified" ? "Verified" : "Rejected"}
                        {activeState.rejectionReason && <span className="text-ink-muted font-normal"> — {activeState.rejectionReason}</span>}
                      </div>
                    )}
                  </div>

                  {activeState.status !== "pending" && (
                    <button onClick={() => setStates(prev => ({ ...prev, [activeDirective.id]: { ...prev[activeDirective.id], status: "pending" } }))} className="flex items-center gap-1 text-[11px] text-ink-secondary hover:text-ink-primary border border-bg-border hover:border-bg-border-light rounded-md px-2 py-1 transition-all">
                      <RotateCcw size={11} /> Reset
                    </button>
                  )}
                </div>

                {/* ── Extracted fields ── */}
                <div className="space-y-3">
                  <div className="text-[10px] uppercase tracking-widest text-ink-muted font-semibold flex items-center gap-2">
                    <span>Extracted Data</span>
                    <div className="flex-1 h-px bg-bg-border" />
                    <button onClick={() => setEditMode(!editMode)} className={clsx("flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] transition-all", editMode ? "border-amber-muted/40 text-amber-glow bg-amber-subtle" : "border-bg-border text-ink-muted hover:text-ink-secondary")}>
                      <Edit3 size={9} /> {editMode ? "Editing" : "Edit"}
                    </button>
                  </div>

                  {/* Responsible Entity */}
                  <div>
                    <label className="text-[10px] text-ink-muted mb-1 block">Responsible Entity (Normalized)</label>
                    {editMode ? (
                      <input
                        value={activeState.responsible_entity}
                        onChange={e => handleFieldChange("responsible_entity", e.target.value)}
                        className="w-full bg-bg-elevated border border-bg-border-light rounded-md px-3 py-2 text-[12px] text-ink-primary focus:border-amber-muted/50 transition-colors"
                      />
                    ) : (
                      <div className="text-[13px] font-semibold text-ink-primary leading-snug">
                        {activeState.responsible_entity || "Unknown"}
                      </div>
                    )}
                  </div>

                  {/* Directive Text */}
                  <div>
                    <label className="text-[10px] text-ink-muted mb-1 block">Full Directive Text</label>
                    {editMode ? (
                      <textarea
                        value={activeState.directive_text}
                        onChange={e => handleFieldChange("directive_text", e.target.value)}
                        rows={4}
                        className="w-full bg-bg-elevated border border-bg-border-light rounded-md px-3 py-2 text-[12px] text-ink-primary leading-relaxed resize-none focus:border-amber-muted/50 transition-colors"
                      />
                    ) : (
                      <div className="text-[12px] text-ink-secondary leading-relaxed bg-bg-surface border border-bg-border rounded-md px-3 py-2.5">
                        {activeState.directive_text}
                      </div>
                    )}
                  </div>

                  {/* Deadline & Appeal Toggle */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-ink-muted mb-1 block">Deadline (YYYY-MM-DD)</label>
                      {editMode ? (
                        <input
                          type="date"
                          value={activeState.deadline}
                          onChange={e => handleFieldChange("deadline", e.target.value)}
                          className="w-full bg-bg-elevated border border-bg-border-light rounded-md px-3 py-2 text-[12px] text-ink-primary font-mono focus:border-amber-muted/50 transition-colors"
                        />
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-[12px] font-mono font-medium" style={{ color: dCfg.color, background: dCfg.bg, borderColor: dCfg.color + "33" }}>
                          <Clock size={11} /> {activeState.deadline || "None"} ({dCfg.label})
                        </div>
                      )}
                    </div>
                    <div>
                      <label className="text-[10px] text-ink-muted mb-1 block">Appeal Flag</label>
                      {editMode ? (
                         <select
                         value={activeState.appeal_flag ? "true" : "false"}
                         onChange={e => handleFieldChange("appeal_flag", e.target.value === "true")}
                         className="w-full bg-bg-elevated border border-bg-border-light rounded-md px-3 py-2 text-[12px] text-ink-primary focus:border-amber-muted/50 transition-colors"
                       >
                         <option value="false">No Active Appeal</option>
                         <option value="true">Under Appeal (Freeze)</option>
                       </select>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border text-[12px] font-mono font-medium border-bg-border text-ink-secondary bg-bg-surface">
                          {activeState.appeal_flag ? "⚖️ Under Appeal" : "✅ No Appeal"}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {editMode && (
                  <button onClick={handleSaveEdit} className="w-full flex items-center justify-center gap-2 py-2 bg-amber-subtle border border-amber-muted/30 text-amber-glow text-[12px] font-semibold rounded-md hover:bg-amber-muted/15 transition-all">
                    <Save size={13} /> Save Changes Locally
                  </button>
                )}

                {/* ── AI Action Plan Preview (Layer 3) ── */}
                {activeDirective.action_plan && (
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-ink-muted font-semibold flex items-center justify-between mb-3 mt-4">
                      <span className="flex items-center gap-1.5 text-amber-glow"><Zap size={11} /> AI Action Plan</span>
                      <div className="flex-1 h-px bg-bg-border mx-3" />
                      {activeDirective.action_plan.generation_time_seconds > 0 && (
                        <span className="text-[9px] font-mono text-ink-muted bg-bg-elevated px-1.5 py-0.5 rounded border border-bg-border">
                          {activeDirective.action_plan.generation_source === "llm" ? "Generated in " : "Fallback in "} 
                          {activeDirective.action_plan.generation_time_seconds}s
                        </span>
                      )}
                    </div>
                    <div className="bg-bg-surface border border-bg-border rounded-lg p-3 space-y-2">
                       <p className="text-[12px] text-ink-primary font-medium">{activeDirective.action_plan.action}</p>
                       <ul className="text-[11px] text-ink-secondary space-y-1.5 list-disc pl-4 mt-2">
                         {activeDirective.action_plan.compliance_steps.map((step, idx) => (
                           <li key={idx}>{step}</li>
                         ))}
                       </ul>
                    </div>
                  </div>
                )}

                {/* ── Reviewer actions ── */}
                {activeState.status === "pending" && (
                  <div>
                    <div className="text-[10px] uppercase tracking-widest text-ink-muted font-semibold flex items-center gap-2 mb-3 mt-4">
                      <span>Reviewer Actions</span>
                      <div className="flex-1 h-px bg-bg-border" />
                    </div>

                    <div className="flex gap-2">
                      <button onClick={handleApprove} disabled={saving} className="btn-approve flex-1 flex items-center justify-center gap-2 py-2.5 bg-verdict-green-bg border border-verdict-green/30 text-verdict-green text-[13px] font-semibold rounded-lg hover:bg-verdict-green/15 transition-all disabled:opacity-50">
                        {saving ? <Loader2 size={13} className="animate-spin" /> : <CheckCircle2 size={13} />}
                        Approve {activeState.edited ? "& Save Edits" : ""}
                      </button>
                      <button onClick={() => setShowRejectInput(!showRejectInput)} disabled={saving} className="btn-reject flex-1 flex items-center justify-center gap-2 py-2.5 bg-verdict-red-bg border border-verdict-red/30 text-verdict-red text-[13px] font-semibold rounded-lg hover:bg-verdict-red/15 transition-all disabled:opacity-50">
                        <XCircle size={13} /> Reject
                      </button>
                    </div>

                    {showRejectInput && (
                      <div className="mt-3 space-y-2 animate-slide-up">
                        <input autoFocus value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Reason for rejection (required)…" className="w-full bg-bg-elevated border border-verdict-red/25 rounded-md px-3 py-2 text-[12px] text-ink-primary placeholder:text-ink-muted" />
                        <button onClick={handleReject} disabled={!rejectReason.trim() || saving} className="w-full flex items-center justify-center gap-1.5 py-2 bg-verdict-red/10 border border-verdict-red/30 text-verdict-red text-[12px] font-semibold rounded-md hover:bg-verdict-red/15 transition-all disabled:opacity-40">
                          {saving ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />} Confirm Rejection
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between pt-4 border-t border-bg-border mt-4">
                  <button onClick={() => setActiveIdx(i => Math.max(0, i - 1))} disabled={activeIdx === 0} className="flex items-center gap-1 text-[11px] text-ink-secondary hover:text-ink-primary disabled:opacity-30 transition-colors">
                    <ChevronLeft size={13} /> Prev
                  </button>
                  <span className="text-[10px] font-mono text-ink-muted">{activeIdx + 1} / {directives.length}</span>
                  <button onClick={() => setActiveIdx(i => Math.min(directives.length - 1, i + 1))} disabled={activeIdx === directives.length - 1} className="flex items-center gap-1 text-[11px] text-ink-secondary hover:text-ink-primary disabled:opacity-30 transition-colors">
                    Next <ChevronRight size={13} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}