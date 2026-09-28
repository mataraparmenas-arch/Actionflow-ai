"use client";

import React, { useState } from "react";
import { PlayCircle, CheckCircle2, XCircle, RefreshCw, Cpu, Award } from "lucide-react";
import { TestSuiteSummary } from "@/lib/test/suite";

export function TestRunnerView() {
  const [running, setRunning] = useState(false);
  const [summary, setSummary] = useState<TestSuiteSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const runTests = async () => {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/test-runner", { method: "POST" });
      if (!res.ok) throw new Error("Failed to execute test suite");
      const json = await res.json();
      setSummary(json);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Award className="h-5 w-5 text-indigo-400" />
            <h3 className="text-sm font-semibold text-slate-100">
              System Test & Verification Console
            </h3>
          </div>
          <p className="mt-1 text-xs text-slate-400">
            Executes unit, state-machine, schema validation, prompt-injection, and full integration tests.
          </p>
        </div>

        <button
          onClick={runTests}
          disabled={running}
          className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-medium text-white shadow hover:bg-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-400 disabled:opacity-50 transition"
        >
          {running ? (
            <>
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>Running 13 Test Cases...</span>
            </>
          ) : (
            <>
              <PlayCircle className="h-4 w-4" />
              <span>Run Automated Test Suite</span>
            </>
          )}
        </button>
      </div>

      {error && (
        <div className="mt-4 rounded-lg border border-rose-500/30 bg-rose-950/20 p-3 text-xs text-rose-300">
          {error}
        </div>
      )}

      {summary && (
        <div className="mt-5 space-y-4">
          {/* Summary Score Bar */}
          <div className="flex items-center justify-between rounded-lg bg-slate-950/80 border border-slate-800 p-3">
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="text-slate-400">
                Total: <strong className="text-slate-100">{summary.total}</strong>
              </span>
              <span className="text-emerald-400">
                Passed: <strong>{summary.passed}</strong>
              </span>
              <span className={summary.failed > 0 ? "text-rose-400" : "text-slate-500"}>
                Failed: <strong>{summary.failed}</strong>
              </span>
              <span className="text-slate-400">
                Duration: <strong>{summary.durationMs}ms</strong>
              </span>
            </div>

            <span
              className={`rounded px-2 py-0.5 text-xs font-bold font-mono ${
                summary.failed === 0
                  ? "bg-emerald-500/20 text-emerald-400"
                  : "bg-rose-500/20 text-rose-400"
              }`}
            >
              {summary.failed === 0 ? "ALL CHECKS PASSED (100%)" : "FAILURES DETECTED"}
            </span>
          </div>

          {/* Test Items List */}
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {summary.results.map((test) => (
              <div
                key={test.id}
                className="flex items-center justify-between rounded-lg border border-slate-800/80 bg-slate-950/50 p-2.5 text-xs font-mono"
              >
                <div className="flex items-center gap-3">
                  {test.passed ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="h-4 w-4 text-rose-400 shrink-0" />
                  )}
                  <span className="text-slate-500 text-[11px]">{test.id}</span>
                  <span className="rounded bg-slate-800 px-1.5 py-0.2 text-[10px] text-slate-300">
                    {test.category}
                  </span>
                  <span className="text-slate-200">{test.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-slate-500">{test.durationMs}ms</span>
                  <span
                    className={`font-semibold ${
                      test.passed ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {test.passed ? "PASS" : "FAIL"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
