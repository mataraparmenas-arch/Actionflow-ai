import { NextResponse } from "next/server";
import { ToolRegistry } from "@/lib/tools/registry";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tools = ToolRegistry.getToolMetadata();
    return NextResponse.json({
      count: tools.length,
      tools,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
