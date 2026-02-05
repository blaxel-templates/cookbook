import { sandboxCache } from "@/lib/sandbox-cache";
import { NextRequest, NextResponse } from "next/server";

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/projects/[projectId]/files/[...path] - Read file content
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string; path: string[] }> }
) {
  try {
    const { projectId, path } = await params;
    const isLocalSandbox = !!process.env.SANDBOX_FORCED_URL;

    // Get cached sandbox instance (projectId is the sandboxId)
    const sandbox = await sandboxCache.get(
      projectId,
      isLocalSandbox ? process.env.SANDBOX_FORCED_URL : undefined
    );

    // Construct file path
    const filePath = '/' + path.join('/');

    // Read file content
    const content = await sandbox.fs.read(filePath);

    return NextResponse.json({
      path: filePath,
      content
    });
  } catch (error: any) {
    console.error("Error reading file:", error);
    return NextResponse.json(
      { error: error.message || "Failed to read file" },
      { status: 500 }
    );
  }
}
