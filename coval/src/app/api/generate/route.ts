import { sandboxCache } from "@/lib/sandbox-cache";
import { SandboxCreateConfiguration, SandboxInstance, settings } from "@blaxel/core";
import { anthropic } from "@ai-sdk/anthropic";
import { createMCPClient } from "@ai-sdk/mcp";
import { streamText, stepCountIs } from "ai";
import { NextRequest } from "next/server";

// Route segment config for streaming
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const maxDuration = 600; // 10 minutes max execution time

// Ensure process is available in Node.js runtime
declare const process: {
  env: {
    [key: string]: string | undefined;
  };
};

// State file path in sandbox (root level, outside app directory)
const STATE_FILE_PATH = '/state.json';

// State structure stored in sandbox
// Uses 'any' for conversationHistory to store AI SDK messages directly
export interface SandboxState {
  status: 'idle' | 'in_progress' | 'completed' | 'error';
  logs: string[];
  conversationHistory: any[];
  currentPrompt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  error: string | null;
}

// Default empty state
const DEFAULT_STATE: SandboxState = {
  status: 'idle',
  logs: [],
  conversationHistory: [],
  currentPrompt: null,
  startedAt: null,
  completedAt: null,
  error: null,
};

// Helper to read state from sandbox filesystem
async function readSandboxState(sandbox: SandboxInstance): Promise<SandboxState> {
  try {
    const content = await sandbox.fs.read(STATE_FILE_PATH);
    return JSON.parse(content);
  } catch (error) {
    // File doesn't exist or can't be read, return default
    console.log('[Blaxel] No existing state found, using default');
  }
  return { ...DEFAULT_STATE };
}

// Helper to write state to sandbox filesystem
async function writeSandboxState(sandbox: SandboxInstance, state: SandboxState): Promise<void> {
  try {
    const content = JSON.stringify(state, null, 2);
    await sandbox.fs.write(STATE_FILE_PATH, content);
  } catch (error) {
    console.error('[Blaxel] Error writing state:', error);
  }
}

/**
 * System prompt for Astro development
 */
