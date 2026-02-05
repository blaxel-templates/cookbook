# PR Review Agent

<p align="center">
  <img src="https://blaxel.ai/logo.png" alt="Blaxel" width="200"/>
</p>

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js 18+](https://img.shields.io/badge/node-18+-blue.svg)](https://nodejs.org/downloads/)
[![TypeScript](https://img.shields.io/badge/TypeScript-enabled-blue.svg)](https://www.typescriptlang.org/)

</div>

An AI-powered GitHub pull request analysis tool that provides comprehensive code reviews using Claude 4.5 (via Vercel AI SDK) and Blaxel sandbox environments with MCP (Model Context Protocol) integration.

**Important information**: This repository has been entirely vibe coded

## 📑 Table of Contents

- [PR Review Agent](#pr-review-agent)
  - [📑 Table of Contents](#-table-of-contents)
  - [✨ Features](#-features)
  - [🚀 Quick Start](#-quick-start)
  - [📋 Prerequisites](#-prerequisites)
  - [💻 Installation](#-installation)
  - [🔧 Environment Variables](#-environment-variables)
  - [🔧 Usage](#-usage)
    - [Running the Server Locally](#running-the-server-locally)
    - [Testing your agent](#testing-your-agent)
    - [Deploying to Blaxel](#deploying-to-blaxel)
  - [🏗️ Architecture](#️-architecture)
  - [🔑 Key Components](#-key-components)
  - [📦 Dependencies](#-dependencies)
  - [💻 Development](#-development)
    - [Project Structure](#project-structure)
  - [❓ Troubleshooting](#-troubleshooting)
    - [Common Issues](#common-issues)
  - [👥 Contributing](#-contributing)
  - [🆘 Support](#-support)
  - [📄 License](#-license)

## ✨ Features

- **Claude 4.5 Integration**: Uses Anthropic's latest Claude model via Vercel AI SDK
- **MCP Protocol**: Direct integration with sandbox tools via Model Context Protocol
- **Vercel AI SDK**: Simplified tool calling and streaming with automatic multi-step execution
- **Secure Sandbox Environment**: Uses Blaxel sandboxes for safe code execution and analysis
- **Comprehensive Reviews**: Covers code quality, security, performance, and best practices
- **Real-time Progress**: Stream analysis progress with detailed logging
- **TypeScript Support**: Full type safety and enhanced developer experience

## 🚀 Quick Start

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pr-review-agent
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   # Create a .env file with your API keys
   echo "ANTHROPIC_API_KEY=your_key_here" > .env
   ```

4. **Deploy custom sandbox template to Blaxel**

   - Deploy the sandbox
     ```bash
     npm run deploy-sandbox
     ```

   - Check deployment status and get the image name
     ```bash
     bl get sandbox pr-review-sandbox --watch
     ```

   - Add the image name to your .env file
     ```bash
     echo "SANDBOX_IMAGE=pr-review-sandbox" >> .env
     ```

5. **Run the development server**
   ```bash
   bl serve --hotreload
   ```

6. **Test your agent**
   ```bash
   bl run agent pr-review-agent --local --data '{"inputs": "https://github.com/facebook/react/pull/35707"}'
   ```

## 📋 Prerequisites

- **Node.js:** 18.0 or later
- **[NPM](https://www.npmjs.com/):** Node package manager
- **Blaxel Platform Setup:** Complete Blaxel setup by following the [quickstart guide](https://docs.blaxel.ai/Get-started#quickstart)
  - **[Blaxel CLI](https://docs.blaxel.ai/Get-started):** Ensure you have the Blaxel CLI installed. If not, install it globally:
    ```bash
    curl -fsSL https://raw.githubusercontent.com/blaxel-ai/toolkit/main/install.sh | BINDIR=/usr/local/bin sudo -E sh
    ```
  - **Blaxel login:** Login to Blaxel platform
    ```bash
    bl login
    ```

## 💻 Installation

**Clone the repository and install dependencies:**

```bash
git clone https://github.com/blaxel-ai/cookbook.git
cd cookbook/pr-review-agent
npm install
```

## 🔧 Environment Variables

Create a `.env` file with the following variables:

```env
# Anthropic API Key (REQUIRED)
# Get your API key from: https://console.anthropic.com/
ANTHROPIC_API_KEY=your_anthropic_api_key_here

# GitHub API Token (OPTIONAL)
# Only needed to analyze private repositories or avoid rate limits
# Create a token at: https://github.com/settings/tokens
GITHUB_TOKEN=your_github_token_here

# Blaxel API Configuration (OPTIONAL)
# If you have logged in using blaxel cli (bl login), this is automatically configured
BL_API_KEY=your_blaxel_api_key_here

# Blaxel Region (OPTIONAL)
# Default region for sandbox creation (e.g., us-pdx-1, eu-west-1)
BL_REGION=us-pdx-1

# Custom Sandbox Image (OPTIONAL)
# Default: prod/main/sandbox/pr-review-sandbox:latest
SANDBOX_IMAGE=pr-review-sandbox:latest
```

**Required:**
- `ANTHROPIC_API_KEY`: Get your API key from [Anthropic Console](https://console.anthropic.com/)

**Optional:**
- `GITHUB_TOKEN`: For private repositories or higher rate limits
- `BL_API_KEY`: If not using `bl login`
- `BL_REGION`: Specify sandbox region
- `SANDBOX_IMAGE`: Custom sandbox image path

## 🔧 Usage

### Running the Server Locally

Start the development server with hot reloading:

```bash
bl serve --hotreload
```

_Note:_ This command starts the server and enables hot reload so that changes to the source code are automatically reflected.

### Testing your agent

Test your agent by providing a GitHub PR URL as input:

```bash
bl run agent pr-review-agent --local --data '{"inputs": "https://github.com/owner/repo/pull/123"}'
```

**Input format:**
- The `inputs` field must contain a valid GitHub PR URL
- Format: `https://github.com/OWNER/REPO/pull/NUMBER`
- Example: `https://github.com/facebook/react/pull/12345`

The agent will:
1. Fetch PR metadata from GitHub API
2. Create a Blaxel sandbox environment
3. Clone the repository and checkout the PR branch
4. Connect to the sandbox via MCP
5. Use Claude 4.5 to analyze the code changes
6. Stream the analysis results back to you

### Deploying to Blaxel

When you are ready to deploy your application:

```bash
bl deploy

# Watch the status of the deployment
bl get agent pr-review-agent --watch
```

This command uses your code and the configuration files under the `.blaxel` directory to deploy your application.

## 🏗️ Architecture

The application consists of:

1. **Vercel AI SDK**: Simplified streaming and tool calling with Claude 4.5
2. **@ai-sdk/mcp**: Standard MCP client for automatic tool conversion
3. **Sandbox Integration**: Blaxel SDK for secure code execution and analysis
4. **GitHub Integration**: Direct integration with GitHub API for PR data retrieval

**Architecture Flow:**
```
GitHub PR URL → Fetch PR Data → Create Sandbox → Clone Repository →
@ai-sdk/mcp createMCPClient → Auto tool conversion → streamText → Stream Results
```

The standard approach using `@ai-sdk/mcp`:
1. `createMCPClient()` connects to sandbox MCP server
2. `await client.tools()` automatically converts MCP tools to Vercel AI SDK format
3. `streamText()` handles the multi-step tool calling loop
4. Claude analyzes code using sandbox tools transparently
5. Results stream back in real-time

## 🔑 Key Components

- `src/index.ts` - Application entry point and Fastify server setup
- `src/agent.ts` - Core agent implementation with Vercel AI SDK and @ai-sdk/mcp
- `src/github.ts` - GitHub API integration for fetching PR data
- `src/types.ts` - TypeScript type definitions
- `pr-review-sandbox/` - Blaxel custom sandbox configuration for secure execution

## 📦 Dependencies

- **@ai-sdk/anthropic** - Claude 4.5 model provider
- **@ai-sdk/mcp** - Standard MCP client (automatic tool conversion)
- **ai** - Vercel AI SDK for streaming and tool orchestration
- **@blaxel/core** - Sandbox creation and management
- **fastify** - Fast HTTP server framework
- **zod** - Schema validation

## 💻 Development

### Project Structure
```
pr-review-agent/
├── src/
│   ├── index.ts           # Application entry point
│   ├── agent.ts           # Core agent implementation (Anthropic + MCP)
│   ├── github.ts          # GitHub API integration
│   └── types.ts           # TypeScript type definitions
├── pr-review-sandbox/        # Blaxel sandbox configuration
├── package.json           # Node.js package configuration
├── tsconfig.json          # TypeScript configuration
└── blaxel.toml            # Blaxel deployment configuration
```

## ❓ Troubleshooting

### Common Issues

1. **API Key Issues**:
   - Ensure your `ANTHROPIC_API_KEY` is set in `.env`
   - Verify your Anthropic API key is valid at https://console.anthropic.com/
   - Check you're logged in to Blaxel: `bl login`

2. **Node.js Version Issues**:
   - Make sure you have Node.js 18+
   - Try `node --version` to check your version
   - Update Node.js if needed

3. **GitHub API Issues**:
   - Check rate limits and quotas
   - Ensure PR URLs are valid and accessible

For more help, please [submit an issue](https://github.com/blaxel-ai/cookbook/issues) on GitHub.

## 👥 Contributing

Contributions are welcome! Here's how you can contribute:

1. **Fork** the repository
2. **Create** a feature branch:
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **Commit** your changes:
   ```bash
   git commit -m 'Add amazing feature'
   ```
4. **Push** to the branch:
   ```bash
   git push origin feature/amazing-feature
   ```
5. **Submit** a Pull Request

Please make sure to update tests as appropriate and follow the TypeScript code style of the project.

## 🆘 Support

If you need help with this template:

- [Submit an issue](https://github.com/blaxel-ai/cookbook/issues) for bug reports or feature requests
- Visit the [Blaxel Documentation](https://docs.blaxel.ai) for platform guidance
- Join our [Discord Community](https://discord.gg/G3NqzUPcHP) for real-time assistance

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.
