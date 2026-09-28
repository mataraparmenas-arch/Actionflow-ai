import { NextResponse } from "next/server";
import { AgentOrchestrator } from "@/lib/agent/orchestrator";

export const dynamic = "force-dynamic";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const taskId = parseInt(id, 10);
    if (isNaN(taskId)) {
      return NextResponse.json({ error: "Invalid task ID" }, { status: 400 });
    }

    const body = await req.json();
    const { clarification } = body;

    if (!clarification || typeof clarification !== "string") {
      return NextResponse.json({ error: "clarification text is required." }, { status: 400 });
    }

    const result = await AgentOrchestrator.provideClarification(taskId, clarification.trim());
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
