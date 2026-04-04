"use client";

import { useState, useCallback, useMemo } from "react";
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
}

export function SearchBar({
  onSearch,
  onUseCurrentLocation,
  placeholder = "Search any city...",
  isLoading = false,
  isLocating = false,
  className = "",
  quickCities = [],
  showSuggestions = true,
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
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

  const handleSubmit = useCallback(() => {
    const trimmed = query.trim();
    if (trimmed && !isLoading) {
      onSearch(trimmed);
      persistRecent(trimmed);
      setIsFocused(false);
    }
  }, [query, isLoading, onSearch, persistRecent]);

  const submitSuggestion = useCallback(
    (city: string) => {
      setQuery(city);
      onSearch(city);
      persistRecent(city);
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

    const scored = unique
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
      .map((item) => item.city)
      .slice(0, 8);

    return scored;
  }, [quickCities, query, recentSearches]);

  const groupedSuggestions = useMemo(() => {
    const recentSet = new Set(recentSearches.map((item) => item.toLowerCase()));
    const recent = suggestions.filter((city) => recentSet.has(city.toLowerCase())).slice(0, 4);
    const popular = suggestions.filter((city) => !recentSet.has(city.toLowerCase())).slice(0, 4);
    return { recent, popular };
  }, [recentSearches, suggestions]);

  const showDropdown = showSuggestions && isFocused && suggestions.length > 0;

  return (
    <div className="relative w-full">
      <div
        className={`relative flex items-center w-full h-14 rounded-full border border-border-default bg-bg-card transition-all duration-200 focus-within:border-accent-blue focus-within:shadow-[0_0_0_3px_rgba(59,130,246,0.15)] ${className}`}
      >
        <div className="flex items-center justify-center pl-5 text-accent-cyan">
          <MapPin size={20} />
        </div>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 120)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="flex-1 h-full bg-transparent px-3 text-text-primary placeholder-text-muted outline-none text-sm font-medium"
          disabled={isLoading}
        />
        {query.trim() && !isLoading && (
          <button
            onClick={() => setQuery("")}
            className="flex items-center justify-center h-8 w-8 rounded-full text-text-muted hover:text-text-primary hover:bg-white/5 transition-colors cursor-pointer"
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
        <button
          onClick={handleSubmit}
          disabled={isLoading || !query.trim()}
          className="flex items-center justify-center h-10 w-10 mr-2 rounded-full bg-gradient-to-r from-accent-blue to-accent-cyan text-white transition-all duration-200 hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
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
            onClick={onUseCurrentLocation}
            disabled={isLoading || isLocating}
            className="flex items-center justify-center h-10 w-10 mr-2 rounded-full border border-border-default text-text-secondary hover:text-text-primary hover:border-accent-cyan transition-all duration-200 disabled:opacity-40 disabled:cursor-not-allowed"
            aria-label="Use current location"
            title="Use current location"
          >
            {isLocating ? <Loader2 size={16} className="animate-spin" /> : <Navigation size={16} />}
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="absolute left-0 right-0 top-[calc(100%+8px)] z-40 card p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[11px] uppercase tracking-wide text-text-muted">Suggestions</p>
            <p className="text-[11px] text-text-muted">Press Enter to search</p>
          </div>
          <div className="space-y-3">
            {groupedSuggestions.recent.length > 0 && (
              <div>
                <p className="text-[11px] text-text-muted mb-1.5">Recent</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {groupedSuggestions.recent.map((city) => (
                    <button
                      key={`recent-${city}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        submitSuggestion(city);
                      }}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-border-default bg-bg-secondary/40 text-sm text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <span className="truncate">{city}</span>
                      <Clock3 size={13} className="text-text-muted shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {groupedSuggestions.popular.length > 0 && (
              <div>
                <p className="text-[11px] text-text-muted mb-1.5">Popular Picks</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {groupedSuggestions.popular.map((city) => (
                    <button
                      key={`popular-${city}`}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        submitSuggestion(city);
                      }}
                      className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-border-default bg-bg-secondary/40 text-sm text-text-secondary hover:text-text-primary hover:bg-white/5 transition-colors cursor-pointer"
                    >
                      <span className="truncate">{city}</span>
                      <Sparkles size={13} className="text-accent-cyan shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
