import { SandboxInstance } from "@blaxel/core";
import { sandboxCache } from "@/lib/sandbox-cache";
import { NextRequest, NextResponse } from "next/server";

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/projects/[projectId] - Get project/sandbox details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const isLocalSandbox = !!process.env.SANDBOX_FORCED_URL;

    // Get sandbox instance
    const sandbox = await sandboxCache.get(
      projectId,
      isLocalSandbox ? process.env.SANDBOX_FORCED_URL : undefined
    );

    if (!sandbox) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Get preview URL
    let previewUrl = null;
    let sessionUrl = null;
    let sessionToken = null;

    if (!isLocalSandbox) {
      // Try to get existing preview
      const previews = await sandbox.previews.list();
      const appPreview = previews.find(p => p.metadata?.name === "app-preview");
      if (appPreview?.spec?.url) {
        previewUrl = appPreview.spec.url;
      }

      // Create or get session for terminal
      try {
        const session = await sandbox.sessions.createIfExpired({
          expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 hours
        });
        sessionUrl = session.url;
        sessionToken = session.token;
      } catch (error) {
        console.error('Error getting session:', error);
      }
    } else {
      previewUrl = "http://localhost:4321";
      sessionUrl = process.env.SANDBOX_FORCED_URL;
      sessionToken = "local";
    }

    // Build project response
    const project = {
      id: projectId,
      name: projectId,
      sandboxId: projectId,
      previewUrl,
      sessionUrl,
      sessionToken,
      status: sandbox.status,
      createdAt: sandbox.metadata?.createdAt,
      updatedAt: sandbox.metadata?.updatedAt,
    };

    return NextResponse.json({ project });
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
    const isLocalSandbox = !!process.env.SANDBOX_FORCED_URL;

    if (isLocalSandbox) {
      // For local sandboxes, just invalidate the cache
      sandboxCache.invalidate(process.env.SANDBOX_FORCED_URL || projectId);
      return NextResponse.json({ success: true });
    }

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
