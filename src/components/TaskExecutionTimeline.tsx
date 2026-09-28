"use client";

import React, { useState } from "react";
import {
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronRight,
  Database,
  Terminal,
  ShieldAlert,
  ArrowRightCircle,
  FileCheck2,
  RefreshCw,
} from "lucide-react";
import { TaskStatus, StepStatus } from "@/lib/agent/types";

interface StepData {
  id: number;
  stepNumber: number;
  actionName: string;
  description: string;
  status: string;
  toolName: string;
  permissionLevel: string;
  requiresConfirmation: boolean;
  confirmationStatus?: string | null;
  toolInput?: any;
  toolOutput?: any;
  verificationResult?: any;
  retryCount?: number;
  errorMessage?: string | null;
}

interface TaskData {
  id: number;
  rawInput: string;
  intent: string;
  status: string;
  structuredPlan?: any;
  userResponse?: string | null;
  errorMessage?: string | null;
  createdAt: string;
  completedAt?: string | null;
}

interface ExecutionTrace {
  id: string;
  timestamp: string;
  stage: string;
  message: string;
  status: "info" | "success" | "warning" | "error";
}

interface TaskExecutionTimelineProps {
  task: TaskData;
  steps: StepData[];
  traces: ExecutionTrace[];
}

export function TaskExecutionTimeline({ task, steps, traces }: TaskExecutionTimelineProps) {
  const [expandedStepId, setExpandedStepId] = useState<number | null>(null);
  const [showRawJson, setShowRawJson] = useState(false);

  const toggleStep = (id: number) => {
    setExpandedStepId(expandedStepId === id ? null : id);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400 border border-emerald-500/20">
            <CheckCircle className="h-3.5 w-3.5" />
            Completed & Verified
          </span>
        );
      case "WAITING_FOR_CONFIRMATION":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-medium text-amber-400 border border-amber-500/20">
            <ShieldAlert className="h-3.5 w-3.5" />
            Waiting for Human Confirmation
          </span>
        );
      case "WAITING_FOR_INPUT":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-sky-500/10 px-2.5 py-1 text-xs font-medium text-sky-400 border border-sky-500/20">
            <Clock className="h-3.5 w-3.5" />
            Awaiting Clarification
          </span>
        );
      case "EXECUTING":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-400 border border-indigo-500/20 animate-pulse">
            <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            Executing Tools
          </span>
        );
      case "VERIFYING":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-500/10 px-2.5 py-1 text-xs font-medium text-purple-400 border border-purple-500/20">
            <Database className="h-3.5 w-3.5 animate-pulse" />
            Verifying Database State
          </span>
        );
      case "EXECUTION_FAILED":
      case "VALIDATION_FAILED":
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-500/10 px-2.5 py-1 text-xs font-medium text-rose-400 border border-rose-500/20">
            <AlertCircle className="h-3.5 w-3.5" />
            {status === "VALIDATION_FAILED" ? "Validation Failed" : "Execution Failed"}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-800 px-2.5 py-1 text-xs font-medium text-slate-300 border border-slate-700">
            {status}
          </span>
        );
    }
  };

  const getPermissionBadge = (perm: string) => {
    switch (perm) {
      case "EXTERNAL_SIDE_EFFECT":
        return (
          <span className="rounded bg-rose-950/60 border border-rose-700/50 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-rose-300">
            Side Effect: Human Gate
          </span>
        );
      case "WRITE":
        return (
          <span className="rounded bg-amber-950/50 border border-amber-700/40 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-amber-300">
            Database Mutation
          </span>
        );
      case "READ":
        return (
          <span className="rounded bg-blue-950/50 border border-blue-700/40 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-blue-300">
            Read Only
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Info Banner */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 backdrop-blur-md">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-slate-400">Task #{task.id}</span>
            {getStatusBadge(task.status)}
            <span className="rounded-md bg-slate-800/80 px-2 py-0.5 font-mono text-[11px] text-slate-300">
              Intent: {task.intent}
            </span>
          </div>
          <button
            onClick={() => setShowRawJson(!showRawJson)}
            className="text-xs font-mono text-slate-400 hover:text-slate-200 transition flex items-center gap-1"
          >
            <Terminal className="h-3.5 w-3.5" />
            {showRawJson ? "Hide Raw State" : "Inspect State"}
          </button>
        </div>

        <div className="mt-3">
          <p className="text-sm text-slate-300 italic font-medium">
            "{task.rawInput}"
          </p>
        </div>

        {task.structuredPlan && task.structuredPlan.goal && (
          <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Synthesized Goal:</span>
            <span>{task.structuredPlan.goal}</span>
          </div>
        )}
      </div>

      {showRawJson && (
        <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-300 overflow-x-auto max-h-72">
          <pre>{JSON.stringify({ task, steps }, null, 2)}</pre>
        </div>
      )}

      {/* Outcome / Final User Response */}
      {task.userResponse && (
        <div
          className={`rounded-xl border p-4.5 ${
            task.status === "COMPLETED"
              ? "border-emerald-500/30 bg-emerald-950/20 text-emerald-200"
              : task.status === "EXECUTION_FAILED" || task.status === "VALIDATION_FAILED"
              ? "border-rose-500/30 bg-rose-950/20 text-rose-200"
              : "border-slate-800 bg-slate-900/40 text-slate-200"
          }`}
        >
          <div className="flex items-start gap-3">
            {task.status === "COMPLETED" ? (
              <FileCheck2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
            )}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-1">
                {task.status === "COMPLETED" ? "Execution Outcome" : "Agent Response"}
              </h4>
              <p className="text-sm leading-relaxed">{task.userResponse}</p>
            </div>
          </div>
        </div>
      )}

      {/* Structured Execution Plan & Step Progression */}
      <div>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold tracking-wide text-slate-200 uppercase flex items-center gap-2">
            <ArrowRightCircle className="h-4 w-4 text-indigo-400" />
            Execution Plan & Steps ({steps.length})
          </h3>
          <span className="text-xs text-slate-400">
            {steps.filter((s) => s.status === "COMPLETED").length}/{steps.length} Steps Verified
          </span>
        </div>

        <div className="space-y-3">
          {steps.map((step) => {
            const isExpanded = expandedStepId === step.id;
            return (
              <div
                key={step.id}
                className={`rounded-xl border transition-all ${
                  step.status === "COMPLETED"
                    ? "border-emerald-500/30 bg-slate-900/70"
                    : step.status === "WAITING_FOR_CONFIRMATION"
                    ? "border-amber-500/40 bg-amber-950/20"
                    : step.status === "FAILED"
                    ? "border-rose-500/40 bg-rose-950/20"
                    : "border-slate-800 bg-slate-900/40"
                }`}
              >
                {/* Step Item Bar */}
                <div
                  onClick={() => toggleStep(step.id)}
                  className="flex cursor-pointer items-center justify-between p-4"
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                        step.status === "COMPLETED"
                          ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                          : step.status === "WAITING_FOR_CONFIRMATION"
                          ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                          : step.status === "FAILED"
                          ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                          : "bg-slate-800 text-slate-400"
                      }`}
                    >
                      {step.stepNumber}
                    </span>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-slate-100">
                          {step.description}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="rounded bg-slate-800 px-2 py-0.5 font-mono text-[11px] text-slate-300">
                          tool: {step.toolName}
                        </span>
                        {getPermissionBadge(step.permissionLevel)}
                        {step.retryCount && step.retryCount > 0 ? (
                          <span className="rounded bg-amber-500/20 px-1.5 py-0.2 text-[10px] text-amber-300">
                            retries: {step.retryCount}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {step.status === "COMPLETED" && (
                      <span className="flex items-center gap-1 text-xs text-emerald-400 font-medium">
                        <CheckCircle className="h-4 w-4" />
                        Verified
                      </span>
                    )}
                    {step.status === "WAITING_FOR_CONFIRMATION" && (
                      <span className="flex items-center gap-1 text-xs text-amber-400 font-medium animate-pulse">
                        <ShieldAlert className="h-4 w-4" />
                        Needs Approval
                      </span>
                    )}
                    {step.status === "FAILED" && (
                      <span className="flex items-center gap-1 text-xs text-rose-400 font-medium">
                        <AlertCircle className="h-4 w-4" />
                        Failed
                      </span>
                    )}
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-slate-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Details: Tool Inputs, Outputs, and Verifications */}
                {isExpanded && (
                  <div className="border-t border-slate-800/80 bg-slate-950/60 p-4 space-y-3">
                    {/* Tool Input Payload */}
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        Tool Input Parameters
                      </span>
                      <pre className="rounded bg-slate-900 border border-slate-800/70 p-2.5 font-mono text-xs text-slate-300 overflow-x-auto">
                        {JSON.stringify(step.toolInput, null, 2)}
                      </pre>
                    </div>

                    {/* Tool Output Result */}
                    {step.toolOutput && (
                      <div>
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                          Tool Return Data
                        </span>
                        <pre className="rounded bg-slate-900 border border-slate-800/70 p-2.5 font-mono text-xs text-emerald-300 overflow-x-auto">
                          {JSON.stringify(step.toolOutput, null, 2)}
                        </pre>
                      </div>
                    )}

                    {/* Database Verification Result */}
                    {step.verificationResult && (
                      <div className="rounded border border-emerald-500/30 bg-emerald-950/20 p-2.5">
                        <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                          <Database className="h-3.5 w-3.5" />
                          Database Verification Confirmed
                        </div>
                        <p className="mt-1 text-xs text-emerald-300/90 font-mono">
                          {step.verificationResult.message}
                        </p>
                      </div>
                    )}

                    {step.errorMessage && (
                      <div className="rounded border border-rose-500/30 bg-rose-950/20 p-2.5 text-xs text-rose-300 font-mono">
                        Error: {step.errorMessage}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Execution Trace Stream */}
      {traces.length > 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
            <Terminal className="h-4 w-4 text-slate-400" />
            Execution Trace Stream
          </h4>
          <div className="space-y-2 font-mono text-xs">
            {traces.map((trace, idx) => (
              <div key={idx} className="flex items-start gap-2.5 text-slate-300">
                <span className="text-slate-500 text-[10px] shrink-0 mt-0.5">
                  {new Date(trace.timestamp).toLocaleTimeString()}
                </span>
                <span
                  className={`rounded px-1.5 py-0.2 text-[10px] shrink-0 font-semibold ${
                    trace.status === "success"
                      ? "bg-emerald-500/20 text-emerald-400"
                      : trace.status === "warning"
                      ? "bg-amber-500/20 text-amber-400"
                      : trace.status === "error"
                      ? "bg-rose-500/20 text-rose-400"
                      : "bg-slate-800 text-slate-300"
                  }`}
                >
                  {trace.stage}
                </span>
                <span className="text-slate-200">{trace.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
