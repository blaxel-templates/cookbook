import { sandboxCache } from "@/lib/sandbox-cache";
import { NextRequest, NextResponse } from "next/server";

// State file path in sandbox (root level, outside app directory)
const STATE_FILE_PATH = '/state.json';

// State structure stored in sandbox
export interface SandboxState {
  status: 'idle' | 'in_progress' | 'completed' | 'error';
  logs: string[];
  conversationHistory: { role: 'user' | 'assistant'; content: string }[];
  currentPrompt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
}

// Default empty state
const DEFAULT_STATE: SandboxState = {
  status: 'idle',
  logs: [],
  conversationHistory: [],
  currentPrompt: null,
  startedAt: null,
  completedAt: null,
  error: null,
};

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/projects/[projectId]/state - Get sandbox state
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const isLocalSandbox = !!process.env.SANDBOX_FORCED_URL;

    // Get cached sandbox instance
    let sandbox;
    try {
      sandbox = await sandboxCache.get(
        projectId,
        isLocalSandbox ? process.env.SANDBOX_FORCED_URL : undefined
      );
    } catch (error) {
      // Sandbox doesn't exist, return default state
      return NextResponse.json({ state: DEFAULT_STATE });
    }

    // Read state file from sandbox
    try {
      const content = await sandbox.fs.read(STATE_FILE_PATH);
      const state = JSON.parse(content) as SandboxState;
      return NextResponse.json({ state });
    } catch (error) {
      // State file doesn't exist, return default
      console.log('[API] No state file found, returning default');
      return NextResponse.json({ state: DEFAULT_STATE });
    }

  } catch (error: any) {
    console.error("Error fetching state:", error);
    return NextResponse.json(
      { error: error.message || "Failed to fetch state" },
      { status: 500 }
    );
  }
}