const SYSTEM_PROMPT = `You are an expert full-stack developer. Build or modify a beautiful, modern web application using Astro.

CRITICAL RULES:
- The dev server is ALREADY RUNNING. DO NOT start, restart, or stop it.
- DO NOT run "bun run dev", "npm run dev", or any server start commands.
- DO NOT kill or restart any processes unless explicitly asked.
- ONLY run "bun install" if you ADD NEW packages to package.json that don't exist yet.
- The server auto-reloads on file changes - just edit files and they'll be picked up.
- DO NOT modify these config files: astro.config.mjs, tailwind.config.mjs, tsconfig.json
- If you MUST add an Astro integration, READ the existing astro.config.mjs FIRST and preserve ALL existing settings (server, devToolbar, integrations).

Pre-installed libraries (DO NOT install these):
- Tailwind CSS with @tailwindcss/typography and @tailwindcss/forms plugins
- lucide-astro - Icon library (import icons like: import { Icon } from 'lucide-astro')
- clsx + tailwind-merge - For conditional classes (use cn() from src/lib/utils.ts)

Pre-configured styling:
- Global styles in src/styles/global.css (already imported in Layout.astro)
- Primary color palette: primary-50 to primary-950
- Button classes: .btn, .btn-primary, .btn-secondary, .btn-outline, .btn-ghost, .btn-sm, .btn-lg
- Card classes: .card, .card-hover
- Form classes: .input, .input-error, .label
- Badge classes: .badge-primary, .badge-success, .badge-warning, .badge-error, .badge-gray
- Animations: animate-fade-in, animate-slide-up, animate-slide-down, animate-scale-in
- Utilities: .glass (glassmorphism), .gradient-primary

Requirements:
- Use Astro framework with TypeScript
- Use Tailwind CSS for styling (already configured)
- Use lucide-astro for icons
- Create a modern, beautiful UI with great UX
- Make it fully functional and production-ready
- Add proper error handling
- Make it responsive for all screen sizes

Project structure:
- The project is in /app directory and is already set up
- src/layouts/Layout.astro - Base layout with global styles and Inter font
- src/pages/ - Create pages here (index.astro is the main entry)
- src/components/ - Put reusable components here
- src/lib/utils.ts - Contains cn() helper for merging Tailwind classes
- Use .astro file extension for Astro components

Astro basics:
- Frontmatter is delimited by --- at the top of .astro files
- Use <script> tags for client-side JavaScript
- Use client:load, client:idle, or client:visible directives for interactive components
- Static by default, islands architecture for interactivity

Workflow:
1. Read existing files if needed to understand current state
2. Create or modify files as needed
3. ONLY if you added new dependencies to package.json, run "bun install"
4. That's it - the dev server will auto-reload`;

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

    // Create streaming response with async work in pull()
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        let streamClosed = false;

        // Helper to write to stream
        const writeStream = (data: any) => {
          if (streamClosed) return;
          try {
            const json = JSON.stringify(data);
            controller.enqueue(encoder.encode(`${json}\n`));
          } catch (error) {
            // Stream likely closed, ignore
          }
        };

        const writeLog = (log: string) => {
          writeStream({ log });
        };

        let sandbox: SandboxInstance | null = null;
        let sandboxName = sandboxId || null;
        let mcpClient: Awaited<ReturnType<typeof createMCPClient>> | null = null;
        const isLocalSandbox = !!process.env.SANDBOX_FORCED_URL;

        // Check if we need to create a new sandbox or use existing one
        const needsNewSandbox = !sandboxId;

        // State tracking variables (declared here for catch block access)
        let sessionLogs: string[] = [];
        let messages: any[] = [];
        let currentState: SandboxState = { ...DEFAULT_STATE };

        try {
          if (needsNewSandbox) {
            // Create new sandbox for initial generation
            writeLog("Starting to build your app...");
            writeLog("Setting up development environment...");

            sandboxName = `app-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

            if (isLocalSandbox) {
              // Use local sandbox with forced URL
              console.log(`[Blaxel] Using local sandbox at: ${process.env.SANDBOX_FORCED_URL}`);
              // Cache the new local sandbox instance
              sandbox = await sandboxCache.get(sandboxName, process.env.SANDBOX_FORCED_URL);
              console.log(`[Blaxel] Local sandbox connected`);
            } else {
              // Create new sandbox in the cloud with coval label
              const sandboxConfig: SandboxCreateConfiguration = {
                name: sandboxName,
                image: sandboxImage,
                memory: 8192,
                labels: { coval: "true" },
                ports: [
                  { name: "preview", target: 4321, protocol: "HTTP" },
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

            writeLog(`Environment ready: ${sandboxName}`);

            // Create preview URL and session
            writeLog("Setting up preview...");

            let previewUrl = null;
            let sessionUrl = null;
            let sessionToken = null;

            if (!isLocalSandbox) {
              // CORS headers for preview
              const responseHeaders = {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
                "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
                "Access-Control-Allow-Credentials": "true",
                "Access-Control-Max-Age": "86400",
                "Vary": "Origin"
              };

              // Create app preview on port 4321
              const preview = await sandbox.previews.create({
                metadata: { name: "app-preview" },
                spec: {
                  port: 4321,
                  public: true,
                  responseHeaders,
                }
              });
              previewUrl = preview.spec?.url;
              console.log(`[Blaxel] Preview URL created: ${previewUrl}`);

              // Create session for terminal access
              writeLog("Setting up terminal access...");
              const session = await sandbox.sessions.createIfExpired({
                expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 24 hours
                responseHeaders,
              });
              sessionUrl = session.url;
              sessionToken = session.token;
              console.log(`[Blaxel] Session created for terminal access`);
            } else {
              previewUrl = "http://localhost:4321";
              sessionUrl = process.env.SANDBOX_FORCED_URL;
              sessionToken = "local";
            }

            // Send preview URLs to frontend
            writeStream({
              previewUrl,
              sessionUrl,
              sessionToken,
              sandboxId: sandboxName,
            });
          } else {
            // Use existing sandbox
            writeLog("Connecting to existing sandbox...");

            sandbox = await sandboxCache.get(
              sandboxId!,
              isLocalSandbox ? process.env.SANDBOX_FORCED_URL : undefined
            );

            writeLog("Connected to sandbox...");
          }

          // Create MCP client connected to sandbox
          writeLog("Connecting to sandbox MCP server...");

          const mcpUrl = isLocalSandbox
            ? `${process.env.SANDBOX_FORCED_URL}/mcp`
            : `${sandbox.metadata.url}/mcp`;

          mcpClient = await createMCPClient({
            transport: {
              type: 'http',
              url: mcpUrl,
              headers: settings.headers as Record<string, string>,
            },
          });

          // Get tools from MCP server
          const tools = await mcpClient.tools();
          const includeTools = ['fsReadFile', 'fsWriteFile', 'fsListDirectory', 'processExecute'];
          const filteredTools = Object.fromEntries(Object.entries(tools).filter(([key]) => includeTools.includes(key)));
          console.log(`[Blaxel] MCP tools loaded: ${Object.keys(filteredTools).join(', ')}`);

          // Load existing state from sandbox
          const existingState = await readSandboxState(sandbox!);
          console.log(`[Blaxel] Loaded state: ${existingState.conversationHistory.length} messages, status: ${existingState.status}`);

          // Send existing logs to frontend if any
          if (existingState.logs.length > 0) {
            writeStream({ existingLogs: existingState.logs });
          }

          writeLog("Running AI assistant...");

          // Build messages: use existing conversation history + new prompt
          messages = [
            ...existingState.conversationHistory,
            { role: 'user', content: prompt }
          ];

          // Track logs for this session
          sessionLogs = [...existingState.logs];
          const addLog = (log: string) => {
            sessionLogs.push(log);
            writeLog(log);
          };

          // Update state to in_progress
          currentState = {
            ...existingState,
            status: 'in_progress',
            currentPrompt: prompt,
            startedAt: new Date().toISOString(),
            logs: sessionLogs,
            conversationHistory: messages,
          };
          await writeSandboxState(sandbox!, currentState);

          // Use streamText with Claude and MCP tools
          const result = streamText({
            model: anthropic('claude-opus-4-6'),
            system: SYSTEM_PROMPT,
            messages,
            tools,
            stopWhen: stepCountIs(50), // Allow up to 50 tool calls
            onStepFinish: async (stepResult) => {
              const { text, response } = stepResult;

              // Log assistant text if any
              if (text) {
                addLog(text);
              }

              // Save state after each step using AI SDK's response messages
              // This includes all messages (user, assistant, tool calls, tool results)
              const allMessages = response?.messages || [];
              currentState = {
                ...currentState,
                logs: sessionLogs,
                conversationHistory: [...messages, ...allMessages],
              };
              await writeSandboxState(sandbox!, currentState);
            },
          });

          // Wait for completion and get final response
          const response = await result.response;

          // Get all messages from the AI SDK response (includes tool calls/results in proper format)
          const responseMessages = response.messages;
          const updatedHistory = [...messages, ...responseMessages];

          // Send completion message
          const msg = needsNewSandbox
            ? "✅ Your app is ready! Check out the preview on the right. You can continue to make changes by describing what you'd like to update."
            : "✅ Your app has been updated! Check out the changes in the preview.";
          addLog(msg);
          writeStream({
            type: "complete",
            content: msg,
          });

          // Save completed state to sandbox
          const completedState: SandboxState = {
            status: 'completed',
            logs: sessionLogs,
            conversationHistory: updatedHistory,
            currentPrompt: null,
            startedAt: currentState.startedAt,
            completedAt: new Date().toISOString(),
            error: null,
          };
          await writeSandboxState(sandbox!, completedState);

          console.log(`[API] App generation/update complete, state saved`);

        } catch (error: any) {
          console.error("[API] Error during app generation:", error);
          const errorMsg = `❌ Error during app generation: ${error.message}`;
          sessionLogs.push(errorMsg);
          writeLog(errorMsg);

          // Save error state to sandbox
          if (sandbox) {
            const errorState: SandboxState = {
              status: 'error',
              logs: sessionLogs,
              conversationHistory: messages,
              currentPrompt: prompt,
              startedAt: currentState.startedAt,
              completedAt: new Date().toISOString(),
              error: error.message,
            };
            await writeSandboxState(sandbox, errorState);
          }
        } finally {
          // Close MCP client
          if (mcpClient) {
            try {
              await mcpClient.close();
              console.log('[Blaxel] MCP client closed');
            } catch (error) {
              console.error('Error closing MCP client:', error);
            }
          }

          // Note: We don't clean up the sandbox here because the user might want to continue working on it
          streamClosed = true;
          try {
            controller.enqueue(encoder.encode('[DONE]\n'));
            controller.close();
          } catch (error) {
            // Stream already closed, ignore
          }
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
