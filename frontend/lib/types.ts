export type ReviewStatus = "pending" | "verified" | "rejected";

export interface BackendActionPlan {
  status: string;
  action: string;
  department: string;
  timeline_days: number;
  nature: string;
  appeal_consideration: string;
  compliance_steps: string[];
  generation_source: string;
  generation_time_seconds: number;
}

export interface BackendDirective {
  id: number;
  member1_id: string | null;
  directive_text: string;
  responsible_entity: string | null;
  deadline: string | null; // YYYY-MM-DD
  appeal_flag: boolean;
  ambiguity_flag: boolean;
  ambiguity_reason: string | null;
  directive_confidence_score: number; // 0.0 to 1.0
  source_page: number;
  status: ReviewStatus;
  action_plan: BackendActionPlan | null;
}

export interface BackendCaseData {
  case_id: number;
  total: number;
  reviewed: number;
  directives: BackendDirective[];
}

export type DirectiveState = {
  status: ReviewStatus;
  edited: boolean;
  directive_text: string;
  responsible_entity: string;
  deadline: string;
  appeal_flag: boolean;
  rejectionReason?: string;
};

// ── Dashboard Types ──

export interface DashboardRow {
  id: number;
  case_id: number; // <-- FIXED: Added missing case_id for routing
  case_number: string;
  court: string;
  directive_summary: string;
  department: string | null;
  deadline: string | null; // YYYY-MM-DD
  days_left_label: string;
  status: "pending_review" | "pending" | "complied" | "overdue"; // <-- FIXED: Strict Literal Types
  appeal_flag: boolean;
  confidence_score: number; // 0.0 to 1.0
}

export interface DashboardResponse {
  total: number;
  directives: DashboardRow[];
}