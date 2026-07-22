"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "./ThemeToggle";
import { LayoutDashboard, Droplets, Map as MapIcon, MessageSquare, Bell } from "lucide-react";

export function Logo({ className = "", size = 24 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path opacity="0.6" d="M12 2L3 6V11.2C3 16.3 6.9 20.9 12 22C17.1 20.9 21 16.3 21 11.2V6L12 2Z" fill="url(#paint0_linear)"/>
      <path d="M12 4.5L5 7.5V11.5C5 15.3 8 18.8 12 19.5C16 18.8 19 15.3 19 11.5V7.5L12 4.5Z" fill="url(#paint1_linear)"/>
      <circle cx="12" cy="11.5" r="3" fill="white" className="drop-shadow-lg"/>
      <defs>
        <linearGradient id="paint0_linear" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--color-accent-violet)"/>
          <stop offset="1" stopColor="var(--color-accent-cyan)"/>
        </linearGradient>
        <linearGradient id="paint1_linear" x1="12" y1="4.5" x2="12" y2="19.5" gradientUnits="userSpaceOnUse">
          <stop stopColor="var(--color-accent-cyan)"/>
          <stop offset="1" stopColor="var(--color-accent-violet)"/>
        </linearGradient>
      </defs>
    </svg>
  );
}

const marketingLinks = [
  { href: "/dashboard", label: "Product" },
  { href: "/#features", label: "Features" },
  { href: "/#technology", label: "Technology" },
];

const appLinks = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/water", label: "Water", Icon: Droplets },
  { href: "/map", label: "Risk Map", Icon: MapIcon },
  { href: "/chat", label: "AI Chat", Icon: MessageSquare },
  { href: "/alerts", label: "Alerts", Icon: Bell },
];

export function Navbar({ mode = "marketing" }: { mode?: "marketing" | "app" }) {
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 glass border-b border-border-default shadow-[0_0_24px_rgba(0,0,0,0.4)] backdrop-blur-md">
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-8 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group shrink-0">
          <div className="w-9 h-9 rounded-xl glass border border-white/10 flex items-center justify-center transition-transform duration-300 group-hover:scale-110 shadow-[0_0_20px_var(--color-accent-cyan)] overflow-hidden">
            <Logo size={24} />
          </div>
          <span className="font-bold text-lg text-text-primary tracking-wide hidden sm:block">
            LifeCheck <span className="text-accent-cyan">AI</span>
          </span>
        </Link>

        {/* Center Links */}
        <div className="hidden md:flex items-center gap-2 lg:gap-6 flex-1 justify-center">
          {mode === "marketing" ? (
            marketingLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-text-secondary hover:text-accent-cyan transition-colors duration-200 px-3 py-2"
              >
                {link.label}
              </Link>
            ))
          ) : (
            appLinks.map((link) => {
              const isActive = pathname === link.href || pathname.startsWith(link.href + "/");
              const Icon = link.Icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-150 text-sm font-medium ${
                    isActive
                      ? "bg-white/10 text-accent-cyan shadow-[inset_0_-2px_0_var(--color-accent-cyan)]"
                      : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
                  }`}
                >
                  <Icon size={16} className={isActive ? "drop-shadow-[0_0_8px_rgba(0,212,255,0.8)]" : ""} />
                  <span className="hidden lg:block">{link.label}</span>
                </Link>
              );
            })
          )}
        </div>

        {/* Right CTA */}
        <div className="flex items-center gap-4 shrink-0">
          <ThemeToggle />
          {mode === "marketing" && (
            <Link
              href="/dashboard"
              className="btn-primary shadow-[0_0_15px_var(--color-accent-cyan)] drop-shadow-md text-sm whitespace-nowrap hover:scale-105"
            >
              Open App
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
