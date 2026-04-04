"use client";

import { useState, useCallback } from "react";
import { MapPin, Search, Loader2 } from "lucide-react";

interface SearchBarProps {
  onSearch: (city: string) => void;
  placeholder?: string;
  isLoading?: boolean;
  className?: string;
}

export function SearchBar({
  onSearch,
  placeholder = "Search any city...",
  isLoading = false,
  className = "",
}: SearchBarProps) {
  const [query, setQuery] = useState("");

  const handleSubmit = useCallback(() => {
    const trimmed = query.trim();
    if (trimmed && !isLoading) {
      onSearch(trimmed);
    }
  }, [query, isLoading, onSearch]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSubmit();
    }
  };

  return (
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
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className="flex-1 h-full bg-transparent px-3 text-text-primary placeholder-text-muted outline-none text-sm font-medium"
        disabled={isLoading}
      />
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
    </div>
  );
}
