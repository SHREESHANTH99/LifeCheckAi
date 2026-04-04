import React, { useRef, useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { MessageBubble, ChatMessage } from './MessageBubble';

type DateSeparatorItem = {
  kind: 'date-separator';
  date: string;
};

type MessageListItem = ChatMessage | DateSeparatorItem;

interface MessageListProps {
  messages: ChatMessage[];
  onCopy?: (text: string) => void;
  onSpeak?: (text: string) => void;
  isLoading?: boolean;
}

export const MessageList: React.FC<MessageListProps> = ({
  messages,
  onCopy,
  onSpeak,
  isLoading = false,
}) => {
  const listRef = useRef<HTMLDivElement>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [lastSeenCount, setLastSeenCount] = useState(0);
  const unreadCount = isNearBottom ? 0 : Math.max(messages.length - lastSeenCount, 0);

  // Auto-scroll to bottom
  useEffect(() => {
    if (isNearBottom) {
      setTimeout(() => {
        listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 100);
    }
  }, [messages, isNearBottom]);

  // Track scroll position
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const isBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    
    if (isBottom && !isNearBottom) {
      setIsNearBottom(true);
      setLastSeenCount(messages.length);
    } else if (!isBottom && isNearBottom) {
      setIsNearBottom(false);
    }
  };

  const scrollToBottom = () => {
    setIsNearBottom(true);
    setLastSeenCount(messages.length);
    listRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  };

  // Group messages by date
  const groupedMessages = messages.reduce((acc, msg, idx) => {
    const msgDate = new Date(msg.timestamp).toDateString();
    const prevDate = idx > 0 ? new Date(messages[idx - 1].timestamp).toDateString() : null;
    
    if (msgDate !== prevDate) {
      acc.push({
        kind: 'date-separator',
        date: msgDate,
      } satisfies DateSeparatorItem);
    }
    acc.push(msg);
    return acc;
  }, [] as MessageListItem[]);

  return (
    <div
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto space-y-2 px-4 py-4 relative"
    >
      {/* Empty state */}
      {messages.length === 0 && !isLoading && (
        <div className="flex h-full items-start justify-center px-4 py-8">
          <div className="rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-xs text-slate-400">
            Start by asking a safety question for your city.
          </div>
        </div>
      )}

      {/* Messages */}
      {groupedMessages.map((item, idx) => {
        if ('kind' in item && item.kind === 'date-separator') {
          const date = new Date(item.date);
          const today = new Date().toDateString();
          const yesterdayDate = new Date();
          yesterdayDate.setDate(yesterdayDate.getDate() - 1);
          const yesterday = yesterdayDate.toDateString();
          
          let dateLabel = item.date;
          if (item.date === today) dateLabel = 'Today';
          else if (item.date === yesterday) dateLabel = 'Yesterday';
          else dateLabel = date.toLocaleDateString([], { month: 'short', day: 'numeric' });
          
          return (
            <div key={idx} className="flex justify-center my-4">
              <div className="text-xs text-muted-foreground">{dateLabel}</div>
            </div>
          );
        }

        return (
          <MessageBubble
            key={item.id}
            message={item}
            onCopy={onCopy}
            onSpeak={onSpeak}
          />
        );
      })}

      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-start my-3">
          <div className="flex gap-2 items-center p-3">
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
            <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
          </div>
        </div>
      )}

      {/* Scroll to bottom FAB */}
      {!isNearBottom && (
        <button
          onClick={scrollToBottom}
          className="fixed bottom-4 right-4 w-10 h-10 rounded-full bg-accent-blue hover:bg-blue-500 text-white flex items-center justify-center shadow-lg transition-all scale-in z-40"
        >
          <ChevronDown className="w-5 h-5" />
          {unreadCount > 0 && (
            <div className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
              {unreadCount}
            </div>
          )}
        </button>
      )}

      {/* Anchor for auto-scroll */}
      <div ref={listRef} />
    </div>
  );
};
