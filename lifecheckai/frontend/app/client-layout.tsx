"use client";

import { ThemeProvider } from "@/components/layout/ThemeContext";
import { SafetyProvider } from "@/app/context/SafetyContext";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Footer } from "@/components/layout/Footer";
import { ToastContainer } from "@/components/ui/Toast";
import { CommandPalette } from "@/components/command/CommandPalette";
import { CommandPaletteProvider } from "@/hooks/useCommandPalette";
import { useRouter, usePathname } from "next/navigation";
import type { ReactNode } from "react";

function LayoutShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLanding = pathname === "/";

  return (
    <>
      {isLanding ? <Navbar /> : <Sidebar />}
      <main className={`${isLanding ? 'pt-16' : 'pl-[64px]'} min-h-screen transition-all duration-300`}>
        {children}
      </main>
      {isLanding && <Footer />}
      <ToastContainer />
      <CommandPalette
        onCitySelect={(city) => router.push(`/dashboard?city=${encodeURIComponent(city)}`)}
        onVoiceBriefing={() => window.dispatchEvent(new CustomEvent("lifecheck:voice-briefing"))}
        onLocateMe={() => window.dispatchEvent(new CustomEvent("lifecheck:locate-me"))}
      />
    </>
  );
}

export function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <SafetyProvider>
      <CommandPaletteProvider>
        <LayoutShell>{children}</LayoutShell>
      </CommandPaletteProvider>
      </SafetyProvider>
    </ThemeProvider>
  );
}
