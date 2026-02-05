import { SandboxInstance } from "@blaxel/core";
import { NextRequest, NextResponse } from "next/server";

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/projects - List all coval sandboxes
export async function GET() {
  try {
    // List all sandboxes and filter by coval label
    const allSandboxes = await SandboxInstance.list();
    const covalSandboxes = allSandboxes.filter(
      (sandbox) => sandbox.metadata.labels?.coval === "true"
    );

    // Transform to project-like format for frontend compatibility
    const projects = covalSandboxes.map((sandbox) => ({
      id: sandbox.metadata.name,
      name: sandbox.metadata.name,
      sandboxId: sandbox.metadata.name,
      status: sandbox.status,
      createdAt: sandbox.metadata.createdAt,
      updatedAt: sandbox.metadata.updatedAt,
    }));

    // Sort by updated date (most recent first)
    projects.sort((a, b) => 
      new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime()
    );

    return NextResponse.json({ projects });
  } catch (error: any) {
    console.error("Error listing projects:", error);
    return NextResponse.json(
      { error: error.message || "Failed to list projects" },
      { status: 500 }
    );
  }
}

// POST /api/projects - Create is now handled by /api/generate
// Projects are created implicitly when sandboxes are created
export async function POST(req: NextRequest) {
  return NextResponse.json(
    { error: "Use /api/generate to create new projects" },
    { status: 400 }
  );
}
