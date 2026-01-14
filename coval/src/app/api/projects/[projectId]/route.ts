import { getProject, deleteProject } from "@/lib/database";
import { SandboxInstance } from "@blaxel/core";
import { sandboxCache } from "@/lib/sandbox-cache";
import { NextRequest, NextResponse } from "next/server";

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/projects/[projectId] - Get project details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const project = getProject(projectId);

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ project });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to get project" },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[projectId] - Delete project and associated sandbox
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    // Get project to check if it has a sandbox
    const project = getProject(projectId);

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Delete sandbox if it exists (skip for local sandboxes)
    const isLocalSandbox = !!process.env.SANDBOX_FORCED_URL;
    if (project.sandboxId && !isLocalSandbox) {
      try {
        console.log(`[API] Deleting sandbox: ${project.sandboxId}`);
        await SandboxInstance.delete(project.sandboxId);
        // Invalidate cache
        sandboxCache.invalidate(project.sandboxId);
        console.log(`[API] Sandbox deleted: ${project.sandboxId}`);
      } catch (error: any) {
        // If sandbox doesn't exist (404), continue with project deletion
        if (error.message?.includes('404') || error.status === 404 || error.statusCode === 404) {
          console.log(`[API] Sandbox not found (404), continuing with project deletion`);
        } else {
          console.error(`[API] Error deleting sandbox: ${error.message}`);
          // Continue anyway - we still want to delete the project
        }
        // Invalidate cache even on error
        sandboxCache.invalidate(project.sandboxId);
      }
    } else if (project.sandboxId && isLocalSandbox) {
      // For local sandboxes, just invalidate the cache
      sandboxCache.invalidate(process.env.SANDBOX_FORCED_URL || project.sandboxId);
    }

    // Delete project from database
    const success = deleteProject(projectId);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to delete project from database" },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to delete project" },
      { status: 500 }
    );
  }
}

