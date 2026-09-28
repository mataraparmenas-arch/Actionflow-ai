import { pgTable, text, serial, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core";

// Orchestrator Tasks: Tracks top-level natural language user requests
export const tasks = pgTable("tasks", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().default("user_demo"),
  rawInput: text("raw_input").notNull(),
  intent: text("intent").notNull().default("unknown"),
  // States: PENDING, PLANNING, WAITING_FOR_INPUT, WAITING_FOR_CONFIRMATION, EXECUTING, VERIFYING, COMPLETED, EXECUTION_FAILED, VALIDATION_FAILED, CANCELLED, TIMED_OUT
  status: text("status").notNull().default("PENDING"),
  structuredPlan: jsonb("structured_plan"),
  clarificationPrompt: text("clarification_prompt"),
  userResponse: text("user_response"),
  errorMessage: text("error_message"),
  metadata: jsonb("metadata").$type<{
    model?: string;
    tokens?: number;
    latencyMs?: number;
    requiresClarification?: boolean;
    requiresConfirmation?: boolean;
    confidenceScore?: number;
  }>(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  completedAt: timestamp("completed_at"),
});

// Task Steps: Specific planned actions within a task
export const taskSteps = pgTable("task_steps", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").references(() => tasks.id, { onDelete: "cascade" }).notNull(),
  stepNumber: integer("step_number").notNull(),
  actionName: text("action_name").notNull(),
  description: text("description").notNull(),
  // Status: PENDING, WAITING_FOR_CONFIRMATION, EXECUTING, VERIFYING, COMPLETED, FAILED, SKIPPED
  status: text("status").notNull().default("PENDING"),
  toolName: text("tool_name").notNull(),
  permissionLevel: text("permission_level").notNull().default("WRITE"), // READ, WRITE, EXTERNAL_SIDE_EFFECT
  requiresConfirmation: boolean("requires_confirmation").notNull().default(false),
  confirmationStatus: text("confirmation_status").default("NONE"), // NONE, PENDING, APPROVED, REJECTED
  toolInput: jsonb("tool_input"),
  toolOutput: jsonb("tool_output"),
  verificationResult: jsonb("verification_result"),
  retryCount: integer("retry_count").notNull().default(0),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Tool Executions: Immutable record of each physical tool invocation
export const toolExecutions = pgTable("tool_executions", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id").references(() => tasks.id, { onDelete: "cascade" }).notNull(),
  stepId: integer("step_id").references(() => taskSteps.id, { onDelete: "cascade" }),
  toolName: text("tool_name").notNull(),
  permissionLevel: text("permission_level").notNull(),
  inputPayload: jsonb("input_payload").notNull(),
  outputPayload: jsonb("output_payload"),
  idempotencyKey: text("idempotency_key").notNull(),
  status: text("status").notNull(), // SUCCESS, FAILED, RETRIED, TIMED_OUT
  executionDurationMs: integer("execution_duration_ms").default(0),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Audit Logs: System-wide observability and audit trail
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  taskId: integer("task_id"),
  actor: text("actor").notNull().default("AI_AGENT"), // AI_AGENT, USER, SYSTEM
  action: text("action").notNull(), // INTENT_PARSED, PLAN_GENERATED, TOOL_INVOKED, CONFIRMATION_REQUESTED, CONFIRMATION_RESOLVED, VERIFICATION_PASSED, etc.
  details: jsonb("details"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// System Resource: Managed Tasks
export const managedTasks = pgTable("managed_tasks", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  description: text("description"),
  dueDate: timestamp("due_date"),
  priority: text("priority").notNull().default("medium"), // low, medium, high, urgent
  status: text("status").notNull().default("todo"), // todo, in_progress, completed, archived
  createdByTaskId: integer("created_by_task_id").references(() => tasks.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// System Resource: Reminders
export const reminders = pgTable("reminders", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  remindAt: timestamp("remind_at").notNull(),
  targetEntityId: integer("target_entity_id"),
  status: text("status").notNull().default("scheduled"), // scheduled, triggered, dismissed
  createdByTaskId: integer("created_by_task_id").references(() => tasks.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// System Resource: Calendar Events
export const calendarEvents = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  participant: text("participant").notNull(),
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time").notNull(),
  status: text("status").notNull().default("confirmed"), // tentative, confirmed, cancelled
  createdByTaskId: integer("created_by_task_id").references(() => tasks.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// System Resource: Sent Messages (external side-effect tracking)
export const sentMessages = pgTable("sent_messages", {
  id: serial("id").primaryKey(),
  recipient: text("recipient").notNull(),
  channel: text("channel").notNull().default("email"), // email, slack, sms
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull().default("sent"), // sent, failed, pending_approval
  createdByTaskId: integer("created_by_task_id").references(() => tasks.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
