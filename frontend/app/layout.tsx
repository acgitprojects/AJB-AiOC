import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "AiOC — AI Operations Centre",
  description: "OpenClaw Operations Centre — AskJary Business",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap"
        />
      </head>
      <body className="flex min-h-screen bg-[#040d18] text-slate-300">
        <Providers>
          <Sidebar />
          {/* offset for fixed sidebar: 64px collapsed */}
          <main className="flex-1 min-w-0 ml-16 pt-14 lg:pt-0 overflow-auto bg-grid">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
