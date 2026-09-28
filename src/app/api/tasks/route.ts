import { NextResponse } from "next/server";
import { db } from "@/db";
import { tasks, taskSteps } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { AgentOrchestrator } from "@/lib/agent/orchestrator";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const allTasks = await db.query.tasks.findMany({
      orderBy: [desc(tasks.createdAt)],
      limit: 20,
    });

    const tasksWithSteps = await Promise.all(
      allTasks.map(async (t) => {
        const steps = await db.query.taskSteps.findMany({
          where: eq(taskSteps.taskId, t.id),
        });
        return {
          ...t,
          steps,
        };
      })
    );

    return NextResponse.json({ tasks: tasksWithSteps });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { prompt, userId = "user_demo" } = body;

    if (!prompt || typeof prompt !== "string" || prompt.trim().length === 0) {
      return NextResponse.json({ error: "A valid prompt is required." }, { status: 400 });
    }

    const result = await AgentOrchestrator.submitTask(prompt.trim(), userId);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
