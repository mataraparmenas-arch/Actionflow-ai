import { NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, taskSteps, toolExecutions, auditLogs, managedTasks, reminders, calendarEvents, sentMessages } from "@/db/schema";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    await db.delete(toolExecutions);
    await db.delete(taskSteps);
    await db.delete(auditLogs);
    await db.delete(managedTasks);
    await db.delete(reminders);
    await db.delete(calendarEvents);
    await db.delete(sentMessages);
    await db.delete(tasks);

    return NextResponse.json({ success: true, message: "Database state successfully reset." });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
