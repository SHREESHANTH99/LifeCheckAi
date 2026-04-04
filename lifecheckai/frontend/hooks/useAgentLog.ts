"use client";

import { useCallback, useState } from "react";
import type { AgentAction } from "@/components/agent/AgentRulesPanel";

interface AgentLogState {
  actions: AgentAction[];
  lastConfidence: number | null;
  lastAction: AgentAction | null;
}

function inferActionType(content: string): string {
  const value = content.toLowerCase();
  if (value.includes("aqi") || value.includes("air")) return "Answered AQI query";
  if (value.includes("weather") || value.includes("temperature")) return "Answered weather query";
  if (value.includes("emergency")) return "Provided emergency guidance";
  if (value.includes("health") || value.includes("risk")) return "Provided health safety advice";
  return "Answered general query";
}

export function useAgentLog() {
  const [state, setState] = useState<AgentLogState>({
    actions: [],
    lastConfidence: null,
    lastAction: null,
  });

  const addAction = useCallback((action: AgentAction) => {
    setState((prev) => ({
      ...prev,
      lastAction: action,
      actions: [action, ...prev.actions].slice(0, 10),
    }));
  }, []);

  const parseResponseForActions = useCallback(
    (apiResponse: Record<string, unknown>) => {
      const confidenceValue =
        typeof apiResponse.confidence === "number"
          ? apiResponse.confidence > 1
            ? apiResponse.confidence / 100
            : apiResponse.confidence
          : null;

      const blocked = Boolean(apiResponse.safety_guard_triggered);
      const answer = typeof apiResponse.answer === "string" ? apiResponse.answer : "";
      const actionType =
        typeof apiResponse.action_type === "string"
          ? apiResponse.action_type
          : inferActionType(answer);
      const reason =
        typeof apiResponse.blocked_reason === "string"
          ? apiResponse.blocked_reason
          : undefined;

      const action: AgentAction = {
        timestamp: new Date(),
        actionType,
        decision: blocked ? "BLOCKED" : "ALLOWED",
        reason,
      };

      setState((prev) => ({
        actions: [action, ...prev.actions].slice(0, 10),
        lastAction: action,
        lastConfidence: confidenceValue,
      }));

      return [action];
    },
    []
  );

  return {
    actions: state.actions,
    lastConfidence: state.lastConfidence,
    lastAction: state.lastAction,
    addAction,
    parseResponseForActions,
  };
}
