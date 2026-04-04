import React, { useState, useRef, useEffect } from 'react';
import { Mic, Send } from 'lucide-react';

interface ChatInputProps {
  value: string;
  onChange: (v: string) => void;
  onSend: (message: string) => void;
  onVoiceInput?: (transcript: string) => void;
  isStreaming?: boolean;
  attachedCity?: string;
  onClearCity?: () => void;
  autoStartVoiceTick?: number;
  voiceAssistantEnabled?: boolean;
  onVoiceAssistantToggle?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSend,
  onVoiceInput,
  isStreaming,
  attachedCity = '',
  onClearCity,
  autoStartVoiceTick = 0,
  voiceAssistantEnabled = false,
  onVoiceAssistantToggle,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [inputHistory, setInputHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [isListening, setIsListening] = useState(false);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [value]);

  const handleSend = () => {
    if (value.trim() && !isStreaming) {
      onSend(value);
      setInputHistory((prev) => [value, ...prev].slice(0, 10));
      setHistoryIdx(-1);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send on Enter (not Shift+Enter)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    // Escape clears input
    else if (e.key === 'Escape') {
      onChange('');
      setHistoryIdx(-1);
    }
    // Arrow up/down for history
    else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newIdx = Math.min(historyIdx + 1, inputHistory.length - 1);
      setHistoryIdx(newIdx);
      onChange(inputHistory[newIdx] || '');
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newIdx = Math.max(historyIdx - 1, -1);
      setHistoryIdx(newIdx);
      onChange(newIdx === -1 ? '' : inputHistory[newIdx]);
    }
    // Tab accepts first tool suggestion
    else if (e.key === 'Tab') {
      e.preventDefault();
      // Could implement autocomplete here
    }
  };

  const startVoiceRecognition = () => {
    if (!onVoiceInput) return;

    const SpeechRecognitionCtor =
      (window as typeof window & {
        SpeechRecognition?: new () => SpeechRecognition;
        webkitSpeechRecognition?: new () => SpeechRecognition;
      }).SpeechRecognition ||
      (window as typeof window & {
        SpeechRecognition?: new () => SpeechRecognition;
        webkitSpeechRecognition?: new () => SpeechRecognition;
      }).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      return;
    }

    const recognition = new SpeechRecognitionCtor();
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setIsListening(true);

    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript?.trim();
      if (transcript) {
        onVoiceInput(transcript);
      }
      setIsListening(false);
    };

    recognition.onerror = () => {
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  };

  const handleVoiceClick = () => {
    if (!voiceAssistantEnabled) {
      onVoiceAssistantToggle?.();
      return;
    }
    startVoiceRecognition();
  };

  useEffect(() => {
    if (!autoStartVoiceTick || isStreaming || isListening) return;
    startVoiceRecognition();
  }, [autoStartVoiceTick, isStreaming, isListening]);

  return (
    <div className="space-y-3">
      {/* Attached city chip */}
      {attachedCity && (
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/25 bg-blue-500/10 px-3 py-1.5 text-xs text-blue-100">
          <span>📍 Checking: {attachedCity}</span>
          {onClearCity && (
            <button
              onClick={onClearCity}
              className="hover:text-blue-300 transition-colors font-bold"
            >
              ×
            </button>
          )}
        </div>
      )}

      {/* Input container */}
      <div className={`flex gap-3 rounded-3xl border p-3.5 transition-all backdrop-blur-md ${
        voiceAssistantEnabled
          ? 'border-accent-cyan/25 bg-[linear-gradient(145deg,rgba(8,16,31,0.92),rgba(9,14,29,0.7))] shadow-[0_0_28px_rgba(0,212,255,0.08)] focus-within:border-accent-cyan/60'
          : 'border-white/15 bg-slate-950/65 focus-within:border-blue-400/60'
      }`}>
        {/* Mic button */}
        <button
          type="button"
          onClick={handleVoiceClick}
          className={`flex-shrink-0 w-12 h-12 rounded-2xl transition-all flex items-center justify-center border ${
            voiceAssistantEnabled
              ? isListening
                ? 'bg-red-500/15 text-red-200 border-red-400/30 shadow-[0_0_20px_rgba(239,68,68,0.18)]'
                : 'bg-accent-cyan/10 text-accent-cyan border-accent-cyan/25 hover:bg-accent-cyan/15'
              : 'bg-white/5 text-text-secondary border-white/10 hover:border-accent-cyan/30 hover:text-accent-cyan'
          }`}
          title={
            voiceAssistantEnabled
              ? (onVoiceInput ? 'Speak your question' : 'Voice input unavailable')
              : 'Turn on voice assistant'
          }
        >
          <div className="flex flex-col items-center gap-0.5 leading-none">
            <Mic className={`w-4 h-4 ${isListening ? 'animate-pulse' : ''}`} />
            <span className="text-[9px] font-semibold uppercase tracking-widest">
              {voiceAssistantEnabled ? (isListening ? 'Listening' : 'Talk') : 'Voice'}
            </span>
          </div>
        </button>

        {/* Input area */}
        <div className="flex-1 flex flex-col justify-center">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={voiceAssistantEnabled ? "Ask your question or use the mic..." : "Ask about air quality, weather risk, water safety, or health guidance..."}
            disabled={isStreaming}
            className={`flex-1 bg-transparent outline-none resize-none max-h-[120px] text-sm min-h-[20px] leading-relaxed pr-1 ${
              voiceAssistantEnabled ? 'text-slate-50 placeholder:text-slate-400' : 'text-white placeholder:text-slate-500'
            }`}
            rows={1}
          />
          {value.length > 200 && (
            <div className="text-xs text-muted-foreground mt-1">{value.length} characters</div>
          )}
        </div>

        {/* Send button */}
        <div className="flex gap-2 items-end">
          <button
            type="button"
            onClick={handleSend}
            disabled={!value.trim() || isStreaming}
            className={`flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
              value.trim() && !isStreaming
                ? 'bg-accent-cyan hover:bg-cyan-400 text-black shadow-lg shadow-cyan-500/25'
                : 'bg-gray-700/50 text-gray-500 cursor-not-allowed'
            }`}
            title="Send message"
          >
            {isStreaming ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Keyboard hints */}
      <div className="px-1 text-[11px] text-slate-500">
        Enter to send. Shift+Enter for a new line.
      </div>
    </div>
  );
};
