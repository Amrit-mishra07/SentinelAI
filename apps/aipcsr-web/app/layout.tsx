import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { ToastProvider } from "../components/ui/ToastProvider";
import { AppShell } from "../components/layout/AppShell";
import { ErrorBoundary } from "../components/ui/ErrorBoundary";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-geist-sans",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
  display: "swap",
});

import { ThemeProvider } from "../components/ui/ThemeProvider";

export const metadata: Metadata = {
  title: "SentinelAI — Security Scanner",
  description: "AI-powered security code review platform",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="antialiased min-h-screen bg-sentinel-base text-sentinel-text-primary">
        <ThemeProvider>
          <ToastProvider>
            <ErrorBoundary>
              <AppShell>
                {children}
              </AppShell>
            </ErrorBoundary>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
