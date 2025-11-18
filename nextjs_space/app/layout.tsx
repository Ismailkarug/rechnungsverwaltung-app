
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "sonner";
import SessionWrapper from "@/components/session-wrapper";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Rechnungsverwaltung - Professionelle Rechnungsübersicht",
  description: "Moderne Rechnungsverwaltung mit Dashboard, Statistiken und Export-Funktionen",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
  openGraph: {
    title: "Rechnungsverwaltung",
    description: "Professionelle Rechnungsübersicht und -verwaltung",
    images: ["/og-image.png"],
  },
};

export const dynamic = "force-dynamic";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" suppressHydrationWarning>
      <body className={inter.className}>
        <SessionWrapper>
          <ThemeProvider
            attribute="class"
            defaultTheme="light"
            enableSystem={false}
            disableTransitionOnChange
          >
            {children}
            <Toaster />
            <SonnerToaster position="top-right" />
          </ThemeProvider>
        </SessionWrapper>
      </body>
    </html>
  );
}
