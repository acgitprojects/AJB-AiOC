import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";

export const metadata: Metadata = {
  title: "AJB Ops Centre",
  description: "OpenClaw Operations Centre — AskJary Business",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen bg-slate-50">
        <Sidebar />
        <main className="flex-1 min-w-0 pt-14 lg:pt-0 overflow-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
