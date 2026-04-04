import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AlertTriangle, Bot, Loader2, Mic, Volume2, Sparkles } from 'lucide-react';
import { MessageList } from './MessageList';
import { ChatInput } from './ChatInput';
import { SuggestedPrompts } from './SuggestedPrompts';
import { ChatSidebar } from './ChatSidebar';
import type { MemoryItem } from './ConversationMemory';
import { ChatMessage } from './MessageBubble';
import { useStreamingChat, type StreamOptions } from '@/hooks/useStreamingChat';
import { useVoiceSettings } from '@/app/context/VoiceContext';
import { useChatVoiceMode } from '@/hooks/useChatVoiceMode';
import { VoiceWaveform } from '@/components/voice/VoiceWaveform';
import { VolumeX } from 'lucide-react';
import { speakText, stopSpeaking } from '@/lib/elevenlabs';

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
  const activeAssistantIdRef = useRef<string | null>(null);
  const voiceIntroPlayedRef = useRef(false);
  const { settings, setChatVoiceModeEnabled } = useVoiceSettings();
  const { isPlaying, audioState, speakResponse } = useChatVoiceMode();

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

  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto flex w-full max-w-7xl h-[calc(100vh-120px)] gap-6">
        
        {/* Left Sidebar (1/3) */}
        <aside className="hidden lg:flex w-1/3 flex-col glass rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(124,58,237,0.06)] border border-white/5 relative z-10">
            <div className="p-5 border-b border-white/5 bg-[#0A0F1E]/80 backdrop-blur-md">
                <h2 className="text-xl font-bold text-white flex items-center gap-2 tracking-tight">
                    <Bot className="text-accent-violet" size={24} /> 
                    Safety Intelligence
                </h2>
                <p className="text-xs text-text-muted mt-1 uppercase tracking-wider">Context & Memory</p>
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
                />
            </div>
        </aside>

        {/* Right Active Chat (2/3) */}
        <main className="flex-1 lg:w-2/3 flex flex-col glass rounded-3xl overflow-hidden shadow-[0_0_40px_rgba(0,212,255,0.06)] border border-white/5 relative z-10">
          <div className="border-b border-white/5 bg-[#0A0F1E]/80 backdrop-blur-md px-6 py-4 flex flex-col gap-4 md:flex-row md:items-center md:justify-between z-20">
            <div className="flex items-center gap-4">
               <div>
                 <div className="flex items-center gap-3">
                   <h1 className="text-lg font-bold tracking-tight text-white">Active Session</h1>
                   <span className="rounded-full border border-safe/30 bg-safe/10 px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider text-safe flex items-center gap-1.5 shadow-[0_0_12px_rgba(16,185,129,0.3)]">
                     <span className="w-1.5 h-1.5 rounded-full bg-safe animate-pulse" /> Live
                   </span>
                 </div>
                 <div className="mt-1 text-xs text-text-secondary flex items-center gap-2">
                    <span>Target: <span className="text-accent-cyan font-mono">{attachedCity || 'Delhi'}</span></span>
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
                    ? 'border-accent-cyan/40 bg-accent-cyan/10 text-accent-cyan'
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
            <div className="px-6 py-3 border-b border-white/5 bg-[#0A0F1E]/70 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs uppercase tracking-wider text-text-secondary flex items-center gap-2">
                <span className={`h-2 w-2 rounded-full ${isPlaying ? 'bg-accent-cyan animate-pulse' : 'bg-safe animate-pulse'}`} />
                Voice assistant {isPlaying ? 'speaking...' : 'listening for your question'}
              </span>
              <VoiceWaveform analyticsData={audioState} isPlaying={isPlaying} className="h-10 w-full max-w-[220px]" />
            </div>
          )}

          <div className="flex-1 overflow-y-auto bg-bg-primary/50 p-6 relative">
             <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_60%_60%_at_50%_-20%,rgba(124,58,237,0.05),transparent)] z-0" />
            
             <div className="relative z-10">
                {!messages.length && !isStreaming && (
                  <div className="flex flex-col items-center justify-center mt-20 text-center gap-6 animate-fade-in">
                    <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shadow-glow-violet">
                        <Bot size={40} className="text-accent-violet" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white mb-2">How can I assist your safety today?</h2>
                        <p className="text-text-secondary max-w-sm mx-auto text-sm">Ask me about specific risks, air quality patterns, or tailored advice for your current profile.</p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-3 mt-4 max-w-lg">
                        {starterPrompts.slice(0, 3).map((prompt) => (
                        <button
                            key={prompt}
                            onClick={() => handleSendMessage(prompt)}
                            className="rounded-full glass px-4 py-2 text-xs text-text-primary transition-all hover:border-accent-cyan hover:text-accent-cyan cursor-pointer shadow-glow"
                        >
                            {prompt}
                        </button>
                        ))}
                    </div>
                  </div>
                )}

                {error && (
                  <div className="my-4 rounded-2xl glass !bg-warning/10 border border-warning/30 p-4 text-sm text-white flex items-start gap-3 shadow-glow">
                      <AlertTriangle className="w-5 h-5 flex-shrink-0 text-warning" />
                      <div>
                        <div className="font-bold text-warning mb-1 uppercase tracking-wider text-xs">Connection Warning</div>
                        <div>{error}</div>
                      </div>
                  </div>
                )}

                {safetyError && (
                  <div className="my-4 rounded-2xl glass !bg-danger/10 border border-danger/30 p-4 text-sm text-white flex items-start gap-3 shadow-glow">
                      <AlertTriangle className="w-5 h-5 flex-shrink-0 text-danger" />
                      <div>
                         <div className="font-bold text-danger mb-1 uppercase tracking-wider text-xs">Data Fallback Active</div>
                         <div>{safetyError}</div>
                      </div>
                  </div>
                )}

                <MessageList messages={messages} isLoading={false} />
             </div>
          </div>

           {showSuggestions && suggestedPrompts.length > 0 && (
             <div className="bg-[#0A0F1E]/95 border-t border-white/5 px-6 py-3">
                 <SuggestedPrompts suggestions={suggestedPrompts} onSelect={handleSuggestedPrompt} isVisible={showSuggestions} />
             </div>
          )}

           <div className="bg-[#0A0F1E] border-t border-white/5 p-5 z-20">
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
        </main>
      </div>
    </div>
  );
};