import { SandboxCreateConfiguration, SandboxInstance } from "@blaxel/core";
import { sandboxCache } from "./sandbox-cache";
import {
  DEFAULT_FALLBACK_IMAGE,
  isImageNotFoundError,
  startFallbackDevServer,
  uploadTemplateAppFiles,
} from "./fallback-sandbox";

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
 *
 * If the requested image cannot be found, falls back to the default Blaxel
 * image, uploads the bundled template app files and starts the dev server.
 * In that case `usedFallback` is set to `true`.
 */
export async function createSandbox(
  sandboxImage: string,
  onLog: (msg: string) => void = () => {},
) {
  const sandboxName = generateSandboxName();

  const baseConfig: Omit<SandboxCreateConfiguration, "image"> = {
    name: sandboxName,
    memory: 8192,
    labels: { coval: "true" },
    ports: [{ name: "preview", target: 4321, protocol: "HTTP" }],
  };

  let sandbox: SandboxInstance;
  let usedFallback = false;
  let imageUsed = sandboxImage;

  try {
    sandbox = await SandboxInstance.create({ ...baseConfig, image: sandboxImage });
  } catch (error: any) {
    if (!isImageNotFoundError(error) || sandboxImage === DEFAULT_FALLBACK_IMAGE) {
      throw error;
    }
    console.warn(
      `[Blaxel] Image "${sandboxImage}" not found; falling back to "${DEFAULT_FALLBACK_IMAGE}"`,
    );
    onLog(
      `⚠️ Image '${sandboxImage}' not found. Falling back to default Blaxel image '${DEFAULT_FALLBACK_IMAGE}'. ` +
        `To use a custom template, build and deploy a template sandbox. ` +
        `Docs: https://docs.blaxel.ai/Sandboxes/Templates`,
    );
    sandbox = await SandboxInstance.create({ ...baseConfig, image: DEFAULT_FALLBACK_IMAGE });
    usedFallback = true;
    imageUsed = DEFAULT_FALLBACK_IMAGE;
  }

  console.log(`[Blaxel] Sandbox created: ${sandbox.metadata?.name} (image: ${imageUsed})`);

  await sandbox.wait();
  console.log(`[Blaxel] Sandbox is ready: ${sandbox.metadata?.name}`);

  sandboxCache.set(sandboxName, sandbox);

  if (usedFallback) {
    await uploadTemplateAppFiles(sandbox, onLog);
    await startFallbackDevServer(sandbox, onLog);
  }

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
    usedFallback,
    imageUsed,
  };
}
