import { sandboxCache } from "@/lib/sandbox-cache";
import { NextRequest, NextResponse } from "next/server";

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/projects/[projectId]/files - List files from sandbox
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params;
    const isLocalSandbox = !!process.env.SANDBOX_FORCED_URL;

    // Get cached sandbox instance (projectId is the sandboxId)
    const sandbox = await sandboxCache.get(
      projectId,
      isLocalSandbox ? process.env.SANDBOX_FORCED_URL : undefined
    );

    // Get query parameter for path (default to /app)
    const searchParams = req.nextUrl.searchParams;
    const dirPath = searchParams.get('path') || '/app';

    // List files in directory
    const directory = await sandbox.fs.ls(dirPath);

    // Build file tree structure
    interface FileNode {
      name: string;
      path: string;
      type: 'file' | 'directory';
      children?: FileNode[];
    }

    const buildTree = (dir: any): FileNode[] => {
      const nodes: FileNode[] = [];

      // Add all subdirectories first (sorted by name)
      if (dir.subdirectories && Array.isArray(dir.subdirectories)) {
        const sortedDirs = [...dir.subdirectories].sort((a, b) =>
          a.name.toLowerCase().localeCompare(b.name.toLowerCase())
        );

        for (const subdir of sortedDirs) {
          const subdirNode: FileNode = {
            name: subdir.name,
            path: subdir.path,
            type: 'directory',
            children: buildTree(subdir), // Recursively build children from subdirectory
          };
          nodes.push(subdirNode);
        }
      }

      // Add all files (sorted by name)
      if (dir.files && Array.isArray(dir.files)) {
        const sortedFiles = [...dir.files].sort((a, b) =>
          a.name.toLowerCase().localeCompare(b.name.toLowerCase())
        );

        for (const file of sortedFiles) {
          nodes.push({
            name: file.name,
            path: file.path,
            type: 'file',
          });
        }
      }

      return nodes;
    };

    const fileTree = buildTree(directory);

    return NextResponse.json({ files: fileTree });
  } catch (error: any) {
    console.error("Error listing files:", error);
    return NextResponse.json(
      { error: error.message || "Failed to list files" },
      { status: 500 }
    );
  }
}
