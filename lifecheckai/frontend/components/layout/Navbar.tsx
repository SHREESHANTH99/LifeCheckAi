"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Droplets, Map as MapIcon, MessageSquare, Bell } from "lucide-react";

export function Logo({ className = "", size = 24 }: { className?: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
      <path d="M12 2L3 6V11.2C3 16.3 6.9 20.9 12 22C17.1 20.9 21 16.3 21 11.2V6L12 2Z" fill="var(--color-accent-cyan)" />
      <path d="M12 4.5L5 7.5V11.5C5 15.3 8 18.8 12 19.5C16 18.8 19 15.3 19 11.5V7.5L12 4.5Z" fill="var(--color-bg-primary)" stroke="var(--color-accent-cyan)" strokeWidth="2" strokeLinejoin="round" />
      <circle cx="12" cy="11.5" r="3" fill="var(--color-accent-cyan)" />
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
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 glass border-b border-border-default backdrop-blur-md">
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-8 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 shrink-0 interactive-base">
          <div className="w-9 h-9 rounded-xl border border-accent-cyan/30 flex items-center justify-center overflow-hidden bg-bg-secondary">
            <Logo size={20} />
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
                className="text-sm font-medium text-text-secondary hover:text-accent-cyan interactive-base px-3 py-2"
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
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg interactive-base text-sm font-medium ${
                    isActive
                      ? "bg-white/10 text-accent-cyan border-b-2 border-accent-cyan"
                      : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
                  }`}
                >
                  <Icon size={16} />
                  <span className="hidden lg:block">{link.label}</span>
                </Link>
              );
            })
          )}
        </div>

        {/* Right CTA */}
        <div className="flex items-center gap-4 shrink-0">
          {mode === "marketing" && (
            <Link
              href="/dashboard"
              className="bg-accent-cyan text-bg-primary rounded-full px-5 py-2 text-sm font-semibold interactive-base"
            >
              Open App
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
