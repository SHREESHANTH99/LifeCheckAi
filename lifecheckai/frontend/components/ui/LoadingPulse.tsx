"use client";

import { motion } from "framer-motion";

interface LoadingPulseProps {
  text?: string;
  inline?: boolean;
}

export function LoadingPulse({ text = "Analyzing conditions...", inline = false }: LoadingPulseProps) {
  if (inline) {
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-6">
        <motion.div
          className="w-16 h-16 rounded-full bg-accent-blue/20 border-2 border-accent-blue/40"
          animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
        <p className="text-text-secondary text-sm">{text}</p>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg-primary/90 backdrop-blur-sm">
      <motion.div
        className="w-24 h-24 rounded-full bg-accent-blue/20 border-2 border-accent-blue/40"
        animate={{ scale: [1, 1.15, 1], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.p
        className="text-text-secondary text-lg mt-8"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        {text}
      </motion.p>
    </div>
  );
}
