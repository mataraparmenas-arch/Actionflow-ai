import { z } from "zod";

export type PermissionLevel = "READ" | "WRITE" | "EXTERNAL_SIDE_EFFECT";

export interface ToolExecutionContext {
  taskId: number;
  stepId?: number;
  userId?: string;
  idempotencyKey: string;
}

export interface ToolExecutionResult<TOutput = any> {
  success: boolean;
  data?: TOutput;
  error?: string;
  executionDurationMs?: number;
}

export interface VerificationResult {
  verified: boolean;
  message: string;
  details?: Record<string, any>;
}

export interface AgentTool<TInput = any, TOutput = any> {
  name: string;
  displayName: string;
  description: string;
  category: "tasks" | "calendar" | "reminders" | "communications" | "knowledge";
  permissionLevel: PermissionLevel;
  inputSchema: z.ZodType<TInput>;
  schemaDescription: Record<string, string>;
  execute: (input: TInput, context: ToolExecutionContext) => Promise<ToolExecutionResult<TOutput>>;
  validate: (output: TOutput, input: TInput, context: ToolExecutionContext) => Promise<VerificationResult>;
}
