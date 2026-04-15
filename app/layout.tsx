import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Issue Tracker — Smart GitHub Monitoring",
  description:
    "A personal utility for open source contributors. Monitor GitHub issues, detect meaningful events, and receive smart notifications. Signal over noise.",
  keywords: ["GitHub", "issue tracker", "open source", "notifications", "Telegram"],
  openGraph: {
    title: "Issue Tracker",
    description: "Smart GitHub issue monitoring for open source contributors.",
    type: "website",
  },
};

import { Providers } from "@/components/Providers";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
