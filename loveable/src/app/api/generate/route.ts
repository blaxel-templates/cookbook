import { createAppGenerationScript, createAppUpdateScript } from "@/lib/claude-code-generation";
import { createStreamingResponse } from "@/lib/utils";
import { SandboxCreateConfiguration, SandboxInstance } from "@blaxel/core";
import { NextRequest } from "next/server";

// Ensure process is available in Node.js runtime
declare const process: {
  env: {
    [key: string]: string | undefined;
  };
};

export async function POST(req: NextRequest) {
  try {
    const { messages, description, sandboxId } = await req.json();

    if (!description) {
      return new Response(
        JSON.stringify({ error: "Description is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    if (!process.env.SANDBOX_IMAGE && !process.env.SANDBOX_FORCED_URL) {
      return new Response(
        JSON.stringify({ error: "SANDBOX_IMAGE is required" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    // Check for required environment variables
    if (!process.env.ANTHROPIC_API_KEY) {
      return new Response(
        JSON.stringify({ error: "ANTHROPIC_API_KEY is required" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`[API] Starting app generation for: ${description}`);

    // Create a streaming response
    const { response, sseWriter } = createStreamingResponse();

    // Start the async generation
    (async () => {
      let sandbox: SandboxInstance | null = null;
      let sandboxName = sandboxId;
      const isLocalSandbox = !!process.env.SANDBOX_FORCED_URL;

      // Check if we already have a sandbox (for updates) or need to create a new one
      const isUpdate = messages && messages.length > 1 && sandboxId;

      try {
        if (isUpdate) {
          // Reuse existing sandbox for updates
          await sseWriter.sendLog("Connecting to existing sandbox...");

          if (isLocalSandbox) {
            sandbox = new SandboxInstance({ forceUrl: process.env.SANDBOX_FORCED_URL });
          } else {
            // Get existing sandbox
            sandbox = await SandboxInstance.get(sandboxId);
          }

          await sseWriter.sendLog("Connected to sandbox, updating your app...");

          // Create update script
          const updateScript = createAppUpdateScript(description, messages);

          // Write and execute the update script
          const scriptName = 'app-update.cjs';
          const scriptPath = `/app/${scriptName}`;
          await sandbox.fs.write(scriptPath, updateScript);

          await sseWriter.sendLog("Running Claude Code to update your app...");

          const updateProcessName = `update-${Date.now()}`;
          let updateProcess = await sandbox.process.exec({
            name: updateProcessName,
            command: `node ${scriptName}`,
            workingDir: '/app',
            waitForCompletion: false,
            env: {
              ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
              NODE_PATH: '/app/node_modules',
              SHELL: '/bin/bash',
              HOME: '/app',
            },
            onLog: (log) => {
              sseWriter.sendLog(log.trim());
            }
          });

          // Wait for completion
          updateProcess = await sandbox.process.wait(updateProcessName, { maxWait: 600000 }); // 10 minutes

          if (updateProcess.status !== 'completed') {
            throw new Error(`Update failed: ${updateProcess.logs || 'Unknown error'}`);
          }

          // Send completion message
          const msg = "✅ Your app has been updated! Check out the changes in the preview.";
          await sseWriter.sendLog(msg);
          await sseWriter.send({
            type: "complete",
            content: msg,
          });

        } else {
          // Create new sandbox for initial generation
          await sseWriter.sendLog("Starting to build your app...");
          await sseWriter.sendLog("Setting up development environment...");

          sandboxName = `app-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

          if (isLocalSandbox) {
            // Use local sandbox with forced URL
            console.log(`[Blaxel] Using local sandbox at: ${process.env.SANDBOX_FORCED_URL}`);
            sandbox = new SandboxInstance({ forceUrl: process.env.SANDBOX_FORCED_URL });
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
              image: process.env.SANDBOX_IMAGE,
              memory: 8192,
              envs,
              ports: [
                { name: "preview", target: 3000, protocol: "HTTP" },
              ],
            };

            sandbox = await SandboxInstance.create(sandboxConfig);
            console.log(`[Blaxel] Sandbox created: ${sandbox.metadata?.name}`);

            // Wait for the sandbox to be ready
            await sandbox.wait();
            console.log(`[Blaxel] Sandbox is ready: ${sandbox.metadata?.name}`);
          }

          await sseWriter.sendLog(`Environment ready: ${sandboxName}`);

          // Create preview URL
          await sseWriter.sendLog("Setting up preview...");

          let previewUrl = null;
          if (!isLocalSandbox) {
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
          } else {
            previewUrl = "http://localhost:3000";
          }

          // Send preview URL to frontend
          await sseWriter.send({
            previewUrl,
            sandboxId: sandboxName,
          });

          // Create new app
          await sseWriter.sendLog("Generating app structure...");

          // Create generation script
          const generationScript = createAppGenerationScript(description, messages);

          // Write the generation script to the sandbox
          const scriptName = 'app-generation.cjs';
          const scriptPath = `/app/${scriptName}`;
          await sandbox.fs.write(scriptPath, generationScript);

          await sseWriter.sendLog("Running Claude Code to generate your app...");

          // Execute the generation script
          const generationProcessName = `generation-${Date.now()}`;
          let generationProcess = await sandbox.process.exec({
            name: generationProcessName,
            command: `node ${scriptName}`,
            workingDir: '/app',
            waitForCompletion: false,
            env: {
              ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY || '',
              NODE_PATH: '/app/node_modules',
              SHELL: '/bin/bash',
              HOME: '/app',
            },
            onLog: (log) => {
              console.log(`[Blaxel] Generation process log: ${log.trim()}`);
              sseWriter.sendLog(log.trim());
            }
          });

          // Wait for completion with a longer timeout for generation
          generationProcess = await sandbox.process.wait(generationProcessName, { maxWait: 600000 }); // 10 minutes

          if (generationProcess.status !== 'completed') {
            throw new Error(`Generation failed: ${generationProcess.logs || 'Unknown error'}`);
          }

          // The dev server should already be started by Claude Code
          await sseWriter.sendLog("Your app is being served...");

          // Send completion message
          const msg = "✅ Your app is ready! Check out the preview on the right. You can continue to make changes by describing what you'd like to update.";
          await sseWriter.sendLog(msg);
          await sseWriter.send({
            type: "complete",
            content: msg,
          });
        }

        console.log(`[API] App generation/update complete`);

      } catch (error: any) {
        console.error("[API] Error during app generation:", error);
        await sseWriter.sendLog(`❌ Error during app generation: ${error.message}`);
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