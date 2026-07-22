"use client";

import { SafetyProvider } from "@/app/context/SafetyContext";
import { VoiceProvider } from "@/app/context/VoiceContext";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ToastContainer } from "@/components/ui/Toast";
import { CommandPalette } from "@/components/command/CommandPalette";
import { CommandPaletteProvider } from "@/hooks/useCommandPalette";
import { useRouter, usePathname } from "next/navigation";
import type { ReactNode } from "react";

// Dynamic import of SpaceTimeDB provider with fallback
const SpacetimeDBProvider = ({ children }: { children: ReactNode }) => {
    // Note: SpaceTimeDB provider disabled for now as SDK compatibility needs resolution
    // Hooks will gracefully handle fallback when not configured
    return <>{children}</>;
};
  

function LayoutShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isLanding = pathname === "/";
  const navMode = isLanding ? "marketing" : "app";

  return (
    <>
      <Navbar mode={navMode} />
      <main className="pt-16 min-h-screen transition-all duration-300">
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
    <SpacetimeDBProvider>
      <VoiceProvider>
        <SafetyProvider>
          <CommandPaletteProvider>
            <LayoutShell>{children}</LayoutShell>
          </CommandPaletteProvider>
        </SafetyProvider>
      </VoiceProvider>
    </SpacetimeDBProvider>
  );
}
