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
        <div className="max-w-lg bg-danger/10 border border-danger/30 rounded-2xl p-4 shadow-glow-danger">
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
        <div className="max-w-[85%] md:max-w-[70%] flex flex-col items-end">
          <div className="bg-accent-primary text-bg-primary font-semibold tracking-wide rounded-2xl rounded-tr-sm px-5 py-3 text-sm shadow-md break-words">
            {message.content}
          </div>
          <div className="text-[11px] text-text-muted mt-1.5 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
            {formatTime(message.timestamp)}
          </div>
        </div>
      </div>
    );
  }

  const isGenerating = message.isStreaming && message.content === 'Analyzing live safety context...';

  return (
    <div className="flex justify-start my-4 animate-fade-in group">
      <div className="max-w-[90%] md:max-w-[80%] lg:max-w-[70%] w-full">
        <div className="flex gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-bg-card border border-border-default flex items-center justify-center text-accent-primary shadow-sm mt-1">
            <Bot className="w-4 h-4" />
          </div>
          <div className="bg-white/5 border border-white/10 rounded-2xl rounded-tl-sm px-5 py-3.5 flex-1 shadow-sm text-sm text-text-primary leading-relaxed break-words">
            {isGenerating ? (
              <div className="flex gap-1 items-center h-5">
                <div className="w-1.5 h-1.5 bg-accent-primary rounded-full animate-pulse" />
                <div className="w-1.5 h-1.5 bg-accent-primary rounded-full animate-pulse" style={{ animationDelay: '0.15s' }} />
                <div className="w-1.5 h-1.5 bg-accent-primary rounded-full animate-pulse" style={{ animationDelay: '0.3s' }} />
              </div>
            ) : (
              <StreamingText text={message.content} isStreaming={message.isStreaming || false} />
            )}
          </div>
        </div>

        <div className="flex items-center gap-3 mt-1.5 ml-[44px]">
          <div className="text-[11px] text-text-muted font-mono opacity-0 group-hover:opacity-100 transition-opacity">
            {formatTime(message.timestamp)}
          </div>

          {!message.isStreaming && (
            <div className="flex gap-1 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity">
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
                <button onClick={onLike} className="flex items-center gap-1.5 text-xs hover:text-accent-primary p-1.5 hover:bg-white/5 rounded cursor-pointer">
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
    </div>
  );
};
