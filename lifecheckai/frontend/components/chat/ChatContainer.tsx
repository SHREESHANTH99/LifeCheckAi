import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Bot, Loader2, Mic, Volume2, Sparkles, BarChart2, Shield, Brain, X, Wind, Thermometer, Droplets } from 'lucide-react';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { SuggestedPrompts } from './SuggestedPrompts';
import { ChatSidebar, type Tab } from './ChatSidebar';
import type { MemoryItem } from './ConversationMemory';
import { ChatMessage } from './MessageBubble';
import { useStreamingChat, type StreamOptions } from '@/hooks/useStreamingChat';
import { useVoiceSettings } from '@/app/context/VoiceContext';
import { useChatVoiceMode } from '@/hooks/useChatVoiceMode';
import { VoiceWaveform } from '@/components/voice/VoiceWaveform';
import { VolumeX } from 'lucide-react';
import { speakText, stopSpeaking } from '@/lib/elevenlabs';
import { Card } from '@/components/ui/Card';

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
  const [autoStartVoiceTick, setAutoStartVoiceTick] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [activeSidebarTab, setActiveSidebarTab] = useState<Tab>('context');
  const activeAssistantIdRef = useRef<string | null>(null);
  const voiceIntroPlayedRef = useRef(false);
  const { settings, setChatVoiceModeEnabled } = useVoiceSettings();
  const { isPlaying, audioState, speakResponse } = useChatVoiceMode();

  const dynamicPrompts = React.useMemo(() => {
    if (!safetyData) return [
      'Is it safe to go outside in ' + (attachedCity || 'Delhi') + ' today?',
      'Give me a full air and weather risk summary.',
      'What should I do if AQI rises tonight?',
    ];
    
    const prompts = [];
    if (safetyData.aqi && safetyData.aqi > 100) {
      prompts.push(`Why is the air quality ${safetyData.verdict?.toLowerCase()} right now in ${safetyData.city}?`);
      prompts.push('What precautions should I take for the current AQI?');
    } else {
      prompts.push(`Give me a full air and weather risk summary for ${safetyData.city}.`);
    }
    
    if (safetyData.temperature && safetyData.temperature > 35) {
      prompts.push(`Is it safe to exercise outside in this heat?`);
    } else if (safetyData.temperature && safetyData.temperature < 10) {
      prompts.push(`How long is it safe to be outdoors in this cold?`);
    } else {
      prompts.push(`Any weather risks I should be aware of today?`);
    }
    
    prompts.push('Summarize water safety trends for my state.');
    return prompts.slice(0, 3);
  }, [safetyData, attachedCity]);

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

  useEffect(() => {
    if (!settings.chatVoiceModeEnabled) {
      voiceIntroPlayedRef.current = false;
      return;
    }

    if (voiceIntroPlayedRef.current) {
      return;
    }

    voiceIntroPlayedRef.current = true;
    void speakText("Voice assistant is on. Ask your question.", {
      rate: 1.02,
      pitch: 1,
      onEnd: () => {
        setAutoStartVoiceTick((tick) => tick + 1);
      },
      onError: () => {
        setAutoStartVoiceTick((tick) => tick + 1);
      },
    }).catch(() => {
      setAutoStartVoiceTick((tick) => tick + 1);
    });
  }, [settings.chatVoiceModeEnabled]);

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

          if (settings.chatVoiceModeEnabled && finalText?.trim()) {
            speakResponse(finalText).finally(() => {
              // Auto arm voice input after assistant reply in voice mode.
              setAutoStartVoiceTick((prev) => prev + 1);
            });
          }

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
    [attachedCity, profile, memory, streamMessage, settings.chatVoiceModeEnabled, speakResponse]
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

  const toggleVoiceAssistant = () => {
    const nextEnabled = !settings.chatVoiceModeEnabled;
    setChatVoiceModeEnabled(nextEnabled);
    if (nextEnabled) {
      voiceIntroPlayedRef.current = false;
    } else {
      stopSpeaking();
      setAutoStartVoiceTick(0);
      voiceIntroPlayedRef.current = false;
    }
  };

  const handleVoicePanelAction = () => {
    if (settings.chatVoiceModeEnabled) {
      toggleVoiceAssistant();
      return;
    }

    toggleVoiceAssistant();
  };

  const handleRailClick = (tab: Tab) => {
    if (isSidebarOpen && activeSidebarTab === tab) {
      setIsSidebarOpen(false);
    } else {
      setActiveSidebarTab(tab);
      setIsSidebarOpen(true);
    }
  };

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto flex w-full max-w-7xl h-[calc(100vh-120px)] gap-6 relative">
        
        {/* Left Icon Rail (~64px width) */}
        <aside className="hidden lg:flex w-16 flex-col items-center pb-4 rounded-card border border-border-default bg-bg-card shadow-[0_0_40px_rgba(79,168,196,0.06)] z-20 overflow-hidden">
            {/* Header spacer to align with active session header */}
            <div className="w-full h-[73px] border-b border-border-default mb-4 flex-shrink-0 bg-bg-card/80 backdrop-blur-md" />
            
            <div className="flex flex-col items-center w-full gap-2">
              <button
                 onClick={() => handleRailClick('context')}
                 className={`w-full flex justify-center py-3 transition-all cursor-pointer ${
                   isSidebarOpen && activeSidebarTab === 'context'
                     ? 'bg-accent-primary/10 text-accent-primary border-l-2 border-accent-primary'
                     : 'text-slate-400 hover:text-white hover:bg-white/5 border-l-2 border-transparent'
                 }`}
                 title="Context & Safety Data"
              >
                 <BarChart2 size={20} />
              </button>
              <button
                 onClick={() => handleRailClick('agent')}
                 className={`w-full flex justify-center py-3 transition-all cursor-pointer ${
                   isSidebarOpen && activeSidebarTab === 'agent'
                     ? 'bg-accent-primary/10 text-accent-primary border-l-2 border-accent-primary'
                     : 'text-slate-400 hover:text-white hover:bg-white/5 border-l-2 border-transparent'
                 }`}
                 title="Agent Rules"
              >
                 <Shield size={20} />
              </button>
              <button
                 onClick={() => handleRailClick('memory')}
                 className={`w-full flex justify-center py-3 transition-all cursor-pointer ${
                   isSidebarOpen && activeSidebarTab === 'memory'
                     ? 'bg-accent-primary/10 text-accent-primary border-l-2 border-accent-primary'
                     : 'text-slate-400 hover:text-white hover:bg-white/5 border-l-2 border-transparent'
                 }`}
                 title="Conversation Memory"
              >
                 <Brain size={20} />
              </button>

              <div className="h-px w-8 bg-border-default my-2" />
            </div>
        </aside>

        {/* Overlay Panel (Slides out next to rail) */}
        {isSidebarOpen && (
          <>
            {/* Click-outside backdrop (mobile/tablet mostly, or just to dismiss) */}
            <div className="fixed inset-0 z-30 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
            
            <div className="absolute left-0 lg:left-20 top-0 bottom-0 w-80 lg:w-[340px] bg-bg-card border border-border-default rounded-card shadow-2xl z-40 flex flex-col animate-slide-right overflow-hidden">
               <div className="flex items-center justify-between p-4 border-b border-white/10 bg-bg-card/80 backdrop-blur-md">
                  <span className="font-semibold text-white capitalize text-sm tracking-wide">{activeSidebarTab}</span>
                  <button onClick={() => setIsSidebarOpen(false)} className="text-slate-400 hover:text-white cursor-pointer transition-colors p-1">
                     <X size={18} />
                  </button>
               </div>
               <div className="flex-1 overflow-hidden relative">
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
                    activeTab={activeSidebarTab}
                  />
               </div>
            </div>
          </>
        )}

        {/* Main Chat Area (Expands to fill remaining space) */}
        <main className="flex-1 w-full flex flex-col rounded-card overflow-hidden shadow-[0_0_40px_rgba(255,255,255,0.06)] border border-border-default bg-bg-card relative z-10 transition-all duration-300">
          <div className="border-b border-border-default bg-bg-card/80 backdrop-blur-md px-6 py-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between z-20">
            <div className="flex items-center gap-4">
               <div>
                 <div className="flex items-center gap-3">
                   <h1 className="h3-card">Active Session</h1>
                   <span className="rounded-full border border-safe/30 bg-safe/10 px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider text-safe flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                     <span className="w-1.5 h-1.5 rounded-full bg-safe animate-pulse" /> Live
                   </span>
                 </div>
                 <div className="mt-1 text-xs text-text-secondary flex items-center gap-2">
                    <span>Target: <span className="text-accent-primary font-mono text-[13px]">{attachedCity || 'Delhi'}</span></span>
                    <span className="text-white/20">|</span>
                    <span>Memory span: {memory.length} items</span>
                 </div>
               </div>
            </div>
            <div className="flex items-center gap-2 self-start md:self-auto">
              <button
                onClick={toggleVoiceAssistant}
                className={`rounded-full border px-4 py-2.5 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer whitespace-nowrap ${
                  settings.chatVoiceModeEnabled
                    ? 'border-accent-primary/40 bg-accent-primary/10 text-accent-primary'
                    : 'border-white/20 bg-white/5 text-text-secondary'
                }`}
                title={settings.chatVoiceModeEnabled ? 'Stop voice assistant' : 'Start voice assistant'}
                aria-pressed={settings.chatVoiceModeEnabled}
              >
                <span className="inline-flex items-center gap-2">
                  {settings.chatVoiceModeEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
                  {settings.chatVoiceModeEnabled ? 'Voice Assistant On' : 'Voice Assistant'}
                </span>
              </button>
              <button
                 onClick={handleClearChat}
                 className="rounded-full border border-danger/30 bg-danger/10 px-4 py-2.5 text-xs font-bold text-danger uppercase tracking-wider transition-colors hover:bg-danger hover:text-white cursor-pointer shadow-glow"
               >
                 Clear
               </button>
            </div>
          </div>

          {settings.chatVoiceModeEnabled && (
            <div className="px-6 py-3 border-b border-white/5 bg-bg-card/70 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs uppercase tracking-wider text-text-secondary flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${isPlaying ? 'bg-accent-primary animate-pulse' : 'bg-safe animate-pulse'}`} />
                Voice assistant {isPlaying ? 'speaking...' : 'listening for your question'}
              </span>
              <VoiceWaveform analyticsData={audioState} isPlaying={isPlaying} className="h-10 w-full max-w-[220px]" />
            </div>
          )}

          <div className="flex-1 overflow-y-auto bg-bg-primary/50 p-6 relative">
             <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_60%_60%_at_50%_-20%,rgba(79,168,196,0.05),transparent)] z-0" />
            
             <div className="relative z-10 w-full max-w-3xl mx-auto flex flex-col min-h-full pb-8">
                {!messages.length && !isStreaming && (
                  <div className="flex flex-col items-center my-auto py-8 text-center gap-8 animate-fade-in">
                    {safetyData ? (
                      <div className="flex flex-col items-center gap-4">
                        <div className="flex items-center gap-5 bg-white/5 border border-white/10 rounded-3xl p-6 shadow-glow">
                          <div className="text-right">
                            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-mono">Live Snapshot</div>
                            <h2 className="text-3xl font-bold text-white tracking-tight mt-1 font-mono">{safetyData.city}</h2>
                          </div>
                          <div className="h-14 w-px bg-white/10" />
                          <div className="flex gap-5">
                            <div className="text-center">
                              <div className="text-3xl font-semibold text-white font-mono">{safetyData.aqi ?? '--'}</div>
                              <div className="text-[10px] uppercase tracking-widest text-slate-500 font-mono">AQI</div>
                            </div>
                            <div className="text-center">
                              <div className="text-3xl font-semibold text-white font-mono">{safetyData.temperature !== undefined ? `${safetyData.temperature}°` : '--'}</div>
                              <div className="text-[10px] uppercase tracking-widest text-slate-500 font-mono">Temp</div>
                            </div>
                          </div>
                        </div>
                        <div className="rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs font-medium text-slate-300 shadow-sm">
                          {safetyData.verdict || 'Unknown Risk'}
                        </div>
                      </div>
                    ) : (
                      <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shadow-glow-violet">
                          <Bot size={40} className="text-accent-primary" />
                      </div>
                    )}

                    <div className="mt-2">
                        <p className="body-base max-w-md mx-auto text-slate-400">
                          {safetyData ? `I'm analyzing the latest environmental patterns for ${safetyData.city}. How can I assist you?` : "Ask me about specific risks, air quality patterns, or tailored advice."}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4 w-full max-w-xl">
                        {dynamicPrompts.map((prompt) => {
                          const lower = prompt.toLowerCase();
                          const isAir = lower.includes('air') || lower.includes('aqi');
                          const isTemp = lower.includes('heat') || lower.includes('cold') || lower.includes('weather');
                          const Icon = isAir ? Wind : isTemp ? Thermometer : Droplets;
                          
                          return (
                            <button
                                key={prompt}
                                onClick={() => handleSendMessage(prompt)}
                                className="flex items-center gap-3 bg-white/5 border border-white/10 p-3 rounded-xl text-xs text-slate-300 transition-all hover:border-accent-primary hover:bg-accent-primary/10 hover:text-white cursor-pointer shadow-sm text-left w-full group"
                            >
                                <div className="p-2 rounded-lg bg-black/20 text-accent-primary group-hover:scale-110 transition-transform">
                                  <Icon size={16} />
                                </div>
                                <span className="flex-1">{prompt}</span>
                            </button>
                          );
                        })}
                    </div>
                  </div>
                )}

                {error && (
                  <Card className="my-4 !bg-warning/10 border-warning/30 p-4 text-sm text-white flex items-start gap-3 shadow-glow">
                      <AlertTriangle className="w-5 h-5 flex-shrink-0 text-warning" />
                      <div>
                        <div className="font-bold text-warning mb-1 uppercase tracking-wider text-xs">Connection Warning</div>
                        <div>{error}</div>
                      </div>
                  </Card>
                )}

                {safetyError && (
                  <Card className="my-4 !bg-danger/10 border-danger/30 p-4 text-sm text-white flex items-start gap-3 shadow-glow">
                      <AlertTriangle className="w-5 h-5 flex-shrink-0 text-danger" />
                      <div>
                         <div className="font-bold text-danger mb-1 uppercase tracking-wider text-xs">Data Fallback Active</div>
                         <div>{safetyError}</div>
                      </div>
                  </Card>
                )}

                <MessageList messages={messages} isLoading={false} />
             </div>
          </div>

           {showSuggestions && suggestedPrompts.length > 0 && (
             <div className="bg-bg-card/95 border-t border-white/5 px-6 py-3 shrink-0">
                 <div className="max-w-3xl mx-auto w-full">
                     <SuggestedPrompts suggestions={suggestedPrompts} onSelect={handleSuggestedPrompt} isVisible={showSuggestions} />
                 </div>
             </div>
          )}

           <div className="bg-bg-card border-t border-white/5 p-5 z-20 shrink-0">
            <div className="max-w-3xl mx-auto w-full">
              <ChatInput
                value={inputValue}
                onChange={setInputValue}
                onSend={handleSendMessage}
                onVoiceInput={handleVoiceInput}
                isStreaming={isStreaming}
                attachedCity={attachedCity}
                onClearCity={() => setAttachedCity('')}
                autoStartVoiceTick={autoStartVoiceTick}
                voiceAssistantEnabled={settings.chatVoiceModeEnabled}
                onVoiceAssistantToggle={toggleVoiceAssistant}
              />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

