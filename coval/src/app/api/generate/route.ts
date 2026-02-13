import { sandboxCache } from "@/lib/sandbox-cache";
import { createSandbox, getPreviewUrl } from "@/lib/sandbox-helpers";
import { DEFAULT_STATE, readSandboxState, writeSandboxState, SandboxState } from "@/lib/sandbox-state";
import { captureAndSaveScreenshot } from "@/lib/screenshot";
import { SYSTEM_PROMPT, buildContextMessage } from "@/lib/system-prompt";
import { SandboxInstance, settings } from "@blaxel/core";
import { anthropic } from "@ai-sdk/anthropic";
import { createMCPClient } from "@ai-sdk/mcp";
import { streamText, stepCountIs } from "ai";
import { NextRequest } from "next/server";

// Route segment config for streaming
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 600;

declare const process: { env: { [key: string]: string | undefined } };

const MCP_TOOLS_WHITELIST = ['fsReadFile', 'fsWriteFile', 'fsListDirectory', 'processExecute', 'processGetLogs'];

async function getModel() {
  return anthropic('claude-opus-4-6');
}

/** Connect to a sandbox's MCP server and return the filtered tool set */
async function connectMCP(sandbox: SandboxInstance) {
  const mcpClient = await createMCPClient({
    transport: {
      type: 'http',
      url: `${sandbox.metadata.url}/mcp`,
      headers: settings.headers as Record<string, string>,
    },
  });

  const allTools = await mcpClient.tools();
  const tools = Object.fromEntries(
    Object.entries(allTools).filter(([key]) => MCP_TOOLS_WHITELIST.includes(key))
  );
  console.log(`[Blaxel] MCP tools loaded: ${Object.keys(tools).join(', ')}`);

  return { mcpClient, tools };
}

/** Stream helper: wraps a ReadableStream controller with JSON-line helpers */
function createStreamWriter(controller: ReadableStreamDefaultController<Uint8Array>) {
  const encoder = new TextEncoder();
  let closed = false;

  return {
    write(data: any) {
      if (closed) return;
      try {
        controller.enqueue(encoder.encode(`${JSON.stringify(data)}\n`));
      } catch {
        // Stream closed
      }
    },
    log(message: string) {
      this.write({ log: message });
    },
    close() {
      closed = true;
      try {
        controller.enqueue(encoder.encode('[DONE]\n'));
        controller.close();
      } catch {
        // Already closed
      }
    },
    get isClosed() { return closed; },
  };
}

