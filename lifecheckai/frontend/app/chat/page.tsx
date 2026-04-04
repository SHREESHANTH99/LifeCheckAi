"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useChat } from "@/app/hooks/useChat";
import { useSafetyData } from "@/app/hooks/useSafetyData";
import { SearchBar } from "@/components/ui/SearchBar";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { AgentRulesPanel } from "@/components/agent/AgentRulesPanel";
import { useAgentLog } from "@/hooks/useAgentLog";
import { VoiceChatInput } from "@/components/voice/VoiceChatInput";
import {
  Sparkles,
  Send,
  Wind,
  Thermometer,
  Flower2,
  Trash2,
  MessageSquare,
} from "lucide-react";

const quickPrompts = [
  "Is air safe in Mumbai today?",
  "Should I go outside in Delhi?",
  "What's the pollen risk in Bangalore?",
  "Is it safe to exercise outdoors?",
];

export default function ChatPage() {
  const { messages, isTyping, sendMessage, clearChat, lastResponse } = useChat();
  const { data, city, search, loading } = useSafetyData();
  const { actions, lastConfidence, parseResponseForActions } = useAgentLog();
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [profile, setProfile] = useState("general");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("lifecheck_health_profile");
      if (saved) setProfile(saved);
    } catch {
      // no-op
    }
  }, []);

  useEffect(() => {
    if (!lastResponse) return;
    parseResponseForActions(lastResponse);
  }, [lastResponse, parseResponseForActions]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    sendMessage(trimmed, city || "Delhi", profile);
    setInput("");
  };

  const blockedLast = useMemo(
    () => Boolean(lastResponse?.safety_guard_triggered),
    [lastResponse]
  );

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="min-h-screen flex gap-0 lg:gap-6 px-0 lg:px-6 py-0 lg:py-4">
      {/* Chat Column */}
      <div className="flex-1 flex flex-col max-h-[calc(100vh-64px)] border border-border-default bg-bg-secondary/30 rounded-none lg:rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="px-4 sm:px-8 py-4 border-b border-border-default bg-bg-secondary/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-accent-purple/15 flex items-center justify-center">
                <Sparkles size={20} className="text-accent-purple" />
              </div>
              <div>
                <h1 className="font-[family-name:var(--font-family-grotesk)] text-lg font-semibold text-text-primary">
                  LifeCheck Assistant
                </h1>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-muted">Powered by Gemini</span>
                  <span className="px-2 py-0.5 rounded-full bg-accent-purple/10 text-accent-purple text-[10px] font-medium border border-accent-purple/20">
                    AI
                  </span>
                </div>
              </div>
            </div>
            {messages.length > 0 && (
              <button
                onClick={clearChat}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors text-xs cursor-pointer"
              >
                <Trash2 size={14} />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6">
          {messages.length === 0 && !isTyping ? (
            <div className="flex flex-col items-center justify-center h-full">
              <div className="w-20 h-20 rounded-2xl bg-accent-purple/10 flex items-center justify-center mb-6">
                <MessageSquare size={32} className="text-accent-purple" />
              </div>
              <h2 className="font-[family-name:var(--font-family-grotesk)] text-xl font-semibold text-text-primary mb-2">
                Ask anything about safety
              </h2>
              <p className="text-sm text-text-secondary mb-8 text-center max-w-md">
                Get AI-powered answers about air quality, weather conditions, health risks, and more.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-lg w-full">
                {quickPrompts.map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => {
                      sendMessage(prompt, city || "Delhi", profile);
                    }}
                    className="px-4 py-3 rounded-xl border border-border-default bg-bg-card text-sm text-text-secondary text-left hover:border-accent-blue hover:text-text-primary transition-all duration-200 cursor-pointer"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4 max-w-3xl mx-auto">
              <AnimatePresence>
                {messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2 }}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.role === "assistant" && (
                      <div className="w-8 h-8 rounded-lg bg-accent-purple/15 flex items-center justify-center mr-3 mt-1 shrink-0">
                        <Sparkles size={14} className="text-accent-purple" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] px-4 py-3 text-sm leading-relaxed ${
                        msg.role === "user"
                          ? "bg-accent-blue text-white rounded-2xl rounded-br-sm"
                          : msg.error
                          ? "bg-unsafe/10 border border-unsafe/20 text-text-primary rounded-2xl rounded-bl-sm"
                          : "bg-bg-card border border-border-default text-text-primary rounded-2xl rounded-bl-sm"
                      }`}
                    >
                      {msg.content}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Typing indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center gap-3"
                >
                  <div className="w-8 h-8 rounded-lg bg-accent-purple/15 flex items-center justify-center shrink-0">
                    <Sparkles size={14} className="text-accent-purple" />
                  </div>
                  <div className="bg-bg-card border border-border-default rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
                    {[0, 1, 2].map((i) => (
                      <motion.span
                        key={i}
                        className="w-2 h-2 rounded-full bg-text-muted"
                        animate={{ scale: [1, 1.3, 1], opacity: [0.4, 1, 0.4] }}
                        transition={{
                          duration: 0.6,
                          repeat: Infinity,
                          delay: i * 0.15,
                        }}
                      />
                    ))}
                  </div>
                </motion.div>
              )}

              {blockedLast && (
                <div className="bg-unsafe/10 border border-unsafe/30 rounded-xl px-4 py-2 text-sm text-unsafe">
                  ⚠️ This query was flagged by the safety agent.
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="px-4 sm:px-8 py-4 border-t border-border-default bg-bg-secondary/50">
          <div className="max-w-3xl mx-auto">
            {city && (
              <div className="mb-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-accent-cyan/10 text-accent-cyan text-xs font-medium border border-accent-cyan/20">
                  City context: {city}
                </span>
              </div>
            )}
            <div className="flex items-center gap-3">
              <VoiceChatInput
                disabled={isTyping}
                onTranscript={(text) => {
                  setInput(text);
                  setTimeout(() => {
                    sendMessage(text, city || "Delhi", profile);
                    setInput("");
                  }, 500);
                }}
              />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about safety conditions..."
                className="flex-1 h-12 px-5 rounded-full bg-bg-card border border-border-default text-text-primary placeholder-text-muted text-sm outline-none focus:border-accent-blue transition-colors"
                disabled={isTyping}
              />
              <button
                onClick={handleSend}
                disabled={!input.trim() || isTyping}
                className="w-12 h-12 rounded-full bg-accent-blue text-white flex items-center justify-center hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shrink-0"
                aria-label="Send message"
              >
                <Send size={18} />
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="hidden lg:flex flex-col gap-4 pt-0">
        <div className="card w-[300px]">
          <h3 className="text-sm font-semibold text-text-primary mb-3">City Context</h3>
          <SearchBar onSearch={search} placeholder="Search city..." isLoading={loading} className="h-10" />
          {data ? (
            <div className="mt-3 flex items-center justify-between">
              <span className="text-sm text-text-secondary">{data.city}</span>
              <StatusBadge status={data.overall?.verdict || "UNKNOWN"} />
            </div>
          ) : (
            <p className="mt-3 text-xs text-text-muted">No city selected</p>
          )}
        </div>
        <AgentRulesPanel actions={actions} lastConfidence={lastConfidence || undefined} isActive={isTyping} />
      </div>
    </div>
  );
}
