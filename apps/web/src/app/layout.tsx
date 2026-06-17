import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { EB_Garamond, Inter } from "next/font/google";
import { AppShell, AuthSessionProvider, PwaProvider, ThemeProvider } from "@/components";
import "./globals.css";

const ebGaramond = EB_Garamond({
  subsets: ["latin"],
  variable: "--font-eb-garamond",
  display: "swap"
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

export const metadata: Metadata = {
  title: {
    default: "tpt hearth",
    template: "%s | tpt hearth"
  },
  description: "A quiet digital lodge for presence, conversation, and human bonds.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "tpt hearth",
    statusBarStyle: "black-translucent"
  }
};

export const viewport: Viewport = {
  themeColor: "#2C2C2E",
  width: "device-width",
  initialScale: 1
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${ebGaramond.variable} ${inter.variable}`}>
      <body className="min-h-screen bg-ash font-sans text-sand antialiased">
        <ThemeProvider>
          <AuthSessionProvider>
            <PwaProvider>
              <AppShell>{children}</AppShell>
            </PwaProvider>
          </AuthSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}