"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  Search,
  LayoutDashboard,
  Map,
  MessageSquare,
  Bell,
  Droplets,
  Mic,
  LocateFixed,
  RefreshCw,
  User,
  Shield,
  ArrowRight,
} from "lucide-react";
import { useCommandPalette } from "@/hooks/useCommandPalette";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";
const RECENT_KEY = "lifecheck_recent_searches";

type CityResult = { value: string; subtitle?: string };

type PaletteAction = {
  id: string;
  label: string;
  subtitle: string;
  icon: React.ReactNode;
  shortcut?: string;
  run: () => void;
};

interface CommandPaletteProps {
  onCitySelect: (city: string) => void;
  onVoiceBriefing: () => void;
  onLocateMe: () => void;
}

export function CommandPalette({
  onCitySelect,
  onVoiceBriefing,
  onLocateMe,
}: CommandPaletteProps) {
  const router = useRouter();
  const { isOpen, close } = useCommandPalette();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [cityResults, setCityResults] = useState<CityResult[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);

  const isMac = useMemo(
    () => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform),
    []
  );

  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setSelectedIndex(0);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || query.trim().length < 2) {
      setCityResults([]);
      setLoadingCities(false);
      return;
    }

    let active = true;
    setLoadingCities(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `${API_BASE}/api/location-suggestions?q=${encodeURIComponent(query)}&limit=8`
        ).catch(() => null);
        if (!res?.ok || !active) {
          if (active) setCityResults([]);
          return;
        }
        const payload = await res.json();
        const suggestions = Array.isArray(payload?.suggestions) ? payload.suggestions : [];
        const mapped = suggestions
          .map((entry: { city?: string; formatted_address?: string }) => ({
            value: entry.city || entry.formatted_address || "",
            subtitle: entry.formatted_address,
          }))
          .filter((entry: CityResult) => !!entry.value)
          .slice(0, 8);
        setCityResults(mapped);
      } finally {
        if (active) setLoadingCities(false);
      }
    }, 220);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [isOpen, query]);

  const recent = useMemo(() => {
    if (typeof window === "undefined") return [] as string[];
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed)
        ? parsed.filter((item) => typeof item === "string").slice(0, 5)
        : [];
    } catch {
      return [];
    }
  }, [isOpen]);

  const pages: PaletteAction[] = [
    {
      id: "page-dashboard",
      label: "Dashboard",
      subtitle: "View safety metrics",
      icon: <LayoutDashboard size={16} className="text-accent-primary" />,
      run: () => router.push("/dashboard"),
    },
    {
      id: "page-map",
      label: "Map",
      subtitle: "Live city map",
      icon: <Map size={16} className="text-accent-blue" />,
      run: () => router.push("/map"),
    },
    {
      id: "page-chat",
      label: "Chat",
      subtitle: "Ask AI assistant",
      icon: <MessageSquare size={16} className="text-accent-purple" />,
      run: () => router.push("/chat"),
    },
    {
      id: "page-alerts",
      label: "Alerts",
      subtitle: "View active alerts",
      icon: <Bell size={16} className="text-caution" />,
      run: () => router.push("/alerts"),
    },
    {
      id: "page-water",
      label: "Water Quality",
      subtitle: "State water analysis",
      icon: <Droplets size={16} className="text-accent-blue" />,
      run: () => router.push("/water"),
    },
  ];

  const actions: PaletteAction[] = [
    {
      id: "action-voice",
      label: "Play Voice Briefing",
      subtitle: "Speak latest safety snapshot",
      icon: <Mic size={16} className="text-accent-primary" />,
      run: onVoiceBriefing,
      shortcut: isMac ? "Cmd+B" : "Ctrl+B",
    },
    {
      id: "action-locate",
      label: "Use My Location",
      subtitle: "Run geolocation safety check",
      icon: <LocateFixed size={16} className="text-accent-green" />,
      run: onLocateMe,
      shortcut: isMac ? "Cmd+L" : "Ctrl+L",
    },
    {
      id: "action-refresh",
      label: "Refresh Data",
      subtitle: "Refresh active page safety data",
      icon: <RefreshCw size={16} className="text-text-secondary" />,
      run: () => window.dispatchEvent(new CustomEvent("lifecheck:refresh")),
      shortcut: isMac ? "Cmd+R" : "Ctrl+R",
    },
    {
      id: "action-profile",
      label: "Change Health Profile",
      subtitle: "Open personalization selector",
      icon: <User size={16} className="text-accent-blue" />,
      run: () => window.dispatchEvent(new CustomEvent("lifecheck:open-profile")),
    },
  ];

  const cityActions: PaletteAction[] = cityResults.map((entry, index) => ({
    id: `city-${entry.value}-${index}`,
    label: entry.value,
    subtitle: entry.subtitle || "Check safety",
    icon: <ArrowRight size={16} className="text-accent-primary" />,
    run: () => onCitySelect(entry.value),
  }));

  const recentActions: PaletteAction[] = recent.map((cityName, index) => ({
    id: `recent-${cityName}-${index}`,
    label: cityName,
    subtitle: "Recent search",
    icon: <ArrowRight size={16} className="text-text-secondary" />,
    run: () => onCitySelect(cityName),
  }));

  const allResults: PaletteAction[] = [
    ...pages,
    ...actions,
    ...(query.trim() ? cityActions : []),
    ...(!query.trim() ? recentActions : []),
  ];

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(allResults.length, 1));
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSelectedIndex((prev) =>
          prev === 0 ? Math.max(allResults.length - 1, 0) : prev - 1
        );
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const target = allResults[selectedIndex];
        if (!target) return;
        target.run();
        close();
      }
      if (event.key === "Escape") {
        event.preventDefault();
        close();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [allResults, close, isOpen, selectedIndex]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm px-4"
          onClick={close}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.12 }}
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-2xl mx-auto mt-[16vh] rounded-2xl border border-border-default bg-bg-card shadow-[0_25px_60px_rgba(0,0,0,0.5)] overflow-hidden"
          >
            <div className="h-[60px] border-b border-border-default px-4 flex items-center gap-3">
              <Search size={18} className="text-text-muted" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search cities, navigate pages, or ask anything..."
                className="flex-1 bg-transparent outline-none text-lg text-text-primary placeholder-text-muted"
                autoFocus
              />
              <span className="px-2 py-1 rounded-md text-[10px] border border-border-default text-text-muted">ESC</span>
            </div>

            <div className="max-h-[400px] overflow-y-auto">
              {loadingCities && query.trim().length >= 2 && (
                <div className="px-4 py-3 text-xs text-text-muted">Searching cities...</div>
              )}
              {allResults.map((item, index) => (
                <button
                  key={item.id}
                  onClick={() => {
                    item.run();
                    close();
                  }}
                  className={`w-full min-h-12 px-4 py-2 flex items-center gap-3 text-left border-l-2 transition-colors cursor-pointer ${
                    index === selectedIndex
                      ? "bg-accent-blue/10 border-l-accent-blue"
                      : "border-l-transparent hover:bg-accent-blue/10"
                  }`}
                >
                  <span className="w-5 h-5 flex items-center justify-center">{item.icon}</span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm text-text-primary font-medium truncate">{item.label}</span>
                    <span className="block text-xs text-text-muted truncate">{item.subtitle}</span>
                  </span>
                  {item.shortcut && (
                    <span className="text-[10px] text-text-muted border border-border-default px-1.5 py-0.5 rounded">
                      {item.shortcut}
                    </span>
                  )}
                </button>
              ))}
            </div>

            <div className="h-9 border-t border-border-default px-4 flex items-center justify-between text-xs text-text-muted">
              <div className="flex items-center gap-3">
                <span>↑↓ navigate</span>
                <span>↵ select</span>
                <span>esc close</span>
              </div>
              <div className="inline-flex items-center gap-1.5">
                <Shield size={12} /> LifeCheck AI
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
