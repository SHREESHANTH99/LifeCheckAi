"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Shield, Menu, X, ExternalLink } from "lucide-react";

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
  const pathname = usePathname();

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 h-16 glass border-b border-border-default">
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-8 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent-blue to-accent-cyan flex items-center justify-center transition-transform duration-200 group-hover:scale-110">
            <Shield size={18} className="text-white" />
          </div>
          <span className="font-[family-name:var(--font-family-grotesk)] text-lg font-bold text-text-primary">
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
