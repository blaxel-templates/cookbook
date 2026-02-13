import { SandboxInstance } from "@blaxel/core";
import { sandboxCache } from "@/lib/sandbox-cache";
import { getPreviewUrl } from "@/lib/sandbox-helpers";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/projects/[projectId] - Get project/sandbox details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;

    const sandbox = await sandboxCache.get(projectId);
    if (!sandbox) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const previewUrl = await getPreviewUrl(sandbox);

    let sessionUrl = null;
    let sessionToken = null;
    try {
      const session = await sandbox.sessions.createIfExpired({
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
      });
      sessionUrl = session.url;
      sessionToken = session.token;
    } catch (error) {
      console.error('Error getting session:', error);
    }

    return NextResponse.json({
      project: {
        id: projectId,
        name: projectId,
        sandboxId: projectId,
        previewUrl,
        sessionUrl,
        sessionToken,
        status: sandbox.status,
        createdAt: sandbox.metadata?.createdAt,
        updatedAt: sandbox.metadata?.updatedAt,
      },
    });
  } catch (error: any) {
    console.error("Error fetching project:", error);
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

    // Delete the sandbox
    try {
      console.log(`[API] Deleting sandbox: ${projectId}`);
      await SandboxInstance.delete(projectId);
      sandboxCache.invalidate(projectId);
      console.log(`[API] Sandbox deleted: ${projectId}`);
    } catch (error: any) {
      // If sandbox doesn't exist (404), treat as success
      if (error.message?.includes('404') || error.status === 404 || error.statusCode === 404) {
        console.log(`[API] Sandbox not found (404), already deleted`);
        sandboxCache.invalidate(projectId);
      } else {
        throw error;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting project:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete project" },
      { status: 500 }
    );
  }
}
