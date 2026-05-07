export function getConfidenceConfig(score: number) {
  if (score >= 0.85) return { color: "#10d9a8", emoji: "🟢", label: "High Confidence" };
  if (score >= 0.60) return { color: "#f5a623", emoji: "🟡", label: "Review Recommended" };
  return { color: "#ff5e5e", emoji: "🔴", label: "Action Required" };
}

export function calculateDaysLeft(deadlineIso: string | null): number {
  if (!deadlineIso) return 0;
  const target = new Date(deadlineIso);
  const today = new Date();
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

export function getDaysLeftConfig(days: number) {
  if (days < 0) return { color: "#ff5e5e", bg: "#ff5e5e15", label: "Overdue" };
  if (days <= 3) return { color: "#ff5e5e", bg: "#ff5e5e15", label: `${days} Days Left` };
  if (days <= 7) return { color: "#f5a623", bg: "#f5a62315", label: `${days} Days Left` };
  return { color: "#10d9a8", bg: "#10d9a815", label: `${days} Days Left` };
}