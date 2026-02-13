import { SandboxCreateConfiguration, SandboxInstance } from "@blaxel/core";
import { sandboxCache } from "./sandbox-cache";

/** CORS headers used for preview and session endpoints */
export const PREVIEW_CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
  "Access-Control-Allow-Credentials": "true",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
};

/** Generate a unique sandbox name */
export function generateSandboxName(): string {
  return `app-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
}

/** Get the preview URL for a sandbox's "app-preview" */
export async function getPreviewUrl(sandbox: SandboxInstance): Promise<string | null> {
  try {
    const previews = await sandbox.previews.list();
    const appPreview = previews.find((p: any) => p.metadata?.name === "app-preview");
    return appPreview?.spec?.url || null;
  } catch {
    return null;
  }
}

/**
 * Create a new sandbox with preview and session, ready for code generation.
 * Returns all the info the frontend needs.
 */
export async function createSandbox(sandboxImage: string) {
  const sandboxName = generateSandboxName();

  const sandboxConfig: SandboxCreateConfiguration = {
    name: sandboxName,
    image: sandboxImage,
    memory: 8192,
    labels: { coval: "true" },
    ports: [{ name: "preview", target: 4321, protocol: "HTTP" }],
  };

  const sandbox = await SandboxInstance.create(sandboxConfig);
  console.log(`[Blaxel] Sandbox created: ${sandbox.metadata?.name}`);

  await sandbox.wait();
  console.log(`[Blaxel] Sandbox is ready: ${sandbox.metadata?.name}`);

  sandboxCache.set(sandboxName, sandbox);

  // Create preview
  const preview = await sandbox.previews.create({
    metadata: { name: "app-preview" },
    spec: {
      port: 4321,
      public: true,
      responseHeaders: PREVIEW_CORS_HEADERS,
    },
  });
  const previewUrl = preview.spec?.url || null;
  console.log(`[Blaxel] Preview URL: ${previewUrl}`);

  // Create session for terminal access
  const session = await sandbox.sessions.createIfExpired({
    expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24),
    responseHeaders: PREVIEW_CORS_HEADERS,
  });
  console.log(`[Blaxel] Session created`);

  return {
    sandbox,
    sandboxName,
    previewUrl,
    sessionUrl: session.url,
    sessionToken: session.token,
  };
}
