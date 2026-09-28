import { z } from "zod";
import { db } from "@/db";
import { reminders } from "@/db/schema";
import { eq } from "drizzle-orm";
import { AgentTool } from "./types";

export const createReminderSchema = z.object({
  title: z.string().min(1, "Reminder title is required"),
  remindAt: z.string().describe("ISO 8601 target timestamp for the reminder"),
  targetEntityId: z.number().optional().describe("Associated task or event ID if applicable"),
});

export type CreateReminderInput = z.infer<typeof createReminderSchema>;

export const createReminderTool: AgentTool<
  CreateReminderInput,
  { reminderId: number; title: string; remindAt: string; targetEntityId?: number }
> = {
  name: "create_reminder",
  displayName: "Schedule Reminder",
  description: "Schedules an alert notification for a specific date and time.",
  category: "reminders",
  permissionLevel: "WRITE",
  inputSchema: createReminderSchema,
  schemaDescription: {
    title: "Reminder message or subject",
    remindAt: "Exact timestamp in ISO 8601 format when reminder triggers (e.g. 2026-05-15T15:00:00Z)",
    targetEntityId: "ID of the associated task or resource (optional)",
  },
  execute: async (input, context) => {
    const startTime = Date.now();
    try {
      const parsed = createReminderSchema.parse(input);
      const remindDate = new Date(parsed.remindAt);
      if (isNaN(remindDate.getTime())) {
        throw new Error(`Invalid ISO date string provided for remindAt: "${parsed.remindAt}"`);
      }

      const [inserted] = await db
        .insert(reminders)
        .values({
          title: parsed.title,
          remindAt: remindDate,
          targetEntityId: parsed.targetEntityId ?? null,
          status: "scheduled",
          createdByTaskId: context.taskId,
        })
        .returning();

      return {
        success: true,
        data: {
          reminderId: inserted.id,
          title: inserted.title,
          remindAt: inserted.remindAt.toISOString(),
          targetEntityId: inserted.targetEntityId ?? undefined,
        },
        executionDurationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Failed to create reminder",
        executionDurationMs: Date.now() - startTime,
      };
    }
  },
  validate: async (output, _input, _context) => {
    if (!output?.reminderId) {
      return { verified: false, message: "Verification failed: No reminder ID returned." };
    }
    const record = await db.query.reminders.findFirst({
      where: eq(reminders.id, output.reminderId),
    });

    if (!record) {
      return { verified: false, message: `Verification failed: Reminder #${output.reminderId} not found in database.` };
    }

    return {
      verified: true,
      message: `Verified: Reminder #${record.id} ("${record.title}") successfully scheduled for ${record.remindAt.toISOString()}.`,
      details: { id: record.id, title: record.title, remindAt: record.remindAt, status: record.status },
    };
  },
};
