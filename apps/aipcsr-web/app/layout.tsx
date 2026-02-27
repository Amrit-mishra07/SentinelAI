import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AIpSCR - AI-Powered Security Code Review',
  description: 'Automated security vulnerability scanning and patching',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
