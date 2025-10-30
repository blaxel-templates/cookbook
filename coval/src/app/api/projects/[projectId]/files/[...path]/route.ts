import { getProject } from "@/lib/database";
import { sandboxCache } from "@/lib/sandbox-cache";
import { NextRequest, NextResponse } from "next/server";

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/projects/[projectId]/files/[...path] - Read file content
export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string; path: string[] } }
) {
  try {
    const project = getProject(params.projectId);

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    if (!project.sandboxId) {
      return NextResponse.json(
        { error: "No sandbox associated with this project" },
        { status: 400 }
      );
    }

    // Get cached sandbox instance
    const isLocalSandbox = !!process.env.SANDBOX_FORCED_URL;
    const sandbox = await sandboxCache.get(
      project.sandboxId,
      isLocalSandbox ? process.env.SANDBOX_FORCED_URL : undefined
    );

    // Construct file path
    const filePath = '/' + params.path.join('/');

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

