import { useRef, useCallback, useState } from 'react';

export interface StreamOptions {
  city: string;
  profile: string;
  memory: StreamMemoryItem[];
  onChunk?: (text: string) => void;
  onMetadata?: (meta: unknown) => void;
  onSuggestions?: (suggestions: string[]) => void;
  onDone?: (finalText: string) => void;
}

export interface MemoryItem {
  type: 'city' | 'profile' | 'topic' | 'preference';
  value: string;
  addedAt: Date;
}

export interface SerializedMemoryItem {
  type: 'city' | 'profile' | 'topic' | 'preference';
  value: string;
  addedAt: string;
}

export interface StreamMemoryItem {
  type: 'city' | 'profile' | 'topic' | 'preference';
  value: string;
  addedAt: string | Date;
}

export interface StreamState {
  isStreaming: boolean;
  currentText: string;
  pendingCards: string[];
  pendingSuggestions: string[];
  error: string | null;
}

type StreamFrame =
  | { type: 'chunk'; text: string }
  | { type: 'metadata'; [key: string]: unknown }
  | { type: 'cards'; cards: string[] }
  | { type: 'suggestions'; suggestions: string[] }
  | { type: 'done' }
  | { type: 'error'; message?: string };

export const useStreamingChat = () => {
  const eventSourceRef = useRef<EventSource | null>(null);
  const [streamState, setStreamState] = useState<StreamState>({
    isStreaming: false,
    currentText: '',
    pendingCards: [],
    pendingSuggestions: [],
    error: null,
  });

  const apiBaseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://127.0.0.1:8000';

  const getApiUrl = useCallback(
    (path: string) => `${apiBaseUrl.replace(/\/$/, '')}${path}`,
    [apiBaseUrl]
  );

  const fallbackToRegularFetch = useCallback(
    async (query: string, options: StreamOptions, priorText: string) => {
      try {
        const userProfile = JSON.stringify({
          type: options.profile,
          default_city: options.city,
        });

        const response = await fetch(
          `${getApiUrl(`/api/ask?query=${encodeURIComponent(query)}&user_profile=${encodeURIComponent(userProfile)}`)}`,
          {
            method: 'GET',
          }
        );

        if (response.ok) {
          const data = await response.json();
          const finalText =
            priorText ||
            data.answer ||
            data.structured_answer?.summary ||
            data.structured_answer?.action ||
            '';

          setStreamState(prev => ({
            ...prev,
            currentText: finalText,
            isStreaming: false,
            pendingCards: data.cards || [],
            pendingSuggestions: data.suggestions || [],
          }));

          options.onSuggestions?.(data.suggestions || []);
          options.onDone?.(finalText);
          options.onMetadata?.(data);
        }
      } catch {
        setStreamState(prev => ({
          ...prev,
          isStreaming: false,
          error: 'Failed to fetch response',
        }));
      }
    },
    [getApiUrl]
  );

  const streamMessage = useCallback(
    async (query: string, options: StreamOptions) => {
      // Cancel any existing stream
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      setStreamState({
        isStreaming: true,
        currentText: '',
        pendingCards: [],
        pendingSuggestions: [],
        error: null,
      });

      try {
        const params = new URLSearchParams({
          query,
          city: options.city,
          profile: options.profile,
          memory: JSON.stringify(
            options.memory.map(item => ({
              ...item,
              addedAt:
                typeof item.addedAt === 'string'
                  ? item.addedAt
                  : item.addedAt.toISOString(),
            }))
          ),
        });

        const eventSource = new EventSource(
          getApiUrl(`/api/ask/stream?${params.toString()}`)
        );
        eventSourceRef.current = eventSource;
        let streamCompleted = false;

        let accumulatedText = '';
        let animationQueue: Promise<void> = Promise.resolve();

        const animateChunk = (rawText: string) => {
          const normalized = rawText || '';
          const pieces = normalized.match(/.{1,3}/g) || [];

          animationQueue = animationQueue.then(
            () =>
              new Promise<void>((resolve) => {
                if (!pieces.length) {
                  resolve();
                  return;
                }

                let index = 0;
                const pushPiece = () => {
                  if (index >= pieces.length) {
                    resolve();
                    return;
                  }

                  const piece = pieces[index++];
                  accumulatedText += piece;

                  setStreamState(prev => ({
                    ...prev,
                    currentText: accumulatedText,
                  }));

                  options.onChunk?.(piece);
                  setTimeout(pushPiece, 14);
                };

                pushPiece();
              })
          );
        };

        const finalizeStream = () => {
          streamCompleted = true;
          animationQueue.then(() => {
            eventSource.close();
            eventSourceRef.current = null;
            setStreamState(prev => ({
              ...prev,
              isStreaming: false,
              error: null,
            }));
            options.onDone?.(accumulatedText);
          });
        };

        eventSource.onmessage = (e: MessageEvent<string>) => {
          let frame: StreamFrame;
          try {
            frame = JSON.parse(e.data) as StreamFrame;
          } catch {
            return;
          }

          if (frame.type === 'chunk') {
            animateChunk(frame.text || '');
            return;
          }

          if (frame.type === 'metadata') {
            options.onMetadata?.(frame);
            return;
          }

          if (frame.type === 'cards') {
            setStreamState(prev => ({
              ...prev,
              pendingCards: Array.isArray(frame.cards) ? frame.cards : [],
            }));
            return;
          }

          if (frame.type === 'suggestions') {
            const suggestions = Array.isArray(frame.suggestions)
              ? frame.suggestions
              : [];
            setStreamState(prev => ({
              ...prev,
              pendingSuggestions: suggestions,
            }));
            options.onSuggestions?.(suggestions);
            return;
          }

          if (frame.type === 'error') {
            eventSource.close();
            eventSourceRef.current = null;
            setStreamState(prev => ({
              ...prev,
              isStreaming: false,
              error: frame.message || 'Streaming error. Falling back to standard fetch.',
            }));
            fallbackToRegularFetch(query, options, accumulatedText);
            return;
          }

          if (frame.type === 'done') {
            finalizeStream();
          }
        };

        eventSource.onerror = () => {
          if (streamCompleted) {
            return;
          }

          eventSource.close();
          eventSourceRef.current = null;

          setStreamState(prev => ({
            ...prev,
            isStreaming: false,
            error: 'Failed to stream response. Falling back to standard fetch.',
          }));

          // Fallback: use regular fetch
          fallbackToRegularFetch(query, options, accumulatedText);
        };
      } catch {
        setStreamState(prev => ({
          ...prev,
          isStreaming: false,
          error: 'Error initiating stream',
        }));
      }
    },
    [fallbackToRegularFetch, getApiUrl]
  );

  const cancelStream = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    setStreamState(prev => ({
      ...prev,
      isStreaming: false,
    }));
  }, []);

  return {
    streamMessage,
    cancelStream,
    ...streamState,
  };
};
