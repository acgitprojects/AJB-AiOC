import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

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
      <body className="flex min-h-screen bg-[#040d18] text-slate-300">
        <Sidebar />
        {/* offset for fixed sidebar: 64px collapsed */}
        <main className="flex-1 min-w-0 ml-16 pt-14 lg:pt-0 overflow-auto bg-grid">
          {children}
        </main>
      </body>
    </html>
  );
}
