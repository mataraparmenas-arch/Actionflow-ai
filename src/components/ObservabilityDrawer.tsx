"use client";

import React, { useState, useEffect } from "react";
import { Activity, ShieldCheck, Cpu, Terminal, Clock, RefreshCw } from "lucide-react";

export function ObservabilityDrawer() {
  const [data, setData] = useState<{
    metrics: { totalTasks: number; totalToolExecutions: number; totalAuditLogs: number };
    taskDistribution: Array<{ status: string; count: number }>;
    recentAuditLogs: any[];
    recentToolExecutions: any[];
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/observability");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load observability data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Total Agent Tasks</span>
            <Cpu className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-100">
            {data?.metrics.totalTasks ?? 0}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Tool Invocations</span>
            <Activity className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-emerald-300">
            {data?.metrics.totalToolExecutions ?? 0}
          </div>
        </div>

        <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-medium">Audit Trail Entries</span>
            <ShieldCheck className="h-4 w-4 text-purple-400" />
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-purple-300">
            {data?.metrics.totalAuditLogs ?? 0}
          </div>
        </div>
      </div>

      {/* Audit Log Stream */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-slate-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Structured Audit Trail
            </h4>
          </div>
          <button
            onClick={fetchStats}
            className="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 font-mono"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        <div className="space-y-2 max-h-80 overflow-y-auto font-mono text-xs pr-1">
          {(!data?.recentAuditLogs || data.recentAuditLogs.length === 0) ? (
            <div className="py-4 text-center text-slate-500">No audit logs recorded yet.</div>
          ) : (
            data.recentAuditLogs.map((log) => (
              <div
                key={log.id}
                className="flex items-start gap-2.5 rounded border border-slate-800/80 bg-slate-950/60 p-2 text-slate-300"
              >
                <span className="text-slate-500 text-[10px] shrink-0 mt-0.5">
                  {new Date(log.createdAt).toLocaleTimeString()}
                </span>
                <span
                  className={`rounded px-1.5 py-0.2 text-[10px] shrink-0 font-semibold ${
                    log.actor === "USER"
                      ? "bg-amber-500/20 text-amber-300"
                      : log.actor === "SYSTEM"
                      ? "bg-rose-500/20 text-rose-300"
                      : "bg-indigo-500/20 text-indigo-300"
                  }`}
                >
                  {log.actor}
                </span>
                <span className="text-indigo-200 font-semibold shrink-0">
                  [{log.action}]
                </span>
                <span className="text-slate-400 truncate">
                  Task #{log.taskId}: {JSON.stringify(log.details)}
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
