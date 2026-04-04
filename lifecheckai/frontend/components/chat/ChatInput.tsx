import React, { useState, useRef, useEffect } from 'react';
import { Mic, Send } from 'lucide-react';

type SpeechRecognitionLike = {
  lang: string;
  continuous?: boolean;
  interimResults: boolean;
  maxAlternatives?: number;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event?: unknown) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop?: () => void;
};

interface ChatInputProps {
  value: string;
  onChange: (v: string) => void;
  onSend: (message: string) => void;
  onVoiceInput?: (transcript: string) => void;
  isStreaming?: boolean;
  attachedCity?: string;
  onClearCity?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  onChange,
  onSend,
  onVoiceInput,
  isStreaming,
  attachedCity = '',
  onClearCity,
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

  const handleVoiceClick = () => {
    if (!onVoiceInput) return;

    const SpeechRecognitionCtor =
      (window as typeof window & {
        SpeechRecognition?: new () => SpeechRecognitionLike;
        webkitSpeechRecognition?: new () => SpeechRecognitionLike;
      }).SpeechRecognition ||
      (window as typeof window & {
        SpeechRecognition?: new () => SpeechRecognitionLike;
        webkitSpeechRecognition?: new () => SpeechRecognitionLike;
      }).webkitSpeechRecognition;

    if (!SpeechRecognitionCtor) {
      return;
    }

    const recognition = new SpeechRecognitionCtor() as SpeechRecognitionLike;
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

  return (
    <div className="space-y-2">
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
      <div className="flex gap-3 rounded-2xl border border-white/15 bg-slate-950/65 p-3 transition-all focus-within:border-blue-400/60">
        {/* Mic button */}
        <button
          type="button"
          onClick={handleVoiceClick}
          className={`flex-shrink-0 w-9 h-9 rounded-xl transition-colors flex items-center justify-center ${
            isListening
              ? 'bg-red-500/20 text-red-300 ring-1 ring-red-400/30'
              : 'hover:bg-white/10 text-blue-300'
          }`}
          title={onVoiceInput ? 'Voice input' : 'Voice input unavailable'}
        >
          <Mic className={`w-4 h-4 ${isListening ? 'animate-pulse' : ''}`} />
        </button>

        {/* Input area */}
        <div className="flex-1 flex flex-col">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about air quality, weather risk, water safety, or health guidance..."
            disabled={isStreaming}
            className="flex-1 bg-transparent text-white placeholder:text-slate-500 outline-none resize-none max-h-[120px] text-sm min-h-[20px] leading-relaxed"
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
                ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-500/50'
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
      <div className="px-1 text-[11px] text-slate-400">
        Enter to send. Shift+Enter for a new line.
      </div>
    </div>
  );
};
