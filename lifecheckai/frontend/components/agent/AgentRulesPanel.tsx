"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Activity, CheckCircle2, Lock, Shield, ShieldCheck, XCircle } from "lucide-react";

export interface AgentAction {
  timestamp: Date;
  actionType: string;
  decision: "ALLOWED" | "BLOCKED";
  reason?: string;
}

interface AgentRulesPanelProps {
  actions: AgentAction[];
  lastConfidence?: number;
  isActive: boolean;
  className?: string;
}

const allowed = [
  "Answer air quality questions",
  "Provide weather safety advice",
  "Recommend precautions for health conditions",
  "Explain AQI pollutant sources",
  "Suggest safe outdoor activity windows",
  "Alert about government health warnings",
  "Provide emergency contact information",
];

const blocked = [
  "Provide medical diagnosis",
  "Guarantee predictions beyond 6 hours",
  "Share personal user data",
  "Make political statements about pollution",
  "Recommend specific medications",
  "Override official government warnings",
];

export function AgentRulesPanel({ actions, lastConfidence, isActive, className = "" }: AgentRulesPanelProps) {
  const rawConfidence = lastConfidence ?? 0;
  const normalizedConfidence = rawConfidence <= 1 ? rawConfidence * 100 : rawConfidence;
  const confidence = Math.max(0, Math.min(100, Math.round(normalizedConfidence)));
  const confidenceColor = confidence >= 80 ? "bg-safe" : confidence >= 50 ? "bg-caution" : "bg-unsafe";
  const confidenceLabel = confidence >= 80 ? "High confidence" : confidence >= 50 ? "Moderate confidence" : "Low confidence";
  const recentActions = actions.slice(0, 10);
  const blockedCount = actions.filter((item) => item.decision === "BLOCKED").length;
  const allowedCount = actions.length - blockedCount;

  return (
    <aside className={`sticky top-20 h-fit w-[320px] shrink-0 rounded-2xl border border-border-default bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.14),rgba(10,16,33,0.94)_40%)] p-5 shadow-[0_18px_60px_rgba(2,8,23,0.45)] ${className}`}>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="inline-flex items-center gap-2 text-sm font-semibold text-text-primary">
          <Shield size={16} className="text-accent-cyan" />
          Safety Agent Rules
        </h3>
        <span className="rounded-full border border-accent-cyan/30 bg-accent-cyan/10 px-2 py-0.5 text-[10px] uppercase tracking-wide text-accent-cyan">
          ArmorIQ
        </span>
      </div>

      <div className="mb-4 rounded-xl border border-white/10 bg-bg-card/70 p-3">
        <div className="flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-[0.18em] text-text-muted">Runtime Status</p>
          <span
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] uppercase ${
              isActive
                ? "border-safe/30 bg-safe/10 text-safe"
                : "border-border-default bg-bg-muted text-text-secondary"
            }`}
          >
            <Activity size={11} className={isActive ? "animate-pulse" : ""} />
            {isActive ? "Analyzing" : "Idle"}
          </span>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          <div className="rounded-lg border border-border-default bg-bg-muted/60 px-2 py-1.5">
            <div className="text-[10px] uppercase tracking-wide text-text-muted">Total</div>
            <div className="text-sm font-semibold text-text-primary">{actions.length}</div>
          </div>
          <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-2 py-1.5">
            <div className="text-[10px] uppercase tracking-wide text-emerald-300">Allowed</div>
            <div className="text-sm font-semibold text-emerald-200">{allowedCount}</div>
          </div>
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-2 py-1.5">
            <div className="text-[10px] uppercase tracking-wide text-red-300">Blocked</div>
            <div className="text-sm font-semibold text-red-200">{blockedCount}</div>
          </div>
        </div>
      </div>

      <section className="pb-4 border-b border-border-default">
        <p className="mb-3 text-xs uppercase tracking-widest text-text-muted">What ArmorIQ Can Do</p>
        <div className="space-y-2">
          {allowed.map((item) => (
            <p key={item} className="inline-flex items-start gap-2 text-sm text-emerald-300">
              <ShieldCheck size={14} className="mt-0.5 shrink-0" />
              <span>{item}</span>
            </p>
          ))}
        </div>
      </section>

      <section className="py-4 border-b border-border-default">
        <p className="mb-3 text-xs uppercase tracking-widest text-text-muted">What ArmorIQ Will Block</p>
        <div className="space-y-2">
          {blocked.map((item) => (
            <p key={item} className="inline-flex items-start gap-2 text-sm text-red-300">
              <Lock size={14} className="mt-0.5 shrink-0" />
              <span>{item}</span>
            </p>
          ))}
        </div>
      </section>

      <section className="py-4 border-b border-border-default">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-text-muted">Live Action Log</p>
          <span className="text-[10px] text-text-muted">Last {recentActions.length}</span>
        </div>
        <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
          {recentActions.length === 0 && (
            <p className="rounded-lg border border-dashed border-border-default p-3 text-xs text-text-muted">
              No actions yet. Send a message to see live rule decisions.
            </p>
          )}
          <AnimatePresence>
            {recentActions.map((action, idx) => (
              <motion.div
                key={`${action.timestamp.toISOString()}-${idx}`}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="rounded-lg border border-border-default bg-bg-muted/50 p-2.5 text-xs"
              >
                <p className="font-family-mono text-text-secondary">
                  {action.timestamp.toLocaleTimeString()} · {action.actionType}
                </p>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={`inline-flex items-center gap-1 rounded border px-2 py-0.5 text-[10px] ${
                      action.decision === "ALLOWED"
                        ? "border-emerald-700 bg-emerald-950 text-emerald-300"
                        : "border-red-700 bg-red-950 text-red-300"
                    }`}
                  >
                    {action.decision === "ALLOWED" ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                    {action.decision}
                  </span>
                  {action.reason && <span className="text-[11px] text-text-muted">{action.reason}</span>}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </section>

      <section className="pt-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs uppercase tracking-widest text-text-muted">Confidence Score</p>
          <span className="text-xs text-text-secondary">{confidenceLabel}</span>
        </div>
        <p className="mb-2 text-sm text-text-secondary">Last response confidence: {confidence}%</p>
        <div className="h-2 w-full overflow-hidden rounded-full bg-border-default">
          <motion.div
            className={`h-full ${confidenceColor}`}
            initial={{ width: 0 }}
            animate={{ width: `${confidence}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </section>
    </aside>
  );
}
