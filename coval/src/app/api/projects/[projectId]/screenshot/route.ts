import { sandboxCache } from "@/lib/sandbox-cache";
import { getPreviewUrl } from "@/lib/sandbox-helpers";
import { captureAndSaveScreenshot, readScreenshot } from "@/lib/screenshot";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET /api/projects/[projectId]/screenshot - Serve project screenshot as PNG
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

    // Try cached screenshot first
    let base64 = await readScreenshot(sandbox);

    // No screenshot yet — capture on demand
    if (!base64) {
      const previewUrl = await getPreviewUrl(sandbox);
      if (!previewUrl) {
        return NextResponse.json({ error: "No preview available" }, { status: 404 });
      }

      base64 = await captureAndSaveScreenshot(previewUrl, sandbox);
      if (!base64) {
        return NextResponse.json({ error: "Failed to capture screenshot" }, { status: 500 });
      }
    }

    const imageBuffer = Buffer.from(base64, 'base64');

    return new Response(imageBuffer, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=60',
        'Content-Length': imageBuffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error("Error serving screenshot:", error);
    return NextResponse.json(
      { error: error.message || "Failed to get screenshot" },
      { status: 500 }
    );
  }
}
