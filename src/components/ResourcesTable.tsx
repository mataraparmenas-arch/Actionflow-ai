"use client";

import React, { useState, useEffect } from "react";
import { CheckSquare, Bell, Calendar, Mail, RefreshCw, Database } from "lucide-react";

export function ResourcesTable() {
  const [tab, setTab] = useState<"tasks" | "reminders" | "calendar" | "messages">("tasks");
  const [data, setData] = useState<{
    managedTasks: any[];
    reminders: any[];
    calendarEvents: any[];
    sentMessages: any[];
  }>({
    managedTasks: [],
    reminders: [],
    calendarEvents: [],
    sentMessages: [],
  });
  const [loading, setLoading] = useState(false);

  const fetchResources = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/resources");
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error("Failed to load resources:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchResources();
    const interval = setInterval(fetchResources, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-indigo-400" />
          <h3 className="text-sm font-semibold text-slate-100">PostgreSQL Resources Explorer</h3>
          <span className="text-xs text-slate-400 font-mono">
            (Live system state)
          </span>
        </div>

        <button
          onClick={fetchResources}
          disabled={loading}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1.5 text-xs text-slate-300 hover:bg-slate-700/80 transition"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="mt-4 flex gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setTab("tasks")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            tab === "tasks"
              ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <CheckSquare className="h-4 w-4" />
          Tasks ({data.managedTasks.length})
        </button>
        <button
          onClick={() => setTab("reminders")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            tab === "reminders"
              ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Bell className="h-4 w-4" />
          Reminders ({data.reminders.length})
        </button>
        <button
          onClick={() => setTab("calendar")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            tab === "calendar"
              ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Calendar className="h-4 w-4" />
          Calendar Events ({data.calendarEvents.length})
        </button>
        <button
          onClick={() => setTab("messages")}
          className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
            tab === "messages"
              ? "bg-indigo-600/20 text-indigo-300 border border-indigo-500/30"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Mail className="h-4 w-4" />
          Sent Messages ({data.sentMessages.length})
        </button>
      </div>

      {/* Tab Panels */}
      <div className="mt-4 overflow-x-auto">
        {tab === "tasks" && (
          data.managedTasks.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500">No managed tasks created yet.</div>
          ) : (
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-2 font-semibold">ID</th>
                  <th className="pb-2 font-semibold">Title</th>
                  <th className="pb-2 font-semibold">Priority</th>
                  <th className="pb-2 font-semibold">Status</th>
                  <th className="pb-2 font-semibold">Due Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {data.managedTasks.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 text-slate-500">#{t.id}</td>
                    <td className="py-2.5 font-medium text-slate-200">{t.title}</td>
                    <td className="py-2.5">
                      <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] uppercase">
                        {t.priority}
                      </span>
                    </td>
                    <td className="py-2.5">
                      <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-400">
                        {t.status}
                      </span>
                    </td>
                    <td className="py-2.5 text-slate-400">
                      {t.dueDate ? new Date(t.dueDate).toLocaleString() : "None"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {tab === "reminders" && (
          data.reminders.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500">No reminders scheduled yet.</div>
          ) : (
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-2 font-semibold">ID</th>
                  <th className="pb-2 font-semibold">Reminder Subject</th>
                  <th className="pb-2 font-semibold">Scheduled For</th>
                  <th className="pb-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {data.reminders.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 text-slate-500">#{r.id}</td>
                    <td className="py-2.5 font-medium text-slate-200">{r.title}</td>
                    <td className="py-2.5 text-amber-300">
                      {new Date(r.remindAt).toLocaleString()}
                    </td>
                    <td className="py-2.5">
                      <span className="rounded bg-sky-500/10 px-1.5 py-0.5 text-[10px] text-sky-400">
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {tab === "calendar" && (
          data.calendarEvents.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500">No calendar events booked yet.</div>
          ) : (
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-2 font-semibold">ID</th>
                  <th className="pb-2 font-semibold">Event Title</th>
                  <th className="pb-2 font-semibold">Participant</th>
                  <th className="pb-2 font-semibold">Time Window</th>
                  <th className="pb-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {data.calendarEvents.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 text-slate-500">#{c.id}</td>
                    <td className="py-2.5 font-medium text-slate-200">{c.title}</td>
                    <td className="py-2.5 text-indigo-300">{c.participant}</td>
                    <td className="py-2.5 text-slate-400">
                      {new Date(c.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} –{" "}
                      {new Date(c.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-2.5">
                      <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-400">
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}

        {tab === "messages" && (
          data.sentMessages.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500">No external messages sent yet.</div>
          ) : (
            <table className="w-full text-left font-mono text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="pb-2 font-semibold">ID</th>
                  <th className="pb-2 font-semibold">Recipient</th>
                  <th className="pb-2 font-semibold">Channel</th>
                  <th className="pb-2 font-semibold">Subject</th>
                  <th className="pb-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {data.sentMessages.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 text-slate-500">#{m.id}</td>
                    <td className="py-2.5 font-medium text-slate-200">{m.recipient}</td>
                    <td className="py-2.5 text-slate-400">{m.channel}</td>
                    <td className="py-2.5 text-slate-300">{m.subject}</td>
                    <td className="py-2.5">
                      <span className="rounded bg-emerald-500/10 px-1.5 py-0.5 text-[10px] text-emerald-400">
                        {m.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>
    </div>
  );
}
