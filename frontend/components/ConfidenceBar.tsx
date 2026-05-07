"use client";

import { useEffect, useState } from "react";
import { getConfidenceConfig } from "@/lib/ui-config";

interface ConfidenceBarProps {
  score: number; // Float 0.0 to 1.0 from FastAPI Layer 4
  label?: string;
  showLabel?: boolean;
  animate?: boolean;
}

export default function ConfidenceBar({
  score,
  label,
  showLabel = true,
  animate = true,
}: ConfidenceBarProps) {
  const cfg = getConfidenceConfig(score);
  const targetPct = Math.round(score * 100);
  const [width, setWidth] = useState(animate ? 0 : targetPct);

  useEffect(() => {
    if (!animate) return;
    const t = setTimeout(() => setWidth(targetPct), 100);
    return () => clearTimeout(t);
  }, [score, animate, targetPct]);

  return (
    <div className="space-y-1.5">
      {showLabel && (
        <div className="flex items-center justify-between text-[11px]">
          <span className="text-ink-secondary">{label ?? cfg.label}</span>
          <span className="font-mono font-medium" style={{ color: cfg.color }}>
            {cfg.emoji} {targetPct}%
          </span>
        </div>
      )}
      <div className="h-1.5 bg-bg-elevated rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700 ease-out"
          style={{
            width: `${width}%`,
            background: cfg.color,
            boxShadow: `0 0 6px ${cfg.color}60`,
          }}
        />
      </div>
    </div>
  );
}

export function ConfidenceBadge({ score }: { score: number }) {
  const cfg = getConfidenceConfig(score);
  const targetPct = Math.round(score * 100);
  
  return (
    <span
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-medium border"
      style={{ color: cfg.color, background: `${cfg.color}15`, borderColor: `${cfg.color}40` }}
    >
      {cfg.emoji} {targetPct}%
    </span>
  );
}