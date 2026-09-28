import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "AgentOS — Autonomous Task Execution & Workflow Platform",
  description: "Production-grade AI agent that plans, selects tools, validates execution, and enforces human-in-the-loop safety.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500/30 min-h-screen">
        {children}
      </body>
    </html>
  );
}
