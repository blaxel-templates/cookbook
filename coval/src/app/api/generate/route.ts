import { createStreamingResponse } from "@/lib/utils";
import { getProject, updateProject, addHistoryEntry } from "@/lib/database";
import { sandboxCache } from "@/lib/sandbox-cache";
import { SandboxCreateConfiguration, SandboxInstance } from "@blaxel/core";
import { NextRequest } from "next/server";

// Disable caching for this route
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Ensure process is available in Node.js runtime
declare const process: {
  env: {
    [key: string]: string | undefined;
  };
};

/**
 * Escape a string for safe use in shell commands by base64 encoding
 */
function escapeForShell(str: string): string {
  return Buffer.from(str).toString('base64');
}

/**
 * System prompt for Claude Code
 */
const SYSTEM_PROMPT = `You are an expert full-stack developer. Build or modify a beautiful, modern web application.

Requirements:
- Use Next.js 14 with App Router
- Use React and TypeScript
- Use Tailwind CSS for styling
- Create a modern, beautiful UI with great UX
- Make it fully functional and production-ready
- Add proper error handling
- Make it responsive for all screen sizes

Project structure:
- The project is already initialized in /app directory
- package.json already exists with necessary dependencies
- Create all necessary files in the src/ directory
- Use the src/app directory for Next.js app router pages
- Put reusable components in src/components

After creating/modifying files:
1. Run "npm install" to ensure all dependencies are installed
2. Make sure the dev server keeps running after you finish`;

