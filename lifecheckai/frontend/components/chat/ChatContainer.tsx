import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Bot, Loader2 } from 'lucide-react';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { SuggestedPrompts } from './SuggestedPrompts';
import { ChatSidebar } from './ChatSidebar';
import type { MemoryItem } from './ConversationMemory';
import { ChatMessage } from './MessageBubble';
import { useStreamingChat, type StreamOptions } from '@/hooks/useStreamingChat';

interface SafetyData {
  city: string;
  aqi?: number;
  temperature?: number;
  verdict?: string;
}

interface ChatContainerProps {
  initialCity?: string;
}

const API_BASE =
  process.env.NEXT_PUBLIC_API_BASE_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  'http://127.0.0.1:8000';

const STREAMING_PLACEHOLDER = 'Analyzing live safety context...';

export const ChatContainer: React.FC<ChatContainerProps> = ({ initialCity = 'Delhi' }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [attachedCity, setAttachedCity] = useState(initialCity);
  const [profile] = useState('general');
  const [memory, setMemory] = useState<MemoryItem[]>([]);
  const [suggestedPrompts, setSuggestedPrompts] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [safetyData, setSafetyData] = useState<SafetyData | null>(null);
  const [safetyLoading, setSafetyLoading] = useState(false);
  const [safetyError, setSafetyError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const activeAssistantIdRef = useRef<string | null>(null);

  const starterPrompts = [
    'Is it safe to go outside in ' + (attachedCity || 'Delhi') + ' today?',
    'Give me a full air and weather risk summary.',
    'What should I do if AQI rises tonight?',
    'Summarize water safety trends for my state.',
  ];

  const fetchSafetyData = useCallback(async (city: string) => {
    const trimmedCity = city.trim() || 'Delhi';

    setSafetyLoading(true);
    setSafetyError(null);

    try {
      const response = await fetch(`${API_BASE}/api/check-safety?city=${encodeURIComponent(trimmedCity)}`);

      if (!response.ok) {
        throw new Error(`Unable to load safety data (${response.status})`);
      }

      const payload = await response.json();
      setSafetyData({
        city: payload.city || trimmedCity,
        aqi: payload?.air?.aqi,
        temperature: payload?.weather?.temp,
        verdict: payload?.overall?.level || payload?.overall?.status || payload?.air?.status,
      });
      setLastUpdated(new Date());
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load safety data';
      setSafetyError(message);
      setSafetyData({
        city: trimmedCity,
        aqi: 95,
        temperature: 32,
        verdict: 'MODERATE',
      });
    } finally {
      setSafetyLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSafetyData(attachedCity);
  }, [attachedCity, fetchSafetyData]);

  const {
    streamMessage,
    cancelStream,
    isStreaming,
    error,
  } = useStreamingChat();

  // Handle sending a message
  const handleSendMessage = useCallback(
    async (query: string) => {
      if (!query.trim()) return;
      setInputValue('');
      setShowSuggestions(false);
      setSuggestedPrompts([]);

      // Add user message
      const userMessageId = `user-${Date.now()}`;
      const userMessage: ChatMessage = {
        id: userMessageId,
        type: 'user',
        content: query,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, userMessage]);

      // Create AI message placeholder
      const aiMessageId = `assistant-${Date.now()}`;
      activeAssistantIdRef.current = aiMessageId;
      const aiMessage: ChatMessage = {
        id: aiMessageId,
        type: 'assistant_streaming',
        content: STREAMING_PLACEHOLDER,
        timestamp: new Date(),
        isStreaming: true,
      };

      setMessages(prev => [...prev, aiMessage]);

      // Stream response
      const streamOptions: StreamOptions = {
        city: attachedCity,
        profile: profile,
        memory,
        onChunk: (chunk) => {
          setMessages(prev =>
            prev.map(msg =>
              msg.id === activeAssistantIdRef.current
                ? {
                    ...msg,
                    content:
                      msg.content === STREAMING_PLACEHOLDER
                        ? chunk
                        : `${msg.content}${chunk}`,
                  }
                : msg
            )
          );
        },
        onSuggestions: (suggestions) => {
          setSuggestedPrompts(suggestions || []);
          setShowSuggestions((suggestions || []).length > 0);
        },
        onDone: (finalText) => {
          // Update message with final text
          setMessages(prev =>
            prev.map(msg =>
              msg.id === aiMessageId
                ? {
                    ...msg,
                    type: 'assistant',
                    content: finalText,
                    isStreaming: false,
                  }
                : msg
            )
          );
          activeAssistantIdRef.current = null;

          // Update memory with new city if detected
          if (attachedCity && !memory.some(m => m.type === 'city' && m.value === attachedCity)) {
            setMemory(prev => [
              ...prev,
              {
                type: 'city',
                value: attachedCity,
                addedAt: new Date(),
              },
            ]);
          }
        },
      };

      streamMessage(query, streamOptions);
    },
    [attachedCity, profile, memory, streamMessage]
  );

  // Handle suggested prompt selection
  const handleSuggestedPrompt = (prompt: string) => {
    handleSendMessage(prompt);
  };

  // Handle voice input (if integrated)
  const handleVoiceInput = (transcript: string) => {
    handleSendMessage(transcript);
  };

  // Handle memory removal
  const handleMemoryRemove = (item: MemoryItem) => {
    setMemory(prev => prev.filter(m => m !== item));
  };

  // Handle memory clear
  const handleMemoryClear = () => {
    setMemory([]);
  };

  const handleRefreshSafety = () => {
    fetchSafetyData(attachedCity);
  };

  const handleCitySubmit = (city: string) => {
    const nextCity = city.trim() || 'Delhi';
    if (nextCity.toLowerCase() === attachedCity.toLowerCase()) {
      fetchSafetyData(nextCity);
      return;
    }

    setAttachedCity(nextCity);
  };

  const handleClearChat = () => {
    cancelStream();
    activeAssistantIdRef.current = null;
    setMessages([]);
    setInputValue('');
    setSuggestedPrompts([]);
    setShowSuggestions(false);
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-[radial-gradient(circle_at_top,_rgba(59,130,246,0.12),_transparent_40%),linear-gradient(180deg,_rgba(2,6,23,0.96),_rgba(15,23,42,0.98))] text-white">
      <div className="mx-auto flex min-h-[calc(100vh-64px)] max-w-7xl gap-4 px-3 py-3 lg:px-5">
        {/* Main chat area */}
        <main className="flex min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-950/70 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <div className="border-b border-white/10 bg-white/5 px-4 py-3 sm:px-5">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-blue-400/20 bg-gradient-to-br from-blue-500/25 to-cyan-400/15 text-blue-200 shadow-lg shadow-blue-500/10">
                  <Bot className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-base font-semibold tracking-tight text-white sm:text-lg">
                      Safety Assistant
                    </h1>
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-200">
                      Live
                    </span>
                    {isStreaming && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-blue-400/25 bg-blue-500/10 px-2.5 py-0.5 text-[11px] font-medium text-blue-200">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Generating
                      </span>
                    )}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-300">
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                      City: {attachedCity || 'Delhi'}
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                      Memory: {memory.length} items
                    </span>
                    <span className="text-slate-400">Air, weather, water, and risk guidance</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start">
                <button
                  onClick={handleClearChat}
                  className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition-colors hover:border-white/20 hover:bg-white/10"
                >
                  Clear chat
                </button>
              </div>
            </div>

            {!messages.length && !isStreaming && (
              <div className="mt-3 flex flex-wrap gap-2">
                {starterPrompts.slice(0, 2).map((prompt) => (
                  <button
                    key={prompt}
                    onClick={() => handleSendMessage(prompt)}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 transition-colors hover:border-blue-300/30 hover:bg-blue-500/10"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-hidden bg-[linear-gradient(180deg,rgba(15,23,42,0.18),rgba(2,6,23,0.02))]">
            {error && (
              <div className="mx-4 mt-4 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100 sm:mx-6">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-300" />
                  <div>
                    <div className="font-medium">Connection switched to fallback mode</div>
                    <div className="mt-1 text-xs leading-5 text-amber-100/80">{error}</div>
                  </div>
                </div>
              </div>
            )}
            {safetyError && (
              <div className="mx-4 mt-4 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100 sm:mx-6">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-300" />
                  <div>
                    <div className="font-medium">Safety data fallback active</div>
                    <div className="mt-1 text-xs leading-5 text-red-100/80">{safetyError}</div>
                  </div>
                </div>
              </div>
            )}
            <MessageList messages={messages} isLoading={false} />
          </div>

          {!isStreaming && showSuggestions && suggestedPrompts.length > 0 && (
            <div className="border-t border-white/10 bg-white/5 px-4 py-3 sm:px-6">
              <SuggestedPrompts
                suggestions={suggestedPrompts}
                onSelect={handleSuggestedPrompt}
                isVisible={showSuggestions}
              />
            </div>
          )}

          <div className="border-t border-white/10 bg-slate-950/85 px-4 py-4 sm:px-6">
            <ChatInput
              value={inputValue}
              onChange={setInputValue}
              onSend={handleSendMessage}
              onVoiceInput={handleVoiceInput}
              isStreaming={isStreaming}
              attachedCity={attachedCity}
              onClearCity={() => setAttachedCity('')}
            />
          </div>

          <div className="mt-4 border-t border-white/10 bg-white/[0.02] px-4 py-3 sm:mt-5 sm:px-6">
            <div className="rounded-2xl border border-white/10 bg-slate-950/55">
              <button
                type="button"
                onClick={() => setInsightsOpen(prev => !prev)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <div>
                  <div className="text-sm font-semibold text-white">Context, Agent, and Memory</div>
                  <div className="mt-0.5 text-xs text-slate-400">
                    Optional panel for live context controls and assistant diagnostics
                  </div>
                </div>
                <span className="text-xs text-blue-200">{insightsOpen ? 'Hide' : 'Show'}</span>
              </button>

              {insightsOpen && (
                <ChatSidebar
                  safetyData={safetyData}
                  safetyLoading={safetyLoading}
                  safetyError={safetyError}
                  lastUpdated={lastUpdated}
                  currentCity={attachedCity}
                  memory={memory}
                  onMemoryRemove={handleMemoryRemove}
                  onMemoryClear={handleMemoryClear}
                  onCitySubmit={handleCitySubmit}
                  onRefresh={handleRefreshSafety}
                  embedded={true}
                />
              )}
            </div>
          </div>
        </main>
      </div>

      
    </div>
  );
};
