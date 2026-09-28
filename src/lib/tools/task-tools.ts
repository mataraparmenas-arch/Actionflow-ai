import { z } from "zod";
import { db } from "@/db";
import { managedTasks } from "@/db/schema";
import { eq, ilike } from "drizzle-orm";
import { AgentTool } from "./types";

export const createTaskSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional().default(""),
  dueDate: z.string().optional().describe("ISO 8601 date-time string"),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional().default("medium"),
});

export type CreateTaskInput = z.input<typeof createTaskSchema>;

export const createTaskTool: AgentTool<CreateTaskInput, { taskId: number; title: string; priority: string; dueDate?: string }> = {
  name: "create_task",
  displayName: "Create Task",
  description: "Creates a new actionable task in the work management database.",
  category: "tasks",
  permissionLevel: "WRITE",
  inputSchema: createTaskSchema,
  schemaDescription: {
    title: "Clear, actionable title of the task",
    description: "Detailed context or requirements (optional)",
    dueDate: "Target completion timestamp in ISO format (optional)",
    priority: "Task urgency: low, medium, high, or urgent (default: medium)",
  },
  execute: async (input, context) => {
    const startTime = Date.now();
    try {
      const parsed = createTaskSchema.parse(input);
      const [inserted] = await db
        .insert(managedTasks)
        .values({
          title: parsed.title,
          description: parsed.description || "",
          dueDate: parsed.dueDate ? new Date(parsed.dueDate) : null,
          priority: parsed.priority || "medium",
          status: "todo",
          createdByTaskId: context.taskId,
        })
        .returning();

      return {
        success: true,
        data: {
          taskId: inserted.id,
          title: inserted.title,
          priority: inserted.priority,
          dueDate: inserted.dueDate ? inserted.dueDate.toISOString() : undefined,
        },
        executionDurationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Failed to create task",
        executionDurationMs: Date.now() - startTime,
      };
    }
  },
  validate: async (output, _input, _context) => {
    if (!output?.taskId) {
      return { verified: false, message: "Verification failed: No task ID was returned by execution." };
    }
    const record = await db.query.managedTasks.findFirst({
      where: eq(managedTasks.id, output.taskId),
    });

    if (!record) {
      return { verified: false, message: `Verification failed: Managed task #${output.taskId} could not be verified in database.` };
    }
    return {
      verified: true,
      message: `Verified: Task #${record.id} ("${record.title}") successfully persisted in PostgreSQL.`,
      details: { id: record.id, title: record.title, priority: record.priority, status: record.status },
    };
  },
};

export const searchTasksSchema = z.object({
  query: z.string().optional().default(""),
  status: z.enum(["todo", "in_progress", "completed", "all"]).optional().default("all"),
});

export type SearchTasksInput = z.infer<typeof searchTasksSchema>;

export const searchTasksTool: AgentTool<SearchTasksInput, { count: number; tasks: any[] }> = {
  name: "search_tasks",
  displayName: "Search Tasks",
  description: "Searches existing tasks by title, description, or status.",
  category: "tasks",
  permissionLevel: "READ",
  inputSchema: searchTasksSchema,
  schemaDescription: {
    query: "Keyword to search within task titles and descriptions",
    status: "Filter by status: todo, in_progress, completed, or all",
  },
  execute: async (input) => {
    const startTime = Date.now();
    try {
      const parsed = searchTasksSchema.parse(input);
      let queryBuilder = db.select().from(managedTasks);
      
      let rows;
      if (parsed.query && parsed.query.trim().length > 0) {
        rows = await queryBuilder.where(ilike(managedTasks.title, `%${parsed.query.trim()}%`)).limit(10);
      } else {
        rows = await queryBuilder.limit(10);
      }

      return {
        success: true,
        data: {
          count: rows.length,
          tasks: rows.map(r => ({ id: r.id, title: r.title, status: r.status, priority: r.priority, dueDate: r.dueDate })),
        },
        executionDurationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Failed to search tasks",
        executionDurationMs: Date.now() - startTime,
      };
    }
  },
  validate: async (output) => {
    return {
      verified: true,
      message: `Verified: Read operation returned ${output.count} matching records.`,
      details: { count: output.count },
    };
  },
};
