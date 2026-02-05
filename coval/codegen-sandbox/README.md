# Blaxel Sandbox Astro Template

<p align="center">
  <img src="https://blaxel.ai/logo.png" alt="Blaxel" width="200"/>
</p>

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-container-blue.svg)](https://www.docker.com/)
[![Blaxel](https://img.shields.io/badge/Blaxel-Sandbox-brightgreen.svg)](https://blaxel.ai/)

</div>

A sandbox template for running Astro development environments on the Blaxel platform. This template provides a lightweight, fast development environment using Bun and Astro.

## Features

- Astro web framework with Bun runtime
- **Tailwind CSS** pre-configured with plugins:
  - @tailwindcss/typography - Beautiful prose styling
  - @tailwindcss/forms - Better form element styles
- **lucide-astro** - Icon library
- **clsx + tailwind-merge** - Utility for conditional classes
- Custom utility classes (.btn, .card, .input, .badge)
- Custom animations (fade-in, slide-up, slide-down, scale-in)
- Primary color palette (primary-50 to primary-950)
- Built-in MCP server for AI tool integration
- Terminal access via sandbox-api sessions
- Lightweight Alpine-based container
- Hot reload development server on port 4321

## Quick Start

```bash
# Deploy to Blaxel
bl deploy

# Wait for your sandbox to be deployed
bl get sandbox YOUR-SANDBOX-NAME --watch

# Connect to your deployed sandbox
bl connect sandbox YOUR-SANDBOX-NAME
```

## Prerequisites

- **Blaxel Platform Setup:** Complete Blaxel setup by following the [quickstart guide](https://docs.blaxel.ai/Get-started#quickstart)
- **Blaxel CLI:** Install if not already installed:
  ```bash
  curl -fsSL https://raw.githubusercontent.com/blaxel-ai/toolkit/main/install.sh | BINDIR=/usr/local/bin sudo -E sh
  ```
- **Blaxel login:**
  ```bash
  bl login YOUR-WORKSPACE
  ```

## Running Locally with Docker

Build and run the sandbox container locally:

```bash
# Build the Docker image
make build

# Run the container
make run
```

This will start the sandbox environment with:
- Port 8080: sandbox-api (file system, process management, MCP server)
- Port 4321: Astro dev server

## Project Structure

- **Dockerfile** - Container configuration using Bun + Alpine
- **Makefile** - Build and run commands for local development
- **entrypoint.sh** - Container startup script
- **blaxel.toml** - Blaxel deployment configuration
- **app/** - Pre-configured Astro application
  - **astro.config.mjs** - Astro configuration with Tailwind integration
  - **tailwind.config.mjs** - Tailwind CSS configuration
  - **src/styles/global.css** - Global styles with Tailwind directives
  - **src/layouts/Layout.astro** - Base layout with global styles
  - **src/lib/utils.ts** - Utility functions (cn for class merging)

## Pre-configured Styling

The template comes with Tailwind CSS ready to use. The Layout already imports global styles.

Available utility classes:

```html
<!-- Buttons -->
<button class="btn-primary">Primary Button</button>
<button class="btn-secondary">Secondary Button</button>
<button class="btn-outline">Outline Button</button>
<button class="btn-ghost">Ghost Button</button>

<!-- Cards -->
<div class="card">Card content</div>
<div class="card-hover">Hoverable card</div>

<!-- Forms -->
<input class="input" placeholder="Input field" />
<label class="label">Label</label>

<!-- Badges -->
<span class="badge-primary">Primary</span>
<span class="badge-success">Success</span>
<span class="badge-warning">Warning</span>
<span class="badge-error">Error</span>
```

Available animations: `animate-fade-in`, `animate-slide-up`, `animate-slide-down`, `animate-scale-in`

Primary color palette: `primary-50` through `primary-950`

## MCP Integration

The sandbox exposes an MCP server at `{sandbox_url}/mcp` that provides:

- **File system tools**: Read, write, list, delete files
- **Process management**: Execute commands, get logs, kill processes
- **Code generation tools**: Fast file editing, codebase search, grep search

Connect to the MCP server using the `@ai-sdk/mcp` package:

```typescript
import { createMCPClient } from '@ai-sdk/mcp';
import { settings } from '@blaxel/core';

const mcpClient = await createMCPClient({
  transport: {
    type: 'http',
    url: `${sandbox.metadata.url}/mcp`,
    headers: settings.headers
  },
});

const tools = await mcpClient.tools();
```

## Troubleshooting

### Common Issues

1. **Docker Issues**:
   - Ensure Docker is running and accessible
   - Check that ports 8080 and 4321 are available

2. **Blaxel Platform Issues**:
   - Ensure you're logged in: `bl login MY-WORKSPACE`
   - Verify sandbox deployment: `bl get sandboxes`
   - Check deployment status: `bl logs sandbox YOUR-SANDBOX-NAME`

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for more details.
