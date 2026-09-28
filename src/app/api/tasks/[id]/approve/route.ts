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
    const { stepId, approved } = body;

    if (typeof stepId !== "number" || typeof approved !== "boolean") {
      return NextResponse.json({ error: "stepId (number) and approved (boolean) are required." }, { status: 400 });
    }

    const result = await AgentOrchestrator.resolveConfirmation(taskId, stepId, approved);
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
