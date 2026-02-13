import { sandboxCache } from "@/lib/sandbox-cache";
import { DEFAULT_STATE, readSandboxState } from "@/lib/sandbox-state";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/projects/[projectId]/state - Get sandbox state
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    let sandbox;
    try {
      sandbox = await sandboxCache.get(projectId);
    } catch {
      return NextResponse.json({ state: DEFAULT_STATE });
    }

    const state = await readSandboxState(sandbox);
    return NextResponse.json({ state });

  } catch (error: any) {
    console.error("Error fetching state:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch state" },
      { status: 500 }
    );
  }
}
