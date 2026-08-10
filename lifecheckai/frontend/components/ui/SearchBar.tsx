"use client";

import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { MapPin, Navigation, Search, Loader2, Clock3, Sparkles, X } from "lucide-react";

const RECENT_SEARCHES_KEY = "lifecheck_recent_searches";
const MAX_RECENT = 6;
const DEFAULT_POPULAR_CITIES = [
  "Mumbai",
  "Delhi",
  "Bangalore",
  "Chennai",
  "Hyderabad",
  "Kolkata",
  "Pune",
  "Ahmedabad",
];

interface SearchBarProps {
  onSearch: (city: string) => void;
  onUseCurrentLocation?: () => void;
  placeholder?: string;
  isLoading?: boolean;
  isLocating?: boolean;
  className?: string;
  quickCities?: string[];
  showSuggestions?: boolean;
  fetchSuggestions?: (query: string) => Promise<Array<{ value: string; subtitle?: string }>>;
}

type SuggestionItem = {
  value: string;
  subtitle?: string;
};

export function SearchBar({
  onSearch,
  onUseCurrentLocation,
  placeholder = "Search any city...",
  isLoading = false,
  isLocating = false,
  className = "",
  quickCities = [],
  showSuggestions = true,
  fetchSuggestions,
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [remoteSuggestions, setRemoteSuggestions] = useState<SuggestionItem[]>([]);
  const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
  const requestIdRef = useRef(0);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const raw = localStorage.getItem(RECENT_SEARCHES_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter((item) => typeof item === "string").slice(0, MAX_RECENT)
        : [];
    } catch {
      return [];
    }
  });

  const persistRecent = useCallback((city: string) => {
    setRecentSearches((prev) => {
      const next = [city, ...prev.filter((item) => item.toLowerCase() !== city.toLowerCase())].slice(0, MAX_RECENT);
      localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const requestRemoteSuggestions = useCallback(
    (inputValue: string) => {
      if (!fetchSuggestions) {
        setRemoteSuggestions([]);
        return;
      }

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      const trimmed = inputValue.trim();
      if (trimmed.length < 2) {
        setRemoteSuggestions([]);
        setIsFetchingSuggestions(false);
        return;
      }

      setIsFetchingSuggestions(true);
      const requestId = ++requestIdRef.current;
      debounceTimerRef.current = setTimeout(async () => {
        try {
          const suggestions = await fetchSuggestions(trimmed);
          if (requestIdRef.current !== requestId) return;
          setRemoteSuggestions(suggestions.slice(0, 8));
        } catch {
          if (requestIdRef.current !== requestId) return;
          setRemoteSuggestions([]);
        } finally {
          if (requestIdRef.current === requestId) {
            setIsFetchingSuggestions(false);
          }
        }
      }, 220);
    },
    [fetchSuggestions],
  );

  const handleSubmit = useCallback(() => {
    const trimmed = query.trim();
    if (trimmed && !isLoading) {
      onSearch(trimmed);
      persistRecent(trimmed);
      setIsFocused(false);
    }
  }, [query, isLoading, onSearch, persistRecent]);

  const submitSuggestion = useCallback(
    (suggestion: { value: string }) => {
      setQuery(suggestion.value);
      onSearch(suggestion.value);
      persistRecent(suggestion.value);
      setIsFocused(false);
    },
    [onSearch, persistRecent],
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
    if (e.key === "Escape") {
      setIsFocused(false);
    }
  };

  const suggestions = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const merged = [...recentSearches, ...quickCities, ...DEFAULT_POPULAR_CITIES];
    const unique = merged.filter((city, index) => merged.findIndex((x) => x.toLowerCase() === city.toLowerCase()) === index);

    const scored: Array<{ value: string; subtitle?: string }> = unique
      .map((city) => {
        const lower = city.toLowerCase();
        let score = 0;
        if (!normalizedQuery) {
          score = recentSearches.some((item) => item.toLowerCase() === lower) ? 90 : 60;
        } else if (lower === normalizedQuery) {
          score = 120;
        } else if (lower.startsWith(normalizedQuery)) {
          score = 100;
        } else if (lower.includes(normalizedQuery)) {
          score = 70;
        }

        if (recentSearches.some((item) => item.toLowerCase() === lower)) score += 8;
        if (quickCities.some((item) => item.toLowerCase() === lower)) score += 4;
        return { city, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 8)
      .map((item) => ({ value: item.city, subtitle: undefined }));

    const remote = remoteSuggestions
      .filter((entry) => entry.value)
      .map((entry) => ({ value: entry.value, subtitle: entry.subtitle } as SuggestionItem));

    const localByValue = new Set(scored.map((entry) => entry.value.toLowerCase()));
    const mergedSuggestions: Array<{ value: string; subtitle?: string }> = [
      ...remote,
      ...scored.filter((entry) => !localByValue.has(entry.value.toLowerCase())),
    ];

    const deduped = mergedSuggestions.filter(
      (entry, index) =>
        mergedSuggestions.findIndex((item) => item.value.toLowerCase() === entry.value.toLowerCase()) === index,
    );

    return deduped.slice(0, 10);
  }, [quickCities, query, recentSearches, remoteSuggestions]);

  const groupedSuggestions = useMemo(() => {
    const recentSet = new Set(recentSearches.map((item) => item.toLowerCase()));
    const recent = suggestions.filter((entry) => recentSet.has(entry.value.toLowerCase())).slice(0, 4);
    const live = suggestions
      .filter((entry) => !!entry.subtitle && !recentSet.has(entry.value.toLowerCase()))
      .slice(0, 4);
    const popular = suggestions
      .filter((entry) => !entry.subtitle && !recentSet.has(entry.value.toLowerCase()))
      .slice(0, 4);
    return { recent, live, popular };
  }, [recentSearches, suggestions]);

  const showDropdown =
    showSuggestions &&
    isFocused &&
    (suggestions.length > 0 || isFetchingSuggestions || query.trim().length >= 2);

  return (
    <div className="relative w-full">
      <div
        className={`relative flex items-center w-full h-14 rounded-full border border-slate-700/80 bg-bg-card transition-all duration-200 focus-within:border-accent-primary/40 focus-within:ring-1 focus-within:ring-accent-primary/40 ${className}`}
      >
        <div className="flex items-center justify-center pl-5 text-white">
          <MapPin size={20} />
        </div>
        <input
          suppressHydrationWarning
          type="text"
          value={query}
          onChange={(e) => {
            const nextValue = e.target.value;
            setQuery(nextValue);
            requestRemoteSuggestions(nextValue);
          }}
          onFocus={() => {
            setIsFocused(true);
            requestRemoteSuggestions(query);
          }}
          onBlur={() => setTimeout(() => setIsFocused(false), 120)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 h-full bg-transparent px-3 text-text-primary placeholder-text-muted outline-none text-sm font-medium"
          disabled={isLoading}
        />
        {query.trim() && !isLoading && (
          <button
            suppressHydrationWarning
            onClick={() => setQuery("")}
            className="flex items-center justify-center h-8 w-8 rounded-full text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
        <button
          suppressHydrationWarning
          onClick={handleSubmit}
          disabled={isLoading || !query.trim()}
          className="flex items-center justify-center h-10 w-10 shrink-0 mr-2 rounded-full bg-accent-primary text-white hover:brightness-110 hover:scale-105 active:scale-95 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-md"
          aria-label="Search"
        >
          {isLoading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <Search size={18} />
          )}
        </button>
        {onUseCurrentLocation && (
          <button
            suppressHydrationWarning
            onClick={onUseCurrentLocation}
            disabled={isLoading || isLocating}
            className="flex items-center justify-center h-10 w-10 mr-2 rounded-full border-2 border-slate-700/80 text-white hover:border-accent-primary/40 hover:bg-white/5 transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Use current location"
            title="Use current location"
          >
            {isLocating ? <Loader2 size={16} className="animate-spin" /> : <Navigation size={16} />}
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-[60] bg-bg-primary rounded-xl border border-border-default p-3 shadow-[0_8px_30px_rgba(0,0,0,0.6)]">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] uppercase tracking-wide text-text-muted">Suggestions</p>
            <p className="text-[11px] text-text-muted">Press Enter to search</p>
          </div>
          <div className="space-y-3">
            {isFetchingSuggestions && (
              <div className="text-xs text-text-muted flex items-center gap-2">
                <Loader2 size={12} className="animate-spin" /> Finding locations...
              </div>
            )}

            {groupedSuggestions.recent.length > 0 && (
              <div>
                <p className="text-[11px] text-text-muted mb-1.5">Recent</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {groupedSuggestions.recent.map((entry) => (
                    <button
                      key={`recent-${entry.value}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        submitSuggestion(entry);
                      }}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-border-default bg-bg-secondary/40 text-sm text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <span className="truncate">{entry.value}</span>
                      <Clock3 size={13} className="text-text-muted shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {groupedSuggestions.live.length > 0 && (
              <div>
                <p className="text-[11px] text-text-muted mb-1.5">Location Matches</p>
                <div className="grid grid-cols-1 gap-2">
                  {groupedSuggestions.live.map((entry) => (
                    <button
                      key={`live-${entry.value}-${entry.subtitle || ""}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        submitSuggestion(entry);
                      }}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-border-default bg-bg-secondary/40 text-sm text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <span className="min-w-0">
                        <span className="truncate block text-text-primary">{entry.value}</span>
                        {entry.subtitle && <span className="truncate block text-[11px] text-text-muted">{entry.subtitle}</span>}
                      </span>
                      <MapPin size={13} className="text-accent-primary shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {groupedSuggestions.popular.length > 0 && (
              <div>
                <p className="text-[11px] text-text-muted mb-1.5">Popular Picks</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {groupedSuggestions.popular.map((entry) => (
                    <button
                      key={`popular-${entry.value}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        submitSuggestion(entry);
                      }}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-border-default bg-bg-secondary/40 text-sm text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <span className="truncate">{entry.value}</span>
                      <Sparkles size={13} className="text-accent-primary shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {!isFetchingSuggestions && suggestions.length === 0 && query.trim().length >= 2 && (
              <div className="text-xs text-text-muted">No location suggestions found. Press Enter to search directly.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