export async function POST(req: NextRequest) {
  try {
    const { prompt, projectId } = await req.json();
    const sandboxImage = process.env.SANDBOX_IMAGE || 'sandbox/codegen-sandbox:latest';

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!projectId) {
      return new Response(
        JSON.stringify({ error: "Project ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    // Get project from database
    const project = getProject(projectId);
    if (!project) {
      return new Response(
        JSON.stringify({ error: "Project not found" }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check for required environment variables
    if (!process.env.ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY is required" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`[API] Starting app generation for: ${prompt}`);

    // Create a streaming response
    const { response, sseWriter } = createStreamingResponse();

    // Start the async generation
    (async () => {
      let sandbox: SandboxInstance | null = null;
      let sandboxName = project.sandboxId;
      const isLocalSandbox = !!process.env.SANDBOX_FORCED_URL;

      // Check if we need to create a new sandbox or use existing one
      const needsNewSandbox = !project.sandboxId;

      try {
        if (needsNewSandbox) {
          // Create new sandbox for initial generation
          await sseWriter.sendLog("Starting to build your app...");
          await sseWriter.sendLog("Setting up development environment...");

          sandboxName = `app-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

          if (isLocalSandbox) {
            // Use local sandbox with forced URL
            console.log(`[Blaxel] Using local sandbox at: ${process.env.SANDBOX_FORCED_URL}`);
            // Cache the new local sandbox instance
            sandbox = await sandboxCache.get(sandboxName, process.env.SANDBOX_FORCED_URL);
            console.log(`[Blaxel] Local sandbox connected`);
          } else {
            // Create new sandbox in the cloud
            const envs = [
              { name: "ANTHROPIC_API_KEY", value: process.env.ANTHROPIC_API_KEY || "" },
              { name: "NODE_ENV", value: "development" },
              { name: "NEXT_TELEMETRY_DISABLED", value: "1" },
            ];

            const sandboxConfig: SandboxCreateConfiguration = {
              name: sandboxName,
              image: sandboxImage,
              memory: 8192,
              envs,
              ports: [
                { name: "preview", target: 3000, protocol: "HTTP" },
                { name: "ttyd", target: 12345, protocol: "HTTP" },
              ],
            };

            sandbox = await SandboxInstance.create(sandboxConfig);
            console.log(`[Blaxel] Sandbox created: ${sandbox.metadata?.name}`);

            // Wait for the sandbox to be ready
            await sandbox.wait();
            console.log(`[Blaxel] Sandbox is ready: ${sandbox.metadata?.name}`);

            // Cache the newly created sandbox for future requests
            sandboxCache.set(sandboxName, sandbox);
          }

          await sseWriter.sendLog(`Environment ready: ${sandboxName}`);

          // Create preview URLs
          await sseWriter.sendLog("Setting up preview...");

          let previewUrl = null;
          let ttydUrl = null;

          if (!isLocalSandbox) {
            // Create app preview on port 3000
            const preview = await sandbox.previews.create({
              metadata: { name: "app-preview" },
              spec: {
                port: 3000,
                public: true,
                responseHeaders: {
                  "Access-Control-Allow-Origin": "*",
                  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
                  "Access-Control-Allow-Credentials": "true",
                  "Access-Control-Max-Age": "86400",
                  "Vary": "Origin"
                }
              }
            });
            previewUrl = preview.spec?.url;
            console.log(`[Blaxel] Preview URL created: ${previewUrl}`);

            // Create TTYD terminal preview on port 12345
            await sseWriter.sendLog("Setting up terminal access...");
            const ttydPreview = await sandbox.previews.create({
              metadata: { name: "ttyd-terminal" },
              spec: {
                port: 12345,
                public: true,
                responseHeaders: {
                  "Access-Control-Allow-Origin": "*",
                  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH, WEBSOCKET",
                  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
                  "Access-Control-Allow-Credentials": "true",
                }
              }
            });
            ttydUrl = ttydPreview.spec?.url;
            console.log(`[Blaxel] TTYD URL created: ${ttydUrl}`);
          } else {
            previewUrl = "http://localhost:3000";
            ttydUrl = "http://localhost:12345";
          }

          // Update project in database with sandbox info
          updateProject(projectId, {
            sandboxId: sandboxName,
            previewUrl,
            ttydUrl,
          });

          // Send preview URLs to frontend
          await sseWriter.send({
            previewUrl,
            ttydUrl,
            sandboxId: sandboxName,
          });
        } else {
          // Use existing sandbox
          await sseWriter.sendLog("Connecting to existing sandbox...");

          sandbox = await sandboxCache.get(
            project.sandboxId!,
            isLocalSandbox ? process.env.SANDBOX_FORCED_URL : undefined
          );

          await sseWriter.sendLog("Connected to sandbox...");
        }

        // Run Claude Code with unified approach
        await sseWriter.sendLog("Running Claude Code...");

        // Build Claude command - use --resume only if session_id exists
        const processName = `claude-${Date.now()}`;
        const encodedPrompt = escapeForShell(prompt);
        const encodedSystemPrompt = escapeForShell(SYSTEM_PROMPT);
        let claudeCommand: string;

        if (project.sessionId) {
          claudeCommand = `echo "${encodedPrompt}" | base64 -d | claude --resume "${project.sessionId}" -p --append-system-prompt "$(echo "${encodedSystemPrompt}" | base64 -d)" --output-format stream-json --permission-mode acceptEdits --verbose`;
        } else {
          claudeCommand = `echo "${encodedPrompt}" | base64 -d | claude -p --append-system-prompt "$(echo "${encodedSystemPrompt}" | base64 -d)" --output-format stream-json --permission-mode acceptEdits --verbose`;
        }

        let sessionId: string | null = null;
        let claudeProcess = await sandbox.process.exec({
          name: processName,
          command: claudeCommand,
          workingDir: '/app',
          waitForCompletion: false,
          env: {
            ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
            SHELL: '/bin/bash',
            HOME: '/app',
          },
          onLog: (log) => {
            console.log(`[Blaxel] Claude Code log: ${log.trim()}`);

            // Parse streaming JSON messages
            const lines = log.split('\n');
            for (const line of lines) {
              const trimmed = line.trim();
              if (!trimmed) continue;

              try {
                const message = JSON.parse(trimmed);

                // Extract session_id from result message
                if (message.type === 'result' && message.session_id) {
                  sessionId = message.session_id;
                }

                // Display assistant's text content
                if (message.type === 'assistant' && message.message?.content) {
                  const content = message.message.content;
                  if (Array.isArray(content)) {
                    for (const block of content) {
                      if (block.type === 'text' && block.text) {
                        sseWriter.sendLog(block.text);
                      }
                    }
                  }
                }
              } catch (error) {
                // If not JSON, it might be a non-JSON log line
                if (!trimmed.startsWith('{')) {
                  sseWriter.sendLog(trimmed);
                }
              }
            }
          }
        });

        // Wait for completion
        claudeProcess = await sandbox.process.wait(processName, { maxWait: 600000 }); // 10 minutes

        if (claudeProcess.status !== 'completed') {
          throw new Error(`Claude Code failed: ${claudeProcess.logs || 'Unknown error'}`);
        }

        // Store session_id if captured
        if (sessionId) {
          updateProject(projectId, { sessionId });
          console.log(`[API] Stored session_id: ${sessionId}`);
        }

        // Add to project history
        const historyType = needsNewSandbox ? 'create' : 'update';
        const historyDescription = needsNewSandbox ? `Generated: ${prompt}` : `Updated: ${prompt}`;
        addHistoryEntry(projectId, {
          type: historyType,
          description: historyDescription,
        });

        // Send completion message
        const msg = needsNewSandbox
          ? "✅ Your app is ready! Check out the preview on the right. You can continue to make changes by describing what you'd like to update."
          : "✅ Your app has been updated! Check out the changes in the preview.";
        await sseWriter.sendLog(msg);
        await sseWriter.send({
          type: "complete",
          content: msg,
        });

        console.log(`[API] App generation/update complete`);

      } catch (error: any) {
        console.error("[API] Error during app generation:", error);
        await sseWriter.sendLog(`❌ Error during app generation: ${error.message}`);

        // Add error to project history
        addHistoryEntry(projectId, {
          type: 'error',
          description: `Error: ${error.message}`,
        });
      } finally {
        // Note: We don't clean up the sandbox here because the user might want to continue working on it
        await sseWriter.sendDone();
        await sseWriter.close();
      }
    })();

    return response;

  } catch (error: any) {
    console.error("[API] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}