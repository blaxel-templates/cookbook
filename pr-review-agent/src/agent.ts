import { anthropic } from "@ai-sdk/anthropic";
import { createMCPClient } from "@ai-sdk/mcp";
import { SandboxCreateConfiguration, SandboxInstance, settings } from "@blaxel/core";
import { stepCountIs, streamText } from "ai";
import { fetchGitHubPRData, formatPRMetadata, parsePRUrl } from "./github";
import { Stream } from "./types";

async function getCloneProcess(stream: Stream, sandbox: SandboxInstance) {
  for (let i = 0; i < 10; i++) {
    try {
      const cloneProcess = await sandbox.process.get("clone-repository");
      if (cloneProcess.status === "running") {
        return await sandbox.process.wait("clone-repository", { maxWait: 60000 });
      }
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.warn(`⚠️ Warning: retrying to get clone process... \n`);
      stream.write(`⚠️ Warning: retrying to get clone process... \n`);
    }
  }
  throw new Error("Clone process timed out");
}


export default async function agent(
  input: string,
  stream: Stream
): Promise<void> {
  // Check if input contains a GitHub PR URL
  const prUrlMatch = input.match(/https:\/\/github\.com\/[^\/]+\/[^\/]+\/pull\/\d+/);

  if (!prUrlMatch) {
    // Use the standard agent for non-PR questions
    stream.write(`❌ Invalid input: Invalid GitHub PR URL format\n`);
    stream.end();
    return;
  }

  // Handle PR analysis
  const prUrl = prUrlMatch[0];
  let sandbox: SandboxInstance | null = null;
  let mcpClient: Awaited<ReturnType<typeof createMCPClient>> | null = null;
  const sandboxName = `pr-analysis-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;

  try {
    stream.write(`🔍 Analyzing PR: ${prUrl} \n`);

    // Parse PR URL
    const prInfo = parsePRUrl(prUrl);
    if (!prInfo) {
      throw new Error("Invalid GitHub PR URL format");
    }

    stream.write(`📋 PR Info: ${prInfo.owner}/${prInfo.repo}#${prInfo.prNumber} \n`);

    // Fetch PR data
    stream.write(`🌐 Fetching PR data from GitHub API... \n`);
    const prData = await fetchGitHubPRData(prInfo.owner, prInfo.repo, prInfo.prNumber, process.env.GITHUB_TOKEN);

    stream.write(`✅ PR Data Retrieved: \n`);
    stream.write(`   Title: ${prData.title} \n`);
    stream.write(`   Author: ${prData.user.login} \n`);
    stream.write(`   Changes: +${prData.additions} -${prData.deletions} in ${prData.changed_files} files \n`);

    // Determine repository URL
    let repositoryUrl = prInfo.repoUrl;
    if (prData.head.repo && prData.head.repo.clone_url) {
      repositoryUrl = prData.head.repo.clone_url;
      stream.write(`   Using fork repository: ${prData.head.repo.full_name}\n`);
    }

    // Create sandbox
    const image = process.env.SANDBOX_IMAGE || "prod/main/sandbox/custom-sandbox:latest";
    console.info(`🏗️ Creating sandbox environment with image=${image}, repository=${repositoryUrl}, branch=${prData.head.ref}...`);
    stream.write(`🏗️ Creating sandbox environment with image=${image}, repository=${repositoryUrl}, branch=${prData.head.ref}... \n`);

    const envs = [
      { name: "REPOSITORY_URL", value: repositoryUrl },
      { name: "REPOSITORY_BRANCH", value: prData.head.ref },
      { name: "SHELL", value: "/bin/bash" },
    ];

    if (process.env.GITHUB_TOKEN) {
      envs.push({ name: "GITHUB_TOKEN", value: process.env.GITHUB_TOKEN });
    }

    const sandboxConfig: SandboxCreateConfiguration = {
      name: sandboxName,
      image,
      memory: 8192,
      envs,
      ports: [
        { name: "sandbox-api", target: 8080, protocol: "TCP" },
      ],
    };

    sandbox = await SandboxInstance.create(sandboxConfig);
    console.info(`✅ Sandbox created: ${sandboxName}`);
    stream.write(`✅ Sandbox created: ${sandboxName} \n`);

    // Wait for sandbox to be ready
    await sandbox.wait();
    console.info(`🏃 Sandbox is ready`);
    stream.write(`🏃 Sandbox is ready \n`);

    // Wait for repository to be cloned
    console.info(`📥 Cloning repository...`);
    stream.write(`📥 Cloning repository... \n`);
    const cloneProcess = await getCloneProcess(stream, sandbox);

    if (cloneProcess.status !== "completed") {
      throw new Error(`Repository clone failed: ${cloneProcess.logs}`);
    }
    console.info(`✅ Repository cloned, logs=${cloneProcess.logs}`);
    stream.write(`✅ Repository cloned, logs=${cloneProcess.logs} \n`);

    // Checkout specific commit
    if (prData.head.sha) {
      stream.write(`🔄 Checking out commit: ${prData.head.sha.substring(0, 7)} \n`);
      const checkoutProcess = `checkout-${Date.now()}`;

      const result = await sandbox.process.exec({
        name: checkoutProcess,
        command: `git checkout ${prData.head.sha}`,
        workingDir: "/app/repository",
        waitForCompletion: true,
      });
      console.info(`✅ Checkout result: ${result.logs}`);
      stream.write(`✅ Checkout result: ${result.logs} \n`);
    }

    // Connect to sandbox via MCP using standard @ai-sdk/mcp
    stream.write(`🔌 Connecting to sandbox via MCP... \n`);
    const mcpUrl = `${sandbox.metadata.url}/mcp`;
    console.info(`Connecting to MCP: ${mcpUrl}`);
    
    mcpClient = await createMCPClient({
      transport: {
        type: 'http',
        url: mcpUrl,
        headers: settings.headers,
      },
    });

    console.info(`✅ MCP connection established`);
    stream.write(`✅ MCP connected \n`);

    // Get tools from MCP - automatic conversion to Vercel AI SDK format!
    const aiTools = await mcpClient.tools();
    const toolCount = Object.keys(aiTools).length;
    console.info(`Available tools (${toolCount}): ${Object.keys(aiTools).join(', ')}`);
    stream.write(`🔧 Available tools: ${toolCount} \n`);

    // Create the system prompt for PR analysis
    const systemPrompt = `You are a senior software engineer conducting a focused code review for GitHub PR #${prInfo.prNumber} in ${prInfo.owner}/${prInfo.repo}.

IMPORTANT: You are connected to a sandbox environment with the repository already cloned to /app/repository.
${prData && prData.head.repo ? `The repository is cloned from ${prData.head.repo.full_name !== prData.base.repo.full_name ? 'the fork' : 'the base repository'} at commit ${prData.head.sha}.` : ''}

${formatPRMetadata(prData, prInfo)}

EFFICIENT ANALYSIS APPROACH:
${prData && prData.files && prData.files.length > 0 ? `
1. Focus ONLY on these ${prData.files.length} changed files:
${prData.files.slice(0, 20).map(f => `   - ${f.filename}`).join('\n')}${prData.files.length > 20 ? ` \n ... and ${prData.files.length - 20} more files` : ''}
2. Read and analyze ONLY these changed files
3. You can see the changes by reading the current versions of these files
4. The commit ${prData.head.sha} contains all the PR changes
` : `
1. Use git commands to identify what has changed
2. Focus your analysis ONLY on changed files
3. Don't analyze the entire codebase
`}

GIT COMMANDS TO USE:
- To see all changes in this PR: git show --stat HEAD
- To see detailed changes: git show HEAD
- To list changed files: git diff --name-only HEAD~1..HEAD
- Note: Some git diff commands may fail if comparing across forks. In that case, analyze the current state of the changed files.

FOCUSED REVIEW AREAS (only check these in CHANGED code):
1. **Critical Issues**: Security vulnerabilities, data leaks, breaking changes
2. **Code Quality**: Logic errors, code smells, maintainability issues
3. **Best Practices**: Naming conventions, error handling, documentation
4. **Performance**: Only obvious performance issues in the changes

PROVIDE YOUR ANALYSIS IN THIS FORMAT:

## SUMMARY
Write a comprehensive 3-5 paragraph summary including:
- Overall assessment of the PR
- Key findings and concerns
- General recommendations
- Code quality assessment

## ISSUES
- List each issue found with file and line numbers (severity: high/medium/low)
- If no issues found, write: "No critical issues found"

## RECOMMENDATIONS
- Provide specific actionable recommendations (priority: high/medium/low)
- If no recommendations, write: "Code follows best practices"

## METRICS
- Files Changed: ${prData?.changed_files || 0}
- Lines Added: ${prData?.additions || 0}
- Lines Removed: ${prData?.deletions || 0}`;

    // Start the analysis
    const analysisPrompt = `Please analyze this GitHub PR. The repository is already cloned in the sandbox at /app/repository. Focus on the changed files and provide a structured review.`;

    stream.write(`🧠 Starting PR analysis... \n`);
    console.info("🔍 Analyzing PR...");

    // Use Vercel AI SDK streamText with tools
    const result = streamText({
      model: anthropic("claude-sonnet-4-20250514"),
      system: systemPrompt,
      prompt: analysisPrompt,
      tools: aiTools,
      stopWhen: stepCountIs(10), // Allow multiple tool calls (v6 API)
    });

    // Stream the response
    for await (const delta of result.textStream) {
      stream.write(delta);
    }

    console.info("🎉 Analysis complete!");
  } catch (error: any) {
    stream.write(`❌ Error: ${error.message} \n`);
    console.error("Error:", error);
  } finally {
    // Clean up MCP connection
    if (mcpClient) {
      try {
        await mcpClient.close();
        console.info("✅ MCP connection closed");
      } catch (cleanupError) {
        console.warn("⚠️ Failed to close MCP connection:", cleanupError);
      }
    }

    // Clean up sandbox
    if (sandbox) {
      try {
        console.info("🧹 Cleaning up sandbox...");
        stream.write(` \n🧹 Cleaning up sandbox... \n`);
        await SandboxInstance.delete(sandboxName);
      } catch (cleanupError) {
        stream.write(`⚠️ Failed to cleanup sandbox: ${cleanupError}\n`);
      }
    }

    stream.end();
  }
}
