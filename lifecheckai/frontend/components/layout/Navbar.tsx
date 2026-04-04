"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Menu,
  X,
  ExternalLink,
  Bell,
  BellRing,
  AlertTriangle,
  ShieldAlert,
  CheckCheck,
} from "lucide-react";
import { showToast } from "@/components/ui/Toast";
import { useCommandPalette } from "@/hooks/useCommandPalette";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://127.0.0.1:8000";
const NAVBAR_ALERTS_READ_KEY = "lifecheck_nav_alerts_read_ids";
const NAVBAR_ALERTS_SEEN_KEY = "lifecheck_nav_alerts_seen_ids";

type LiveAlert = {
  city: string;
  type: string;
  level: string;
  message: string;
  timestamp?: string | null;
};

type LiveAlertsResponse = {
  active?: LiveAlert[];
  history?: LiveAlert[];
};

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/water", label: "Water" },
  { href: "/map", label: "Map" },
  { href: "/chat", label: "Chat" },
  { href: "/alerts", label: "Alerts" },
];

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [liveAlerts, setLiveAlerts] = useState<LiveAlert[]>([]);
  const [readAlertIds, setReadAlertIds] = useState<string[]>([]);
  const initializedSeenRef = useRef(false);
  const pathname = usePathname();
  const { open: openCommandPalette } = useCommandPalette();

  const alertIdentity = (alert: LiveAlert) =>
    `${alert.city}::${alert.type}::${alert.level}::${alert.message}::${alert.timestamp ?? "no-ts"}`;

  const sortedAlerts = useMemo(
    () =>
      [...liveAlerts].sort((a, b) => {
        const weight = (level: string) => {
          const normalized = String(level).toLowerCase();
          if (normalized === "unsafe") return 3;
          if (normalized === "caution") return 2;
          return 1;
        };

        const delta = weight(b.level) - weight(a.level);
        if (delta !== 0) return delta;

        const aTs = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const bTs = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return bTs - aTs;
      }),
    [liveAlerts]
  );

  const unreadCount = useMemo(
    () => sortedAlerts.filter((alert) => !readAlertIds.includes(alertIdentity(alert))).length,
    [sortedAlerts, readAlertIds]
  );

  useEffect(() => {
    try {
      const raw = localStorage.getItem(NAVBAR_ALERTS_READ_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setReadAlertIds(parsed.filter((item) => typeof item === "string"));
      }
    } catch {
      // Ignore localStorage parsing issues.
    }
  }, []);

  useEffect(() => {
    let active = true;

    const fetchAlerts = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/alerts/live`);
        if (!res.ok) return;

        const payload: LiveAlertsResponse = await res.json();
        const incoming = Array.isArray(payload.active)
          ? payload.active.filter((item) => !!item?.message)
          : [];

        if (!active) return;
        setLiveAlerts(incoming);

        const nextIds = incoming.map(alertIdentity);
        const prevSet = new Set<string>();
        try {
          const prevRaw = localStorage.getItem(NAVBAR_ALERTS_SEEN_KEY);
          if (prevRaw) {
            const parsed = JSON.parse(prevRaw);
            if (Array.isArray(parsed)) {
              parsed.forEach((item) => {
                if (typeof item === "string") prevSet.add(item);
              });
            }
          }
        } catch {
          // Ignore storage failures.
        }

        if (!initializedSeenRef.current) {
          localStorage.setItem(NAVBAR_ALERTS_SEEN_KEY, JSON.stringify(nextIds));
          initializedSeenRef.current = true;
          return;
        }

        for (const alert of incoming.slice(0, 5)) {
          const id = alertIdentity(alert);
          const level = String(alert.level).toLowerCase();
          if (!prevSet.has(id) && (level === "unsafe" || level === "caution")) {
            showToast(
              level === "unsafe" ? "error" : "warning",
              `${alert.city}: ${alert.message}`
            );
          }
        }

        localStorage.setItem(NAVBAR_ALERTS_SEEN_KEY, JSON.stringify(nextIds));
      } catch {
        // Silent fallback in navbar polling.
      }
    };

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const markAllRead = () => {
    const ids = sortedAlerts.map(alertIdentity);
    setReadAlertIds(ids);
    localStorage.setItem(NAVBAR_ALERTS_READ_KEY, JSON.stringify(ids));
  };

  const markOneRead = (id: string) => {
    setReadAlertIds((prev) => {
      if (prev.includes(id)) return prev;
      const next = [...prev, id];
      localStorage.setItem(NAVBAR_ALERTS_READ_KEY, JSON.stringify(next));
      return next;
    });
  };

  const formatRelativeTime = (timestamp?: string | null) => {
    if (!timestamp) return "just now";
    const ms = Date.now() - new Date(timestamp).getTime();
    if (Number.isNaN(ms) || ms < 60000) return "just now";
    const mins = Math.floor(ms / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 glass border-b border-border-default">
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-8 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-blue to-accent-cyan flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
            <Shield size={18} className="text-white" />
          </div>
          <span className="font-family-grotesk text-lg font-bold text-text-primary">
            LifeCheck <span className="text-accent-blue">AI</span>
          </span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`relative px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                  isActive
                    ? "text-accent-blue"
                    : "text-text-secondary hover:text-text-primary hover:bg-white/5"
                }`}
              >
                {link.label}
                {isActive && (
                  <motion.div
                    layoutId="activeNav"
                    className="absolute bottom-0 left-2 right-2 h-0.5 bg-accent-blue rounded-full"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-4">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => setNotifOpen((prev) => !prev)}
              className="relative w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              aria-label="Open notifications"
            >
              {unreadCount > 0 ? <BellRing size={18} className="text-accent-blue" /> : <Bell size={18} />}
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-unsafe text-white text-[10px] font-semibold flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </button>

            <AnimatePresence>
              {notifOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 8, scale: 0.98 }}
                  transition={{ duration: 0.18 }}
                  className="absolute right-0 mt-3 w-[320px] max-w-[calc(100vw-2rem)] rounded-2xl border border-border-default glass shadow-xl overflow-hidden"
                >
                  <div className="px-4 py-3 border-b border-border-default flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-text-primary">Notifications</p>
                      <p className="text-[11px] text-text-muted">Live critical and caution alerts</p>
                    </div>
                    <button
                      onClick={markAllRead}
                      disabled={sortedAlerts.length === 0}
                      className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-text-primary disabled:opacity-40 cursor-pointer"
                    >
                      <CheckCheck size={14} /> Mark all
                    </button>
                  </div>

                  <div className="max-h-80 overflow-y-auto">
                    {sortedAlerts.length === 0 ? (
                      <div className="px-4 py-6 text-center text-sm text-text-secondary">
                        No live alerts right now.
                      </div>
                    ) : (
                      sortedAlerts.slice(0, 8).map((alert) => {
                        const id = alertIdentity(alert);
                        const unread = !readAlertIds.includes(id);
                        const level = String(alert.level).toLowerCase();
                        const danger = level === "unsafe";

                        return (
                          <Link
                            href="/alerts"
                            key={id}
                            onClick={() => {
                              markOneRead(id);
                              setNotifOpen(false);
                              setMenuOpen(false);
                            }}
                            className={`block px-4 py-3 border-b border-border-default/70 hover:bg-white/5 transition-colors ${
                              unread ? "bg-accent-blue/8" : ""
                            }`}
                          >
                            <div className="flex items-start gap-2">
                              <div className={`mt-0.5 ${danger ? "text-unsafe" : "text-caution"}`}>
                                {danger ? <ShieldAlert size={15} /> : <AlertTriangle size={15} />}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs text-text-muted mb-1">{alert.city}</p>
                                <p className="text-sm text-text-primary line-clamp-2">{alert.message}</p>
                                <div className="mt-2 flex items-center justify-between">
                                  <span
                                    className={`text-[10px] uppercase tracking-wide font-semibold ${
                                      danger ? "text-unsafe" : "text-caution"
                                    }`}
                                  >
                                    {alert.level}
                                  </span>
                                  <span className="text-[10px] text-text-muted">
                                    {formatRelativeTime(alert.timestamp)}
                                  </span>
                                </div>
                              </div>
                              {unread && <span className="w-2 h-2 rounded-full bg-accent-blue mt-1" />}
                            </div>
                          </Link>
                        );
                      })
                    )}
                  </div>

                  <div className="px-4 py-2.5 border-t border-border-default">
                    <Link
                      href="/alerts"
                      onClick={() => {
                        setNotifOpen(false);
                        setMenuOpen(false);
                      }}
                      className="text-xs text-accent-blue hover:text-accent-cyan transition-colors"
                    >
                      View full alerts center
                    </Link>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Live indicator */}
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-safe/30 bg-safe/5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-safe opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-safe" />
            </span>
            <span className="text-xs font-medium text-safe">Live Data</span>
          </div>

          {/* GitHub */}
          <a
            href="https://github.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex w-9 h-9 rounded-lg bg-white/5 items-center justify-center text-text-secondary hover:text-text-primary transition-colors"
          >
            <ExternalLink size={18} />
          </a>

          <button
            onClick={openCommandPalette}
            className="hidden sm:inline-flex min-h-9 px-3 items-center rounded-full border border-border-default text-xs text-text-muted hover:text-text-primary hover:border-accent-blue transition-colors cursor-pointer"
            aria-label="Open command palette"
          >
            {typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)
              ? "⌘K"
              : "Ctrl+K"}
          </button>

          {/* Mobile hamburger */}
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            className="lg:hidden w-9 h-9 rounded-lg bg-white/5 flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden glass border-b border-border-default overflow-hidden"
          >
            <div className="px-4 py-4 flex flex-col gap-1">
              {navLinks.map((link) => {
                const isActive = pathname === link.href;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMenuOpen(false)}
                    className={`px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-accent-blue/10 text-accent-blue"
                        : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
                    }`}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
