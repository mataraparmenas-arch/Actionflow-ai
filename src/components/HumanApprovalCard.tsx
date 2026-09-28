"use client";

import React, { useState } from "react";
import { ShieldAlert, CheckCircle2, XCircle, Send, AlertTriangle } from "lucide-react";

interface HumanApprovalCardProps {
  taskId: number;
  stepId: number;
  prompt: string;
  payload: any;
  onResolve: (stepId: number, approved: boolean) => Promise<void>;
}

export function HumanApprovalCard({
  taskId,
  stepId,
  prompt,
  payload,
  onResolve,
}: HumanApprovalCardProps) {
  const [submitting, setSubmitting] = useState(false);

  const handleDecision = async (approved: boolean) => {
    setSubmitting(true);
    try {
      await onResolve(stepId, approved);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-950/30 to-amber-900/10 p-5 shadow-lg shadow-amber-950/20 backdrop-blur-sm animate-pulse-subtle">
      <div className="flex items-start gap-4">
        <div className="rounded-lg bg-amber-500/20 p-2.5 text-amber-400">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs font-semibold tracking-wider text-amber-300 uppercase">
              Human-In-The-Loop Required
            </span>
            <span className="text-xs text-amber-400/80 font-mono">
              Action: EXTERNAL_SIDE_EFFECT
            </span>
          </div>

          <h3 className="mt-2 text-base font-semibold text-slate-100">
            {prompt}
          </h3>
          <p className="mt-1 text-xs text-slate-300">
            This operation communicates with external parties or systems. The agent will not proceed until you inspect the payload and grant explicit authorization.
          </p>

          {payload && (
            <div className="mt-3 rounded-lg border border-slate-700/80 bg-slate-900/90 p-3 text-xs font-mono">
              <div className="mb-1.5 flex items-center justify-between text-slate-400">
                <span className="font-semibold text-slate-300">Proposed Payload:</span>
                <span className="text-[11px] text-amber-400">Target Channel: {payload.channel || "email"}</span>
              </div>
              <div className="space-y-1 text-slate-200">
                {payload.recipient && (
                  <div><span className="text-slate-400">To:</span> {payload.recipient}</div>
                )}
                {payload.subject && (
                  <div><span className="text-slate-400">Subject:</span> {payload.subject}</div>
                )}
                {payload.body && (
                  <div className="mt-2 rounded border border-slate-800 bg-slate-950/60 p-2 text-slate-300">
                    <span className="text-slate-500 block mb-1">Message Body:</span>
                    {payload.body}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center gap-3">
            <button
              onClick={() => handleDecision(true)}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-medium text-white shadow hover:bg-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-50 transition"
            >
              <CheckCircle2 className="h-4 w-4" />
              {submitting ? "Processing..." : "Approve & Execute Action"}
            </button>
            <button
              onClick={() => handleDecision(false)}
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-lg bg-rose-900/40 border border-rose-700/50 px-4 py-2 text-xs font-medium text-rose-200 hover:bg-rose-900/60 focus:outline-none focus:ring-2 focus:ring-rose-400 disabled:opacity-50 transition"
            >
              <XCircle className="h-4 w-4" />
              Reject & Abort Step
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
