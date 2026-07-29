"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { showToast } from "@/components/ui/Toast";

interface CrowdReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  lat: number;
  lon: number;
  city: string;
  onSubmit: (report: {
    city: string;
    lat: number;
    lon: number;
    type: "smoke" | "flood" | "dust_storm" | "chemical" | "road_block" | "safe_zone";
    description: string;
  }) => Promise<unknown>;
}

const REPORT_TYPES = [
  { id: "smoke", emoji: "🔥", label: "Smoke/Fire" },
  { id: "flood", emoji: "🌊", label: "Flooding" },
  { id: "dust_storm", emoji: "💨", label: "Dust Storm" },
  { id: "chemical", emoji: "⚠️", label: "Chemical Smell" },
  { id: "road_block", emoji: "🚧", label: "Road Block" },
  { id: "safe_zone", emoji: "✅", label: "Safe Zone" },
] as const;

export function CrowdReportModal({ isOpen, onClose, lat, lon, city, onSubmit }: CrowdReportModalProps) {
  const [type, setType] = useState<(typeof REPORT_TYPES)[number]["id"]>("smoke");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const count = useMemo(() => description.length, [description]);

  const submit = async () => {
    if (submitting) return;
    setSubmitting(true);
    await onSubmit({ city, lat, lon, type, description: description.trim() });
    setSubmitting(false);
    showToast("success", "Report submitted! Others can see it now.");
    setDescription("");
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 16 }}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-border-default bg-bg-card p-5"
          >
            <h3 className="text-lg font-semibold text-text-primary mb-4">Report Condition</h3>

            <div className="grid grid-cols-3 gap-2 mb-4">
              {REPORT_TYPES.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setType(item.id)}
                  className={`rounded-xl border min-h-16 px-2 py-2 text-center cursor-pointer ${
                    type === item.id
                      ? "border-accent-blue bg-accent-blue/10"
                      : "border-border-default bg-bg-secondary/40"
                  }`}
                >
                  <p className="text-lg">{item.emoji}</p>
                  <p className="text-[10px] text-text-secondary mt-1">{item.label}</p>
                </button>
              ))}
            </div>

            <textarea
              value={description}
              maxLength={120}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe what you see (optional)..."
              className="w-full h-24 rounded-xl border border-border-default bg-bg-secondary/40 p-3 text-sm outline-none focus:border-accent-blue"
            />
            <div className="mt-2 flex items-center justify-between text-xs text-text-muted">
              <span>{city}</span>
              <span>{count}/120</span>
            </div>

            <button
              onClick={submit}
              disabled={submitting}
              className="mt-4 w-full min-h-11 rounded-xl bg-gradient-to-r from-accent-blue to-accent-primary text-white text-sm font-semibold cursor-pointer disabled:opacity-50"
            >
              {submitting ? "Submitting..." : "Submit Report"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
