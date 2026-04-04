"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, XCircle, Shield } from "lucide-react";

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

export function AgentRulesPanel({ actions, lastConfidence, isActive }: AgentRulesPanelProps) {
  const confidence = Math.round((lastConfidence || 0) * 100);
  const confidenceColor = confidence > 80 ? "bg-safe" : confidence >= 50 ? "bg-caution" : "bg-unsafe";

  return (
    <aside className="w-[300px] shrink-0 rounded-xl border border-border-default bg-bg-card p-5 sticky top-20 h-fit">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-text-primary inline-flex items-center gap-2">
          <Shield size={16} className="text-accent-cyan" />
          Safety Agent Rules
        </h3>
        <span className="text-[10px] border border-border-default px-2 py-0.5 rounded text-text-muted">ArmorIQ</span>
      </div>

      <section className="pb-4 border-b border-border-default">
        <p className="text-xs uppercase tracking-widest text-text-muted mb-3">Agent Capabilities</p>
        <div className="space-y-2">
          {allowed.map((item) => (
            <p key={item} className="text-sm text-green-400 inline-flex gap-2 items-start">
              <CheckCircle2 size={14} className="mt-0.5" /> {item}
            </p>
          ))}
        </div>
      </section>

      <section className="py-4 border-b border-border-default">
        <p className="text-xs uppercase tracking-widest text-text-muted mb-3">Blocked Actions</p>
        <div className="space-y-2">
          {blocked.map((item) => (
            <p key={item} className="text-sm text-red-400 inline-flex gap-2 items-start">
              <XCircle size={14} className="mt-0.5" /> {item}
            </p>
          ))}
        </div>
      </section>

      <section className="py-4 border-b border-border-default">
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs uppercase tracking-widest text-text-muted">Live Action Log</p>
          {isActive && <span className="text-[10px] text-accent-cyan">Analyzing...</span>}
        </div>
        <div className="max-h-52 overflow-y-auto space-y-2">
          {actions.length === 0 && <p className="text-xs text-text-muted">No actions yet. Start chatting.</p>}
          <AnimatePresence>
            {actions.slice(0, 10).map((action, idx) => (
              <motion.div
                key={`${action.timestamp.toISOString()}-${idx}`}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                className="text-xs font-family-mono border border-border-default rounded-lg p-2"
              >
                <p className="text-text-secondary">
                  {action.timestamp.toLocaleTimeString()} · {action.actionType}
                </p>
                <span
                  className={`mt-1 inline-block text-[10px] px-2 py-0.5 rounded border ${
                    action.decision === "ALLOWED"
                      ? "bg-green-950 text-green-400 border-green-800"
                      : "bg-red-950 text-red-400 border-red-800"
                  }`}
                >
                  {action.decision}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </section>

      <section className="pt-4">
        <p className="text-xs uppercase tracking-widest text-text-muted mb-2">Confidence Score</p>
        <p className="text-sm text-text-secondary mb-2">Last response confidence: {confidence}%</p>
        <div className="w-full h-2 rounded-full bg-border-default overflow-hidden">
          <motion.div
            className={`h-full ${confidenceColor}`}
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(0, Math.min(100, confidence))}%` }}
            transition={{ duration: 0.5 }}
          />
        </div>
      </section>
    </aside>
  );
}
