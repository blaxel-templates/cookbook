# AI App Builder

An AI-powered code generation agent that builds full-stack applications from natural language descriptions. Similar to Lovable, it features a split-screen interface with chat on the left and live preview on the right. Uses Claude Code for intelligent code generation inside secure Blaxel sandboxes.

## Features

- 🚀 **Instant App Generation** - Describe your app idea and watch it come to life
- 🤖 **Claude Code Integration** - Uses Claude's coding assistant for intelligent generation
- 💬 **Chat Interface** - Natural conversation flow for building and iterating
- 👁️ **Live Preview** - See your app running in real-time as it's being built
- 🎨 **Beautiful UI** - Modern, responsive designs using Next.js and Tailwind CSS
- 🔧 **Production Ready** - Generates clean, maintainable code
- 🏗️ **Powered by Blaxel** - Secure sandboxed environments for running generated apps

## Technology Stack

- **Frontend**: Next.js 14, React, TypeScript, Tailwind CSS
- **AI**: Claude Code (Anthropic) for intelligent code generation
- **Infrastructure**: Blaxel sandboxes for secure code execution
- **Preview**: Blaxel preview URLs for live app viewing

## Getting Started

### Prerequisites

- Node.js 18+
- Blaxel CLI installed (`bl`)
- Anthropic API key

### Environment Variables

Create a `.env.local` file:

```bash
ANTHROPIC_API_KEY=your-api-key-here
SANDBOX_IMAGE=sandbox/codegen-sandbox:latest # Optional, default: sandbox/codegen-sandbox:latest
```

### Custom Sandbox

The app uses a custom sandbox with Claude Code pre-installed. Deploy it first:

```bash
cd codegen-sandbox
bl deploy
```

### Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

### Deploy to Blaxel

```bash
# Deploy the app
bl deploy

# Deploy custom sandbox (if not already done)
cd codegen-sandbox
bl deploy
```

## Usage

1. Open the app and describe what you want to build
2. Claude Code will generate your app in real-time
3. See the live preview on the right side
4. Continue chatting to make changes and improvements

## How It Works

1. **User describes their app** - You provide a natural language description
2. **Claude Code generates** - The AI analyzes your request and creates the entire app structure
3. **Live preview** - Your app runs in a Blaxel sandbox with instant preview
4. **Iterative updates** - Continue chatting to refine and improve your app

## Example Prompts

- "Build a task manager with categories and progress tracking"
- "Create a modern blog platform with markdown support"
- "Make a real-time chat application"
- "Build an expense tracker with charts"
- "Create a portfolio website with animations"
- "Build a kanban board with drag and drop"

## Architecture

The app consists of:
- **Main App**: The chat interface and preview viewer
- **API Route** (`/api/generate`): Handles code generation and sandbox management
- **Claude Code Integration**: Uses Claude's coding assistant for intelligent generation
- **Blaxel Sandbox**: Isolated environment with Claude Code pre-installed
- **Preview System**: Live preview URLs provided by Blaxel

## License

MIT