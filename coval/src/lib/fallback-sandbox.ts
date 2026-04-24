import { SandboxInstance } from "@blaxel/core";
import fs from "node:fs";
import path from "node:path";

export const DEFAULT_FALLBACK_IMAGE = "blaxel/nextjs:latest";

const TEMPLATE_APP_DIR = path.join(process.cwd(), "codegen-sandbox", "app");

/** Detect a "sandbox image not found" error from Blaxel. */
export function isImageNotFoundError(error: any): boolean {
  if (!error) return false;
  const code = error.code;
  const statusCode = error.status_code ?? error.statusCode;
  const message = String(error.message ?? "").toLowerCase();

  if (code === "INVALID_IMAGE") return true;
  if ((code === 400 || statusCode === 400) && message.includes("image")) return true;
  if (message.includes("image") && message.includes("not found")) return true;
  return false;
}

type FileEntry = { relativePath: string; absolutePath: string };

function walkFiles(dir: string, base: string = dir): FileEntry[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const result: FileEntry[] = [];
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".astro" || entry.name === "dist") continue;
    const absolutePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...walkFiles(absolutePath, base));
    } else if (entry.isFile()) {
      result.push({
        relativePath: path.relative(base, absolutePath),
        absolutePath,
      });
    }
  }
  return result;
}

/** Upload the bundled template app files (codegen-sandbox/app) into the sandbox. */
export async function uploadTemplateAppFiles(
  sandbox: SandboxInstance,
  onLog: (msg: string) => void,
  destination: string = "/app",
): Promise<void> {
  if (!fs.existsSync(TEMPLATE_APP_DIR)) {
    throw new Error(`Template app directory not found at ${TEMPLATE_APP_DIR}`);
  }

  const files = walkFiles(TEMPLATE_APP_DIR);
  onLog(`Uploading ${files.length} template files to sandbox...`);

  const uniqueDirs = new Set<string>([destination]);
  for (const { relativePath } of files) {
    const posixRel = relativePath.split(path.sep).join("/");
    const dir = path.posix.join(destination, path.posix.dirname(posixRel));
    if (dir !== "." && dir !== "/") uniqueDirs.add(dir);
  }
  for (const dir of uniqueDirs) {
    try {
      await sandbox.fs.mkdir(dir);
    } catch {
      // directory may already exist
    }
  }

  for (const { relativePath, absolutePath } of files) {
    const destPath = path.posix.join(destination, relativePath.split(path.sep).join("/"));
    await sandbox.fs.writeBinary(destPath, absolutePath);
  }
}

/** Install dependencies and start the Astro dev server in the fallback sandbox. */
export async function startFallbackDevServer(
  sandbox: SandboxInstance,
  onLog: (msg: string) => void,
): Promise<void> {
  onLog("Installing dependencies in sandbox (this may take a minute)...");
  await sandbox.process.exec({
    command: "npm install --no-audit --no-fund",
    workingDir: "/app",
    waitForCompletion: true,
    timeout: 300,
  });

  // Default Blaxel images (e.g. blaxel/nextjs) ship with their own dev-server
  // already running. Stop it so we can start the Astro one on the same port.
  try {
    await sandbox.process.stop("dev-server");
  } catch {
    // no existing process
  }

  onLog("Starting dev server in sandbox...");
  await sandbox.process.exec({
    name: "dev-server",
    command: "npx astro dev --host 0.0.0.0 --port 4321",
    workingDir: "/app",
    waitForCompletion: false,
    restartOnFailure: true,
    maxRestarts: 25,
  });
}
