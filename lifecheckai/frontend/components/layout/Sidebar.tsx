"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Shield, LayoutDashboard, Map as MapIcon, MessageSquare, Bell, Droplets, User } from "lucide-react";
import { useState } from "react";
import { Logo } from "./Navbar";
import { ThemeToggle } from "./ThemeToggle";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", Icon: LayoutDashboard },
  { href: "/water", label: "Water", Icon: Droplets },
  { href: "/map", label: "Risk Map", Icon: MapIcon },
  { href: "/chat", label: "AI Chat", Icon: MessageSquare },
  { href: "/alerts", label: "Alerts", Icon: Bell },
];

export function Sidebar() {
  const pathname = usePathname();
  const [isHovered, setIsHovered] = useState(false);

  return (
    <aside
      className="fixed left-0 top-0 h-screen z-50 bg-[var(--color-bg-primary)]/95 backdrop-blur-2xl border-r border-border-default flex flex-col justify-between transition-all duration-300 ease-in-out shadow-[4px_0_24px_rgba(0,0,0,0.3)]"
      style={{ width: isHovered ? "220px" : "64px" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex flex-col">
        {/* Logo Section */}
        <Link href="/" className="h-16 flex items-center px-4 overflow-hidden border-b border-border-default">
          <div className="min-w-[32px] h-8 rounded-lg flex items-center justify-center drop-shadow-[0_0_8px_var(--color-accent-cyan)]">
            <Logo size={28} />
          </div>
          <span
            className="ml-4 font-bold text-lg whitespace-nowrap text-text-primary transition-opacity duration-200"
            style={{ opacity: isHovered ? 1 : 0 }}
          >
            LifeCheck AI
          </span>
        </Link>

        {/* Nav Links */}
        <nav className="flex flex-col gap-2 p-3 mt-4">
          {NAV_ITEMS.map(({ href, label, Icon }) => {
            const isActive = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-4 px-2 py-3 rounded-xl transition-all duration-150 group overflow-hidden ${
                  isActive
                    ? "bg-white/5 border-l-2 border-accent-cyan text-accent-cyan"
                    : "text-text-secondary hover:bg-white/5 hover:text-text-primary"
                }`}
                title={label}
              >
                <div className="min-w-[24px] flex items-center justify-center">
                  <Icon size={22} className={isActive ? "text-accent-cyan drop-shadow-[0_0_8px_rgba(0,212,255,0.8)]" : ""} />
                </div>
                <span
                  className="font-medium whitespace-nowrap transition-opacity duration-200"
                  style={{ opacity: isHovered ? 1 : 0 }}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Bottom User / Settings */}
      <div className="p-3 border-t border-border-default flex flex-col gap-2">
        <div className="flex items-center gap-4 px-1 rounded-xl transition-colors overflow-hidden group w-full">
           <ThemeToggle />
           <span className="font-medium whitespace-nowrap transition-opacity text-left text-sm text-text-secondary duration-200" style={{ opacity: isHovered ? 1 : 0 }}>App Theme</span>
        </div>
        <button className="flex items-center gap-4 px-2 py-3 rounded-xl hover:bg-white/5 text-text-muted hover:text-text-primary transition-colors overflow-hidden group w-full">
          <div className="min-w-[24px] flex items-center justify-center">
            <User size={22} style={{ color: "inherit" }} className="hover:text-accent-cyan transition-colors" />
          </div>
          <span
            className="font-medium whitespace-nowrap transition-opacity text-left duration-200"
            style={{ opacity: isHovered ? 1 : 0 }}
          >
            Settings
          </span>
        </button>
      </div>
    </aside>
  );
}
