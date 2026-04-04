"use client";

import {
  createContext,
  useContext,
  useEffect,
  useReducer,
  type ReactNode,
  type Dispatch,
} from "react";
import type { SafetyData, Message } from "@/types";

interface SafetyState {
  city: string;
  coordinates: { lat: number; lon: number } | null;
  safetyData: SafetyData | null;
  chatHistory: Message[];
  loading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

type SafetyAction =
  | { type: "SET_CITY"; payload: string }
  | { type: "SET_DATA"; payload: SafetyData }
  | { type: "ADD_MESSAGE"; payload: Message }
  | { type: "SET_MESSAGES"; payload: Message[] }
  | { type: "SET_LOADING"; payload: boolean }
  | { type: "SET_ERROR"; payload: string | null }
  | { type: "CLEAR_ERROR" };

const initialState: SafetyState = {
  city: "",
  coordinates: null,
  safetyData: null,
  chatHistory: [],
  loading: false,
  error: null,
  lastUpdated: null,
};

function safetyReducer(state: SafetyState, action: SafetyAction): SafetyState {
  switch (action.type) {
    case "SET_CITY":
      return { ...state, city: action.payload };
    case "SET_DATA":
      return {
        ...state,
        safetyData: action.payload,
        coordinates: action.payload.coordinates,
        city: action.payload.city,
        lastUpdated: new Date(),
        loading: false,
        error: null,
      };
    case "ADD_MESSAGE":
      return { ...state, chatHistory: [...state.chatHistory, action.payload] };
    case "SET_MESSAGES":
      return { ...state, chatHistory: action.payload };
    case "SET_LOADING":
      return { ...state, loading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload, loading: false };
    case "CLEAR_ERROR":
      return { ...state, error: null };
    default:
      return state;
  }
}

const SafetyContext = createContext<{
  state: SafetyState;
  dispatch: Dispatch<SafetyAction>;
} | null>(null);

export function SafetyProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(safetyReducer, initialState);

  useEffect(() => {
    const verdict = state.safetyData?.overall?.verdict;
    const ambient =
      verdict === "SAFE"
        ? "rgba(16,185,129,0.03)"
        : verdict === "CAUTION"
        ? "rgba(245,158,11,0.03)"
        : verdict === "UNSAFE"
        ? "rgba(239,68,68,0.03)"
        : "rgba(59,130,246,0.02)";
    document.documentElement.style.setProperty("--ambient", ambient);
  }, [state.safetyData?.overall?.verdict]);

  return (
    <SafetyContext.Provider value={{ state, dispatch }}>
      {children}
    </SafetyContext.Provider>
  );
}

export function useSafety() {
  const context = useContext(SafetyContext);
  if (!context) {
    throw new Error("useSafety must be used within a SafetyProvider");
  }
  return context;
}
