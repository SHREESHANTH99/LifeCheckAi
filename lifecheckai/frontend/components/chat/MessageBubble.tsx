import React, { useState } from 'react';
import { Bot, Copy, Volume2, ThumbsUp, ThumbsDown, AlertCircle, Shield } from 'lucide-react';
import { StreamingText } from './StreamingText';

export type MessageType =
  | 'user'
  | 'assistant'
  | 'assistant_streaming'
  | 'system'
  | 'error'
  | 'blocked';

export interface ChatMessage {
  id: string;
  type: MessageType;
  content: string;
  timestamp: Date;
  metadata?: Record<string, unknown>;
  isStreaming?: boolean;
}

interface MessageBubbleProps {
  message: ChatMessage;
  onCopy?: (text: string) => void;
  onSpeak?: (text: string) => void;
  onLike?: () => void;
  onDislike?: () => void;
  onRetry?: () => void;
}

const formatTime = (date: Date): string =>
  date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onCopy,
  onSpeak,
  onLike,
  onDislike,
  onRetry,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    onCopy?.(message.content);
    setTimeout(() => setCopied(false), 2000);
  };

  if (message.type === 'system') {
    return (
      <div className="flex justify-center my-4 animate-fade-in">
        <div className="glass !rounded-full px-4 py-1.5 flex items-center gap-2 text-text-muted text-xs shadow-none">
          <span>📍</span>
          <span>{message.content}</span>
        </div>
      </div>
    );
  }

  if (message.type === 'error') {
    return (
      <div className="flex justify-start my-4 animate-fade-in">
        <div className="max-w-lg bg-danger/10 border border-danger/30 rounded-2xl p-4 border-l-4 border-l-danger shadow-glow">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-danger flex-shrink-0 mt-1" />
            <div>
              <p className="text-sm text-white">{message.content}</p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="mt-2 text-xs bg-danger/20 hover:bg-danger/40 text-white px-3 py-1.5 rounded transition-colors cursor-pointer"
                >
                  Retry
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (message.type === 'blocked') {
    return (
      <div className="flex justify-start my-4 animate-fade-in">
        <div className="max-w-lg bg-warning/10 border border-warning/30 rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-warning" />
            <span className="text-xs font-bold text-warning uppercase">Safety Agent Blocked Query</span>
          </div>
          <p className="text-sm text-text-secondary mb-3">{message.content}</p>
        </div>
      </div>
    );
  }

  if (message.type === 'user') {
    return (
      <div className="flex justify-end my-4 animate-fade-in group">
        <div className="max-w-xs md:max-w-md">
          <div className="bg-gradient-to-br from-accent-cyan to-[#00aaff] text-black font-semibold tracking-wide rounded-2xl rounded-tr-sm px-5 py-3 text-sm shadow-[0_4px_24px_rgba(0,212,255,0.3)] break-words">
            {message.content}
          </div>
          <div className="text-xs text-text-muted mt-1 text-right font-mono">{formatTime(message.timestamp)}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start my-4 animate-fade-in">
      <div className="max-w-xs md:max-w-xl lg:max-w-3xl w-full">
        <div className="flex gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-accent-violet shadow-[0_0_15px_rgba(124,58,237,0.4)]">
            <Bot className="w-5 h-5" />
          </div>
          <div className="glass w-full !bg-[#0A0F1E]/80 border border-accent-violet/30 rounded-2xl rounded-tl-sm px-6 py-5 flex-1 shadow-[inset_0_4px_24px_rgba(124,58,237,0.05),0_8px_32px_rgba(0,0,0,0.4)]">
            <StreamingText text={message.content} isStreaming={message.isStreaming || false} />
          </div>
        </div>

        <div className="text-xs text-text-muted mt-2 ml-[56px] font-mono">{formatTime(message.timestamp)}</div>

        {!message.isStreaming && (
          <div className="flex gap-2 mt-2 ml-[56px] text-text-muted">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs hover:text-white transition-colors px-2 py-1.5 hover:bg-white/5 rounded cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5" />
              {copied ? 'Copied!' : 'Copy'}
            </button>
            {onSpeak && (
              <button
                onClick={() => onSpeak(message.content)}
                className="flex items-center gap-1.5 text-xs hover:text-white transition-colors px-2 py-1.5 hover:bg-white/5 rounded cursor-pointer"
              >
                <Volume2 className="w-3.5 h-3.5" />
                Read
              </button>
            )}
            {onLike && (
              <button onClick={onLike} className="flex items-center gap-1.5 text-xs hover:text-accent-cyan p-1.5 hover:bg-white/5 rounded cursor-pointer">
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>
            )}
            {onDislike && (
              <button onClick={onDislike} className="flex items-center gap-1.5 text-xs hover:text-danger p-1.5 hover:bg-white/5 rounded cursor-pointer">
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
