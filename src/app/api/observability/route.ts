import { NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, taskSteps, toolExecutions, auditLogs } from "@/db/schema";
import { desc, count, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [totalTasksRes] = await db.select({ count: count() }).from(tasks);
    const [totalExecutionsRes] = await db.select({ count: count() }).from(toolExecutions);
    const [totalAuditLogsRes] = await db.select({ count: count() }).from(auditLogs);

    const recentAuditLogs = await db.query.auditLogs.findMany({
      orderBy: [desc(auditLogs.createdAt)],
      limit: 30,
    });

    const recentToolExecutions = await db.query.toolExecutions.findMany({
      orderBy: [desc(toolExecutions.createdAt)],
      limit: 20,
    });

    const tasksStatusCounts = await db
      .select({
        status: tasks.status,
        count: count(),
      })
      .from(tasks)
      .groupBy(tasks.status);

    return NextResponse.json({
      metrics: {
        totalTasks: totalTasksRes?.count || 0,
        totalToolExecutions: totalExecutionsRes?.count || 0,
        totalAuditLogs: totalAuditLogsRes?.count || 0,
      },
      taskDistribution: tasksStatusCounts,
      recentAuditLogs,
      recentToolExecutions,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
