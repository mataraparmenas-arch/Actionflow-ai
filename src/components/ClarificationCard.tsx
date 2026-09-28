"use client";

import React, { useState } from "react";
import { HelpCircle, ArrowRight, CornerDownLeft } from "lucide-react";

interface ClarificationCardProps {
  taskId: number;
  prompt: string;
  onSubmitClarification: (clarification: string) => Promise<void>;
}

export function ClarificationCard({
  taskId,
  prompt,
  onSubmitClarification,
}: ClarificationCardProps) {
  const [clarification, setClarification] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clarification.trim() || loading) return;

    setLoading(true);
    try {
      await onSubmitClarification(clarification.trim());
      setClarification("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-sky-500/40 bg-gradient-to-r from-sky-950/40 to-slate-900/40 p-5 shadow-lg shadow-sky-950/20 backdrop-blur-sm">
      <div className="flex items-start gap-4">
        <div className="rounded-lg bg-sky-500/20 p-2.5 text-sky-400">
          <HelpCircle className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded bg-sky-500/20 px-2 py-0.5 text-xs font-semibold tracking-wider text-sky-300 uppercase">
              Clarification Needed
            </span>
            <span className="text-xs text-sky-400/80 font-mono">
              Status: WAITING_FOR_INPUT
            </span>
          </div>

          <h3 className="mt-2 text-sm font-semibold text-slate-100">
            {prompt}
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            The agent detected that crucial parameters are missing to safely formulate a verifiable execution plan.
          </p>

          <form onSubmit={handleSubmit} className="mt-4 flex gap-2">
            <input
              type="text"
              value={clarification}
              onChange={(e) => setClarification(e.target.value)}
              placeholder="e.g., Sarah at 2 PM for 30 minutes..."
              disabled={loading}
              className="flex-1 rounded-lg border border-slate-700 bg-slate-900/90 px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!clarification.trim() || loading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-600 px-4 py-2 text-xs font-medium text-white shadow hover:bg-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-400 disabled:opacity-50 transition"
            >
              {loading ? (
                "Submitting..."
              ) : (
                <>
                  <span>Resume Plan</span>
                  <CornerDownLeft className="h-3.5 w-3.5" />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
