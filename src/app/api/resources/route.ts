import { NextResponse } from "next/server";
import { db } from "@/db";
import { managedTasks, reminders, calendarEvents, sentMessages } from "@/db/schema";
import { desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const taskRows = await db.query.managedTasks.findMany({
      orderBy: [desc(managedTasks.createdAt)],
      limit: 25,
    });

    const reminderRows = await db.query.reminders.findMany({
      orderBy: [desc(reminders.createdAt)],
      limit: 25,
    });

    const calendarRows = await db.query.calendarEvents.findMany({
      orderBy: [desc(calendarEvents.createdAt)],
      limit: 25,
    });

    const messageRows = await db.query.sentMessages.findMany({
      orderBy: [desc(sentMessages.createdAt)],
      limit: 25,
    });

    return NextResponse.json({
      managedTasks: taskRows,
      reminders: reminderRows,
      calendarEvents: calendarRows,
      sentMessages: messageRows,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
