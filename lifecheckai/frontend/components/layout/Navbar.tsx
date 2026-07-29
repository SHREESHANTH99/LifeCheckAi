"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Droplets, Map as MapIcon, MessageSquare, Bell } from "lucide-react";
import { LogoMark } from "@/components/ui/LogoMark";


const marketingLinks = [
  { href: "/dashboard", label: "Dashboard" },
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
          <div className="w-9 h-9 rounded-xl border border-accent-primary/30 flex items-center justify-center overflow-hidden bg-bg-secondary">
            <LogoMark size={24} className="text-text-primary" />
          </div>
          <span className="font-bold text-lg text-text-primary tracking-wide hidden sm:block">
            LifeCheck <span className="text-accent-primary">AI</span>
          </span>
        </Link>

        {/* Center Links */}
        <div className="hidden md:flex items-center gap-2 lg:gap-6 flex-1 justify-center">
          {mode === "marketing" ? (
            marketingLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-text-secondary hover:text-accent-primary interactive-base px-3 py-2"
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
                      ? "bg-white/10 text-accent-primary border-b-2 border-accent-primary"
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

        {/* Right CTA placeholder to maintain layout balance if needed, or remove completely */}
        <div className="flex items-center gap-4 shrink-0">
        </div>
      </div>
    </nav>
  );
}
