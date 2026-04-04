"use client";

import { SafetyProvider } from "@/app/context/SafetyContext";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ToastContainer } from "@/components/ui/Toast";
import { CommandPalette } from "@/components/command/CommandPalette";
import { CommandPaletteProvider } from "@/hooks/useCommandPalette";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

function LayoutShell({ children }: { children: ReactNode }) {
  const router = useRouter();

  return (
    <>
      <Navbar />
      <main className="pt-16 min-h-screen">{children}</main>
      <Footer />
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
    <SafetyProvider>
      <CommandPaletteProvider>
        <LayoutShell>{children}</LayoutShell>
      </CommandPaletteProvider>
    </SafetyProvider>
  );
}
