import { NextResponse } from "next/server";
import { runAllTests } from "@/lib/test/suite";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const summary = await runAllTests();
    return NextResponse.json(summary);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
