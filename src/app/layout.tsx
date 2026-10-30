import type { Metadata } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/ui/toast-provider';

export const metadata: Metadata = {
  title: 'ScamTrace – Explainable Digital Scam Investigation Platform',
  description:
    'An explainable digital scam detection and forensic investigation platform that transforms suspicious digital activity into actionable intelligence.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F7F9FC] text-[#0A2540]">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}

