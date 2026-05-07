"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Scale, LayoutDashboard, ChevronLeft, ExternalLink,
  CheckCircle2, AlertCircle, Clock, Filter, Search, ChevronRight,
  Bell, Database, SortAsc, SortDesc, Loader2
} from "lucide-react";
import clsx from "clsx";

import { DashboardRow, DashboardResponse } from "@/lib/types";
import { calculateDaysLeft, getDaysLeftConfig, getConfidenceConfig } from "@/lib/ui-config";
import { API_BASE } from "@/lib/api";

type ComplianceStatus = "pending_review" | "pending" | "complied" | "overdue" | "rejected";
type SortField = "days_left" | "case_number" | "confidence_score";
type SortDir = "asc" | "desc";
type UrgencyFilter = "all" | "Red" | "Yellow" | "Green";

export default function Dashboard() {
  const router = useRouter();

  // ── True Backend State ──
  const [rows, setRows] = useState<DashboardRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // ── UI Filter State ──
  const [search, setSearch] = useState("");
  const [courtFilter, setCourtFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<ComplianceStatus | "all">("all");
  const [urgencyFilter, setUrgencyFilter] = useState<UrgencyFilter>("all");
  const [sortField, setSortField] = useState<SortField>("days_left");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  // ── 1. Fetch Dashboard Rows from FastAPI ──
  const loadDashboardData = useCallback(async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/dashboard`);
      if (!res.ok) throw new Error("Failed to fetch dashboard data");
      
      const data: DashboardResponse = await res.json();
      setRows(data.directives);
      setError(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      if (showLoader) setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData(true);
  }, [loadDashboardData]);

  // ── 2. Derive Unique Courts for Dropdown ──
  const courts = useMemo(() => {
    const s = new Set<string>();
    rows.forEach(r => { if (r.court) s.add(r.court); });
    return Array.from(s);
  }, [rows]);

  // ── 3. Apply Search, Filters, and Sorting ──
  const filtered = useMemo(() => {
    let arr = [...rows];
    
    // Search Filter
    if (search) {
      const q = search.toLowerCase();
      arr = arr.filter(r =>
        (r.case_number && r.case_number.toLowerCase().includes(q)) ||
        (r.directive_summary && r.directive_summary.toLowerCase().includes(q)) ||
        (r.court && r.court.toLowerCase().includes(q)) ||
        (r.department && r.department.toLowerCase().includes(q))
      );
    }
    
    // Court & Status Filters
    if (courtFilter !== "all") arr = arr.filter(r => r.court === courtFilter);
    if (statusFilter !== "all") arr = arr.filter(r => r.status === statusFilter);
    
    // Float-based Urgency Filter
    if (urgencyFilter !== "all") {
      arr = arr.filter(r => {
        const score = r.confidence_score || 0;
        if (urgencyFilter === "Red") return score < 0.60;
        if (urgencyFilter === "Yellow") return score >= 0.60 && score < 0.85;
        if (urgencyFilter === "Green") return score >= 0.85;
        return true;
      });
    }

    // Dynamic Sorting
    arr.sort((a, b) => {
      let val = 0;
      if (sortField === "days_left") {
        const daysA = calculateDaysLeft(a.deadline);
        const daysB = calculateDaysLeft(b.deadline);
        val = daysA - daysB;
      } 
      else if (sortField === "case_number") {
        val = (a.case_number || "").localeCompare(b.case_number || "");
      } 
      else if (sortField === "confidence_score") {
        val = (a.confidence_score || 0) - (b.confidence_score || 0);
      }
      return sortDir === "asc" ? val : -val;
    });
    
    return arr;
  }, [rows, search, courtFilter, statusFilter, urgencyFilter, sortField, sortDir]);

  // ── 4. True Backend "Mark Complied" PATCH ──
  async function markComplied(id: number) {
    setUpdatingId(id);
    try {
      const res = await fetch(`${API_BASE}/api/dashboard/${id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          status: "complied",
          reviewer_id: "demo_officer" 
        })
      });
      
      if (!res.ok) throw new Error("Failed to update status");
      
      await loadDashboardData(false);
      
    } catch (err) {
      console.error("Status update error:", err);
      alert("Failed to update compliance status."); 
    } finally {
      setUpdatingId(null);
    }
  }

  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  }

  const SortIcon = ({ field }: { field: SortField }) =>
    sortField === field
      ? (sortDir === "asc" ? <SortAsc size={11} /> : <SortDesc size={11} />)
      : <SortAsc size={11} className="opacity-30" />;

  // ── Dynamic Statistics ──
  const totalRows = rows.length;
  const redCount = rows.filter(r => (r.confidence_score || 0) < 0.60).length;
  const overdueCount = rows.filter(r => r.status === "overdue" || calculateDaysLeft(r.deadline) < 0).length;
  const compliedCount = rows.filter(r => r.status === "complied").length;
  const complianceRate = totalRows ? Math.round((compliedCount / totalRows) * 100) : 0;

  if (loading) {
    return (
      <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center">
        <Loader2 size={32} className="text-amber-glow animate-spin mb-4" />
        {/* FIX: Updated Loading Text */}
        <p className="text-ink-secondary text-sm font-mono">Loading Compliance Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-bg-border bg-bg-secondary/90 backdrop-blur-md h-14 flex items-center px-5">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/")} className="flex items-center gap-1.5 text-ink-secondary hover:text-ink-primary text-[12px] transition-colors">
            <ChevronLeft size={13} />
          </button>
          <div className="w-px h-4 bg-bg-border" />
          <Scale size={15} className="text-amber-glow" />
          <span className="font-display text-[14px] font-medium text-ink-primary">
            Adhikar<span className="text-amber-glow">AI</span>
          </span>
          <div className="w-px h-4 bg-bg-border mx-1" />
          <LayoutDashboard size={13} className="text-ink-muted" />
          <span className="text-[13px] text-ink-secondary font-medium">Trusted Dashboard</span>
          {/* FIX: Updated Badge Text to accurately reflect the dashboard's scope */}
          <span className="text-[10px] font-mono bg-verdict-green-bg text-verdict-green border border-verdict-green/20 px-1.5 py-0.5 rounded ml-1">Review & Compliance</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <button className="relative p-2 rounded-md hover:bg-bg-elevated text-ink-muted hover:text-ink-primary transition-colors">
            <Bell size={14} />
            {overdueCount > 0 && <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-verdict-red" />}
          </button>
        </div>
      </header>

      <main className="max-w-screen-xl mx-auto px-5 py-8">
        {error && (
          <div className="mb-6 p-4 bg-verdict-red-bg border border-verdict-red/30 rounded-lg flex items-center gap-3 text-verdict-red text-sm font-medium">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Directives", value: totalRows, color: "#e2e8f4", sub: "across all cases" },
            { label: "High Urgency 🔴", value: redCount, color: "#f87171", sub: "require immediate action" },
            { label: "Overdue / Immediate", value: overdueCount, color: "#fc8181", sub: "0 days left or past due" },
            { label: "Compliance Rate", value: `${complianceRate}%`, color: "#10d9a8", sub: `${compliedCount} of ${totalRows} complied` },
          ].map(s => (
            <div key={s.label} className="bg-bg-surface border border-bg-border rounded-xl px-4 py-4 shadow-sm">
              <div className="text-[22px] font-mono font-semibold mb-0.5" style={{ color: s.color }}>{s.value}</div>
              <div className="text-[12px] font-medium text-ink-primary">{s.label}</div>
              <div className="text-[11px] text-ink-muted mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-muted" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search cases, directives, departments…"
              className="w-full bg-bg-surface border border-bg-border rounded-lg pl-8 pr-3 py-2 text-[12px] text-ink-primary placeholder:text-ink-muted focus:border-amber-muted/40 transition-colors"
            />
          </div>
          <div className="flex items-center gap-2 text-[11px] text-ink-muted"><Filter size={11} /></div>
          
          <select value={courtFilter} onChange={e => setCourtFilter(e.target.value)} className="bg-bg-surface border border-bg-border rounded-lg px-3 py-2 text-[12px] text-ink-secondary focus:border-amber-muted/40 transition-colors">
            <option value="all">All Courts</option>
            {courts.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as ComplianceStatus | "all")} className="bg-bg-surface border border-bg-border rounded-lg px-3 py-2 text-[12px] text-ink-secondary focus:border-amber-muted/40 transition-colors">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="complied">Complied</option>
            <option value="overdue">Overdue</option>
            <option value="rejected">Rejected</option>
          </select>
          
          <div className="flex items-center gap-1 border border-bg-border rounded-lg overflow-hidden bg-bg-surface">
            {(["all", "Red", "Yellow", "Green"] as const).map(u => (
              <button
                key={u}
                onClick={() => setUrgencyFilter(u)}
                className={clsx(
                  "px-2.5 py-1.5 text-[11px] font-mono transition-all",
                  urgencyFilter === u
                    ? u === "Red" ? "bg-red-900/30 text-verdict-red"
                      : u === "Yellow" ? "bg-yellow-900/20 text-verdict-yellow"
                        : u === "Green" ? "bg-verdict-green-bg text-verdict-green"
                          : "bg-bg-elevated text-ink-primary"
                    : "text-ink-muted hover:text-ink-secondary"
                )}
              >
                {u === "all" ? "All" : u === "Red" ? "🔴" : u === "Yellow" ? "🟡" : "🟢"}
              </button>
            ))}
          </div>
          <span className="text-[11px] font-mono text-ink-muted ml-auto">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
        </div>

        {/* Table */}
        <div className="bg-bg-surface border border-bg-border rounded-xl overflow-hidden shadow-sm">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="border-b border-bg-border bg-bg-secondary/50">
                {([
                  { label: "Case #", field: "case_number" as SortField, w: "w-[130px]" },
                  { label: "Court / Dept", field: null, w: "w-[180px]" },
                  { label: "Directive", field: null, w: "" },
                  { label: "Urgency", field: "confidence_score" as SortField, w: "w-[100px]" },
                  { label: "Days Left", field: "days_left" as SortField, w: "w-[130px]" },
                  { label: "Status", field: null, w: "w-[110px]" },
                  { label: "", field: null, w: "w-[130px]" },
                ] as { label: string; field: SortField | null; w: string }[]).map(col => (
                  <th
                    key={col.label}
                    className={clsx("text-left px-4 py-3 text-[10px] font-semibold uppercase tracking-wider text-ink-muted select-none", col.w, col.field ? "cursor-pointer hover:text-ink-secondary" : "")}
                    onClick={() => col.field && toggleSort(col.field)}
                  >
                    <span className="flex items-center gap-1">
                      {col.label}
                      {col.field && <SortIcon field={col.field} />}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-bg-border">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-ink-muted text-[12px]">
                    <Database size={24} className="mx-auto mb-2 opacity-30" />
                    No directives match your filters
                  </td>
                </tr>
              )}
              {filtered.map((row, i) => {
                const numericDaysLeft = calculateDaysLeft(row.deadline);
                const dcfg = getDaysLeftConfig(numericDaysLeft);
                const confCfg = getConfidenceConfig(row.confidence_score);
                const isComplied = row.status === "complied";
                
                const isReviewed = 
                  row.status === "verified" || 
                  row.status === "complied" || 
                  row.status === "rejected";
                
                const isUpdating = updatingId === row.id;

                return (
                  <tr key={`${row.id}-${i}`} className={clsx("transition-colors hover:bg-bg-elevated/50", isComplied ? "opacity-50" : "")}>
                    <td className="px-4 py-3">
                      <span className="font-mono text-amber-glow text-[11px]">{row.case_number}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-ink-primary text-[11px] truncate block max-w-[170px]" title={row.court}>{row.court}</span>
                      <span className="text-ink-muted text-[10px] truncate block max-w-[170px] mt-0.5" title={row.department || "Unknown Dept"}>{row.department || "Unknown Dept"}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-ink-muted flex-shrink-0">DIR-{row.id}</span>
                        <span className="text-ink-primary leading-snug">{row.directive_summary}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-[10px] font-mono" style={{ color: confCfg.color }}>
                        {confCfg.emoji} {(row.confidence_score * 100).toFixed(0)}%
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {isComplied ? (
                        <span className="flex items-center gap-1 text-verdict-green text-[11px] font-mono"><CheckCircle2 size={11} /> Done</span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-[11px] font-mono font-medium px-2 py-0.5 rounded border"
                          style={{ color: dcfg.color, background: dcfg.bg, borderColor: dcfg.color + "33" }}
                        >
                          {numericDaysLeft <= 0 ? <AlertCircle size={10} /> : <Clock size={10} />}
                          {row.days_left_label}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx(
                        "text-[10px] font-mono px-2 py-0.5 rounded border", 
                        isComplied || row.status === "verified" ? "bg-verdict-green-bg border-verdict-green/30 text-verdict-green" : 
                        row.status === "overdue" || row.status === "rejected" ? "bg-verdict-red-bg border-verdict-red/30 text-verdict-red" : 
                        "bg-bg-elevated border-bg-border text-ink-secondary"
                      )}>
                        {isComplied ? "✅ Complied" : 
                         row.status === "verified" ? "✅ Verified" : 
                         row.status === "rejected" ? "❌ Rejected" :
                         row.status === "overdue" ? "❌ Overdue" : "⏳ Pending"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        
                        {row.status === "verified" && (
                          <button 
                            onClick={() => markComplied(row.id)} 
                            disabled={isUpdating}
                            className="flex items-center justify-center gap-1 px-2 py-1 min-w-[75px] text-[10px] font-medium rounded border border-verdict-green/20 text-verdict-green hover:bg-verdict-green-bg transition-all disabled:opacity-50"
                          >
                            {isUpdating ? <Loader2 size={9} className="animate-spin" /> : <CheckCircle2 size={9} />} 
                            {isUpdating ? "Saving..." : "Mark Done"}
                          </button>
                        )}
                        
                        <button 
                          onClick={() => router.push(`/review/${row.case_id}`)} 
                          disabled={isReviewed}
                          className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium rounded border border-bg-border text-ink-muted hover:text-ink-secondary hover:border-bg-border-light transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:text-ink-muted disabled:hover:border-bg-border"
                        >
                          <ExternalLink size={9} /> {isReviewed ? "Reviewed" : "Review"}
                        </button>

                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-5 flex flex-wrap items-center gap-4 text-[10px] text-ink-muted">
          <span className="font-semibold text-ink-secondary">Legend:</span>
          <span>❌ Overdue/0d</span>
          <span>⚠️ 1–3d</span>
          <span>⚡ 4–7d</span>
          <span>✅ 8d+</span>
          <div className="ml-auto flex items-center gap-1">
            <button onClick={() => router.push("/")} className="text-amber-glow hover:underline flex items-center gap-1">
              Process new case <ChevronRight size={10} />
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}