import type { Metadata } from "next";
import { ToastProvider } from "../components/ui/ToastProvider";
import { AppShell } from "../components/layout/AppShell";
import { ErrorBoundary } from "../components/ui/ErrorBoundary";
import "./globals.css";

const inter = { variable: "font-sans" };
const jetbrainsMono = { variable: "font-mono" };

import { ThemeProvider } from "../components/ui/ThemeProvider";

export const metadata: Metadata = {
  title: {
    template: '%s | SentinelAI',
    default: 'SentinelAI — AI-Powered Security Code Review',
  },
  description: 'Secure your code at the speed of thought. SentinelAI automatically scans your repositories, identifies critical vulnerabilities, and generates AI-powered patches via GPT-4.',
  keywords: ['security', 'code review', 'ai', 'gpt-4', 'vulnerability scanner', 'devsecops'],
  authors: [{ name: 'Amrit Mishra' }],
  creator: 'Amrit Mishra',
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://sentinelai.dev',
    title: 'SentinelAI — AI-Powered Security Code Review',
    description: 'Automated vulnerability scanning and AI-powered patch generation for modern development teams.',
    siteName: 'SentinelAI',
    images: [
      {
        url: 'https://sentinelai.dev/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'SentinelAI Dashboard Preview',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'SentinelAI — Security at the Speed of Thought',
    description: 'Automated vulnerability scanning and AI-powered patch generation.',
    creator: '@amritmishra',
    images: ['https://sentinelai.dev/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
  }
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
