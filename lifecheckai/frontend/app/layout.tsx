import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LifeCheck AI — Real-time Safety Intelligence",
  description:
    "Real-time air quality, weather safety, pollen levels, and AI-powered health alerts for any city. Stay safe with LifeCheck AI.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}

// Client layout wrapper (separate component for "use client" boundary)
import { ClientLayout } from "./client-layout";
