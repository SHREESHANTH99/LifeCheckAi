"use client";

import { SafetyProvider } from "@/app/context/SafetyContext";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ToastContainer } from "@/components/ui/Toast";
import type { ReactNode } from "react";

export function ClientLayout({ children }: { children: ReactNode }) {
  return (
    <SafetyProvider>
      <Navbar />
      <main className="pt-16 min-h-screen">{children}</main>
      <Footer />
      <ToastContainer />
    </SafetyProvider>
  );
}
