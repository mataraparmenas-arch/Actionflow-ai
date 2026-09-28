import { PermissionLevel } from "../tools/types";

export type TaskStatus =
  | "PENDING"
  | "PLANNING"
  | "WAITING_FOR_INPUT"
  | "WAITING_FOR_CONFIRMATION"
  | "EXECUTING"
  | "VERIFYING"
  | "COMPLETED"
  | "EXECUTION_FAILED"
  | "VALIDATION_FAILED"
  | "CANCELLED"
  | "TIMED_OUT";

export type StepStatus =
  | "PENDING"
  | "WAITING_FOR_CONFIRMATION"
  | "EXECUTING"
  | "VERIFYING"
  | "COMPLETED"
  | "FAILED"
  | "SKIPPED";

export type ConfirmationStatus = "NONE" | "PENDING" | "APPROVED" | "REJECTED";

export interface PlanStep {
  stepNumber: number;
  actionName: string;
  description: string;
  toolName: string;
  toolInput: Record<string, any>;
  permissionLevel: PermissionLevel;
  requiresConfirmation: boolean;
  dependencies?: number[];
}

export interface StructuredPlan {
  goal: string;
  intent: string;
  confidence: number;
  steps: PlanStep[];
  rationale: string;
  requiresClarification: boolean;
  clarificationPrompt?: string;
}

export interface IntentAnalysis {
  intent: string;
  confidence: number;
  entities: {
    recipientOrParticipant?: string;
    actionTarget?: string;
    dueOrTargetDate?: string;
    reminderTime?: string;
    meetingDurationMinutes?: number;
    channel?: string;
    priority?: "low" | "medium" | "high" | "urgent";
    [key: string]: any;
  };
  missingRequiredInfo: string[];
  requiresClarification: boolean;
  clarificationPrompt?: string;
  isPotentialInjection: boolean;
  injectionReason?: string;
}

export interface ExecutionTraceItem {
  id: string;
  timestamp: string;
  stage: string;
  message: string;
  status: "info" | "success" | "warning" | "error";
  metadata?: Record<string, any>;
}

export interface AgentRunResult {
  taskId: number;
  status: TaskStatus;
  userResponse: string;
  stepsCompleted: number;
  totalSteps: number;
  traces: ExecutionTraceItem[];
  requiresAction?: {
    type: "CONFIRMATION" | "CLARIFICATION";
    stepId?: number;
    prompt: string;
    payload?: any;
  };
}
