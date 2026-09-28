import { z } from "zod";
import { db } from "@/db";
import { calendarEvents } from "@/db/schema";
import { and, eq, lte, gte } from "drizzle-orm";
import { AgentTool } from "./types";

export const checkAvailabilitySchema = z.object({
  participant: z.string().optional().default("Sarah"),
  startTime: z.string().describe("ISO 8601 start timestamp"),
  endTime: z.string().describe("ISO 8601 end timestamp"),
});

export type CheckAvailabilityInput = z.infer<typeof checkAvailabilitySchema>;

export const checkAvailabilityTool: AgentTool<
  CheckAvailabilityInput,
  { available: boolean; conflictingEvents: Array<{ id: number; title: string; startTime: string; endTime: string }> }
> = {
  name: "check_calendar_availability",
  displayName: "Check Calendar Availability",
  description: "Checks if a participant or calendar slot is free during the requested time window.",
  category: "calendar",
  permissionLevel: "READ",
  inputSchema: checkAvailabilitySchema,
  schemaDescription: {
    participant: "Name or email of the person to check (optional)",
    startTime: "Start of desired time window (ISO 8601)",
    endTime: "End of desired time window (ISO 8601)",
  },
  execute: async (input) => {
    const startTime = Date.now();
    try {
      const parsed = checkAvailabilitySchema.parse(input);
      const start = new Date(parsed.startTime);
      const end = new Date(parsed.endTime);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error("Invalid start or end timestamp.");
      }

      // Check conflicts: where existing event overlaps (existing.start < requested.end AND existing.end > requested.start)
      const conflicts = await db.query.calendarEvents.findMany({
        where: and(
          lte(calendarEvents.startTime, end),
          gte(calendarEvents.endTime, start),
          eq(calendarEvents.status, "confirmed")
        ),
      });

      return {
        success: true,
        data: {
          available: conflicts.length === 0,
          conflictingEvents: conflicts.map((c) => ({
            id: c.id,
            title: c.title,
            startTime: c.startTime.toISOString(),
            endTime: c.endTime.toISOString(),
          })),
        },
        executionDurationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Failed to check availability",
        executionDurationMs: Date.now() - startTime,
      };
    }
  },
  validate: async (output) => {
    return {
      verified: true,
      message: output.available
        ? "Verified: Calendar slot is completely clear with 0 conflicts."
        : `Verified: Calendar conflict detected with ${output.conflictingEvents.length} existing event(s).`,
      details: { available: output.available, conflictCount: output.conflictingEvents.length },
    };
  },
};

export const createCalendarEventSchema = z.object({
  title: z.string().min(1, "Event title is required"),
  participant: z.string().min(1, "Participant name or email is required"),
  startTime: z.string().describe("ISO 8601 start timestamp"),
  endTime: z.string().describe("ISO 8601 end timestamp"),
});

export type CreateCalendarEventInput = z.infer<typeof createCalendarEventSchema>;

export const createCalendarEventTool: AgentTool<
  CreateCalendarEventInput,
  { eventId: number; title: string; participant: string; startTime: string; endTime: string }
> = {
  name: "create_calendar_event",
  displayName: "Create Calendar Event",
  description: "Creates and books a calendar meeting with specified participants.",
  category: "calendar",
  permissionLevel: "WRITE",
  inputSchema: createCalendarEventSchema,
  schemaDescription: {
    title: "Meeting title or agenda",
    participant: "Participant name or email address",
    startTime: "Meeting start time (ISO 8601)",
    endTime: "Meeting end time (ISO 8601)",
  },
  execute: async (input, context) => {
    const startTime = Date.now();
    try {
      const parsed = createCalendarEventSchema.parse(input);
      const start = new Date(parsed.startTime);
      const end = new Date(parsed.endTime);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        throw new Error("Invalid start or end timestamp.");
      }

      if (end <= start) {
        throw new Error("End time must be after start time.");
      }

      const [inserted] = await db
        .insert(calendarEvents)
        .values({
          title: parsed.title,
          participant: parsed.participant,
          startTime: start,
          endTime: end,
          status: "confirmed",
          createdByTaskId: context.taskId,
        })
        .returning();

      return {
        success: true,
        data: {
          eventId: inserted.id,
          title: inserted.title,
          participant: inserted.participant,
          startTime: inserted.startTime.toISOString(),
          endTime: inserted.endTime.toISOString(),
        },
        executionDurationMs: Date.now() - startTime,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message || "Failed to create calendar event",
        executionDurationMs: Date.now() - startTime,
      };
    }
  },
  validate: async (output, _input, _context) => {
    if (!output?.eventId) {
      return { verified: false, message: "Verification failed: No event ID returned." };
    }
    const record = await db.query.calendarEvents.findFirst({
      where: eq(calendarEvents.id, output.eventId),
    });

    if (!record) {
      return { verified: false, message: `Verification failed: Calendar event #${output.eventId} not found in database.` };
    }

    return {
      verified: true,
      message: `Verified: Calendar event #${record.id} ("${record.title}") confirmed for ${record.participant} from ${record.startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} to ${record.endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
      details: { id: record.id, participant: record.participant, start: record.startTime, end: record.endTime },
    };
  },
};
