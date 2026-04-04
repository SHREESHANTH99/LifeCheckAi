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
        <div className="border border-border rounded-full px-4 py-1.5 flex items-center gap-2 text-muted-foreground text-xs hover:border-accent-blue/50 transition-colors">
          <span>📍</span>
          <span>{message.content}</span>
        </div>
      </div>
    );
  }

  if (message.type === 'error') {
    return (
      <div className="flex justify-start my-3 animate-fade-in">
        <div className="max-w-lg bg-red-500/10 border border-red-500/20 rounded-3xl rounded-tl-sm p-4 border-l-4 border-l-red-500">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-1" />
            <div>
              <p className="text-sm text-red-100">{message.content}</p>
              {onRetry && (
                <button
                  onClick={onRetry}
                  className="mt-2 text-xs bg-red-500/20 hover:bg-red-500/30 text-red-100 px-3 py-1.5 rounded transition-colors"
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
      <div className="flex justify-start my-3 animate-fade-in">
        <div className="max-w-lg bg-amber-500/10 border border-amber-500/20 rounded-3xl rounded-tl-sm p-4">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-semibold text-amber-100">Safety Agent Blocked This Query</span>
          </div>
          <p className="text-sm text-amber-100/80 mb-3">{message.content}</p>
          {message.metadata?.blockedReason && (
            <div className="text-xs text-amber-100/60 border-t border-amber-500/20 pt-2 mt-2">
              Rule: {message.metadata.blockedReason}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (message.type === 'user') {
    return (
      <div className="flex justify-end my-3 animate-fade-in">
        <div className="max-w-xs md:max-w-md">
          <div className="bg-gradient-to-br from-blue-600 to-blue-500 text-white rounded-3xl rounded-tr-sm px-4 py-3 text-sm break-words">
            {message.content}
          </div>
          <div className="text-xs text-muted-foreground mt-1 text-right">{formatTime(message.timestamp)}</div>
        </div>
      </div>
    );
  }

  // Assistant or streaming message
  return (
    <div className="flex justify-start my-3 animate-fade-in">
      <div className="max-w-xs md:max-w-xl lg:max-w-3xl">
        {/* Avatar + Message */}
        <div className="flex gap-3">
          <div className="flex-shrink-0 w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500/25 to-cyan-400/15 border border-blue-400/25 flex items-center justify-center text-blue-200">
            <Bot className="w-4 h-4" />
          </div>
          <div className="bg-gradient-to-b from-slate-900/85 to-slate-950/90 border border-white/10 rounded-3xl rounded-tl-sm px-4 py-3.5 flex-1 shadow-[0_10px_24px_rgba(2,8,23,0.45)]">
            <StreamingText
              text={message.content}
              isStreaming={message.isStreaming || false}
            />
          </div>
        </div>

        <div className="text-xs text-muted-foreground mt-1 ml-11">{formatTime(message.timestamp)}</div>

        {/* Action buttons - only on non-streaming messages */}
        {!message.isStreaming && (
          <div className="flex gap-2 mt-2 ml-11 text-muted-foreground">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-xs hover:text-white transition-colors px-2 py-1 hover:bg-white/5 rounded"
              title="Copy message"
            >
              <Copy className="w-3.5 h-3.5" />
              {copied ? 'Copied!' : 'Copy'}
            </button>

            {onSpeak && (
              <button
                onClick={() => onSpeak(message.content)}
                className="flex items-center gap-1 text-xs hover:text-white transition-colors px-2 py-1 hover:bg-white/5 rounded"
                title="Read aloud"
              >
                <Volume2 className="w-3.5 h-3.5" />
                Read
              </button>
            )}

            {onLike && (
              <button
                onClick={onLike}
                className="flex items-center gap-1 text-xs hover:text-white transition-colors px-2 py-1 hover:bg-white/5 rounded"
                title="Like"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>
            )}

            {onDislike && (
              <button
                onClick={onDislike}
                className="flex items-center gap-1 text-xs hover:text-white transition-colors px-2 py-1 hover:bg-white/5 rounded"
                title="Dislike"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
