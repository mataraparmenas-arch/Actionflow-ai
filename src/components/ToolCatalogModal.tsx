"use client";

import React, { useState, useEffect } from "react";
import { Wrench, Shield, Lock, FileCode, CheckCircle2 } from "lucide-react";

export function ToolCatalogModal() {
  const [tools, setTools] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function load() {
      setLoading(true);
      try {
        const res = await fetch("/api/tools");
        if (res.ok) {
          const data = await res.json();
          setTools(data.tools || []);
        }
      } catch (err) {
        console.error("Failed to load tool catalog:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Wrench className="h-5 w-5 text-indigo-400" />
          <h3 className="text-sm font-semibold text-slate-100">
            Registered Tool System ({tools.length} Tools)
          </h3>
        </div>
        <span className="text-xs text-slate-400 font-mono">
          Strict Schema Isolation
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
        {tools.map((t) => (
          <div
            key={t.name}
            className="rounded-lg border border-slate-800/80 bg-slate-950/60 p-3.5 space-y-2 font-mono text-xs"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-200">{t.displayName}</span>
              <span
                className={`rounded px-1.5 py-0.5 text-[10px] uppercase font-semibold ${
                  t.permissionLevel === "EXTERNAL_SIDE_EFFECT"
                    ? "bg-rose-950/70 border border-rose-700/50 text-rose-300"
                    : t.permissionLevel === "WRITE"
                    ? "bg-amber-950/60 border border-amber-700/50 text-amber-300"
                    : "bg-blue-950/60 border border-blue-700/50 text-blue-300"
                }`}
              >
                {t.permissionLevel}
              </span>
            </div>

            <p className="text-[11px] text-slate-400 font-sans">{t.description}</p>

            <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800/60">
              <span className="text-slate-400 font-semibold block mb-0.5">Parameters:</span>
              <pre className="text-slate-400 whitespace-pre-wrap">
                {Object.entries(t.schemaDescription || {})
                  .map(([k, v]) => `• ${k}: ${v}`)
                  .join("\n")}
              </pre>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