export async function POST(req: NextRequest) {
  try {
    const { prompt, sandboxId } = await req.json();
    const sandboxImage = process.env.SANDBOX_IMAGE || 'sandbox/codegen-sandbox:latest';

    if (!prompt) {
      return new Response(
        JSON.stringify({ error: "Prompt is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }

    console.log(`[API] Starting app generation for: ${prompt}`);

    const stream = new ReadableStream({
      async start(controller) {
        const sw = createStreamWriter(controller);

        let sandbox: SandboxInstance | null = null;
        let mcpClient: Awaited<ReturnType<typeof createMCPClient>> | null = null;
        let previewUrl: string | null = null;
        let sessionLogs: string[] = [];
        let messages: any[] = [];
        let currentState: SandboxState = { ...DEFAULT_STATE };

        const needsNewSandbox = !sandboxId;

        try {
          // --- Setup sandbox ---
          if (needsNewSandbox) {
            sw.log("Starting to build your app...");
            sw.log("Setting up development environment...");

            const result = await createSandbox(sandboxImage);
            sandbox = result.sandbox;
            previewUrl = result.previewUrl;

            sw.log(`Environment ready: ${result.sandboxName}`);
            sw.log("Setting up preview...");
            sw.log("Setting up terminal access...");

            sw.write({
              previewUrl: result.previewUrl,
              sessionUrl: result.sessionUrl,
              sessionToken: result.sessionToken,
              sandboxId: result.sandboxName,
            });
          } else {
            sw.log("Connecting to existing sandbox...");
            sandbox = await sandboxCache.get(sandboxId!);
            previewUrl = await getPreviewUrl(sandbox);
            sw.log("Connected to sandbox...");
          }

          // --- Connect MCP ---
          sw.log("Connecting to sandbox MCP server...");
          const mcp = await connectMCP(sandbox);
          mcpClient = mcp.mcpClient;

          // --- Load state ---
          const existingState = await readSandboxState(sandbox);
          console.log(`[Blaxel] Loaded state: ${existingState.conversationHistory.length} messages, status: ${existingState.status}`);

          if (existingState.logs.length > 0) {
            sw.write({ existingLogs: existingState.logs });
          }

          sw.log("Running AI assistant...");

          // --- Build messages ---
          const contextPrefix = needsNewSandbox ? buildContextMessage() : '';
          const userMessage = contextPrefix
            ? `${contextPrefix}\n\nUser request: ${prompt}`
            : prompt;

          messages = [
            ...existingState.conversationHistory,
            { role: 'user', content: userMessage },
          ];

          sessionLogs = [...existingState.logs];
          const addLog = (log: string) => {
            sessionLogs.push(log);
            sw.log(log);
          };

          // --- Mark in-progress ---
          currentState = {
            ...existingState,
            status: 'in_progress',
            currentPrompt: prompt,
            startedAt: new Date().toISOString(),
            logs: sessionLogs,
            conversationHistory: messages,
          };
          await writeSandboxState(sandbox, currentState);

          // --- Run AI ---
          const result = streamText({
            model: await getModel(),
            system: SYSTEM_PROMPT,
            messages,
            tools: mcp.tools,
            maxOutputTokens: 16384,
            stopWhen: stepCountIs(30),
            onStepFinish: async (stepResult) => {
              const sr = stepResult as any;

              // Stream tool calls to frontend
              if (sr.toolCalls?.length > 0) {
                for (const tc of sr.toolCalls) {
                  const toolName = tc.toolName || tc.name || 'unknown';
                  const toolArgs = tc.input || tc.args || {};
                  const matchingResult = (sr.toolResults as any[])?.find(
                    (r: any) => r.toolCallId === tc.toolCallId
                  );
                  sw.write({
                    toolCall: {
                      name: toolName,
                      args: toolArgs,
                      result: matchingResult?.result,
                    },
                  });
                }
              }

              if (sr.text) addLog(sr.text);

              // Persist state after each step
              const allMessages = sr.response?.messages || [];
              currentState = {
                ...currentState,
                logs: sessionLogs,
                conversationHistory: [...messages, ...allMessages],
              };
              await writeSandboxState(sandbox!, currentState);
            },
          });

          const response = await result.response;

          // --- Complete ---
          const updatedHistory = [...messages, ...response.messages];
          const completionMsg = needsNewSandbox
            ? "✅ Your app is ready! Check out the preview on the right. You can continue to make changes by describing what you'd like to update."
            : "✅ Your app has been updated! Check out the changes in the preview.";

          addLog(completionMsg);
          sw.write({ type: "complete", content: completionMsg });

          await writeSandboxState(sandbox, {
            status: 'completed',
            logs: sessionLogs,
            conversationHistory: updatedHistory,
            currentPrompt: null,
            startedAt: currentState.startedAt,
            completedAt: new Date().toISOString(),
            error: null,
          });

          console.log(`[API] App generation/update complete, state saved`);

          // --- Screenshot (background, non-blocking) ---
          if (previewUrl && sandbox) {
            captureAndSaveScreenshot(previewUrl, sandbox).catch((err) => {
              console.error(`[Screenshot] Background capture error:`, err);
            });
          }

        } catch (error: any) {
          console.error("[API] Error during app generation:", error);
          const errorMsg = `❌ Error during app generation: ${error.message}`;
          sessionLogs.push(errorMsg);
          sw.log(errorMsg);

          if (sandbox) {
            await writeSandboxState(sandbox, {
              status: 'error',
              logs: sessionLogs,
              conversationHistory: messages,
              currentPrompt: prompt,
              startedAt: currentState.startedAt,
              completedAt: new Date().toISOString(),
              error: error.message,
            });
          }
        } finally {
          if (mcpClient) {
            try {
              await mcpClient.close();
              console.log('[Blaxel] MCP client closed');
            } catch (error) {
              console.error('Error closing MCP client:', error);
            }
          }
          sw.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache, no-transform',
        'X-Accel-Buffering': 'no',
      },
    });

  } catch (error: any) {
    console.error("[API] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
