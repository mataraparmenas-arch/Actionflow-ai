import { NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, taskSteps, toolExecutions, auditLogs } from "@/db/schema";
import { eq, asc } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const taskId = parseInt(id, 10);
    if (isNaN(taskId)) {
      return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
    }

    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, taskId),
    });

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const steps = await db.query.taskSteps.findMany({
      where: eq(taskSteps.taskId, taskId),
      orderBy: [asc(taskSteps.stepNumber)],
    });

    const executions = await db.query.toolExecutions.findMany({
      where: eq(toolExecutions.taskId, taskId),
      orderBy: [asc(toolExecutions.createdAt)],
    });

    const logs = await db.query.auditLogs.findMany({
      where: eq(auditLogs.taskId, taskId),
      orderBy: [asc(auditLogs.createdAt)],
    });

    return NextResponse.json({
      task,
      steps,
      toolExecutions: executions,
      auditLogs: logs,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
