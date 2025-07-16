# PR Review Agent

<p align="center">
  <img src="https://blaxel.ai/logo.png" alt="Blaxel" width="200"/>
</p>

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js 18+](https://img.shields.io/badge/node-18+-blue.svg)](https://nodejs.org/downloads/)
[![Mastra](https://img.shields.io/badge/Mastra-powered-brightgreen.svg)](https://mastra.ai/)
[![TypeScript](https://img.shields.io/badge/TypeScript-enabled-blue.svg)](https://www.typescriptlang.org/)

</div>

An AI-powered GitHub pull request analysis tool that provides comprehensive code reviews using advanced AI capabilities and Blaxel sandbox environments.

**Important information**: This repository has been entirely vibe coded

## 📑 Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Environment Variables](#environment-variables)
- [Usage](#usage)
  - [Running Locally](#running-the-server-locally)
  - [Testing](#testing-your-agent)
  - [Deployment](#deploying-to-blaxel)
- [Architecture](#architecture)
- [Key Components](#key-components)
- [Development](#development)
- [Project Structure](#project-structure)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)
- [Support](#support)
- [License](#license)

## ✨ Features

- **AI-Powered Analysis**: Leverages advanced AI capabilities for thorough code review
- **Secure Sandbox Environment**: Uses Blaxel sandboxes for safe code execution and analysis
- **Comprehensive Reviews**: Covers code quality, security, performance, and best practices
- **Real-time Progress**: Stream analysis progress with detailed logging
- **Beautiful Interface**: Modern, responsive UI with intuitive design
- **Mastra Integration**: Built on Mastra framework for sophisticated AI workflow automation
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
   cp .env.example .env
   # Edit .env with your API keys
   ```

4. **Deploy custom sandbox template to Blaxel**

   - Deploy the sandbox
     ```bash
     npm run deploy-sandbox
     ```

   - Check deployment status
     ```bash
     bl get sandbox custom-sandbox --watch
     ```

   - Copy the image name and paste it to .env

5. **Run the development server**
   ```bash
   bl serve --hotreload
   ```

6. **Test your agent**
   ```bash
   bl chat --local blaxel-agent
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
# GitHub API Token
# Optional: only needed to analyze your private repositories
GITHUB_TOKEN=your_github_token_here

# Blaxel API Configuration
# Optional: If you have logged in using blaxel cli
BL_API_KEY=your_blaxel_api_key_here

# Optional: Custom sandbox image
SANDBOX_IMAGE=blaxel/prod-base:latest
```

## 🔧 Usage

### Running the Server Locally

Start the development server with hot reloading:

```bash
bl serve --hotreload
```

_Note:_ This command starts the server and enables hot reload so that changes to the source code are automatically reflected.

### Testing your agent

You can test your agent using the chat interface:

```bash
bl chat --local blaxel-agent
```

Or run it directly with specific input:

```bash
bl run agent blaxel-agent --local --data '{"inputs": "https://github.com/user/repo/pull/123"}'
```

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

1. **Agent Core**: Mastra-powered agent for orchestrating PR analysis workflows
2. **Sandbox Integration**: Blaxel SDK for secure code execution and analysis
3. **AI Analysis**: Advanced AI capabilities for comprehensive code review
4. **GitHub Integration**: Direct integration with GitHub API for PR data retrieval

## 🔑 Key Components

- `src/index.ts` - Application entry point and server setup
- `src/agent.ts` - Core agent implementation with Mastra integration
- `custom-sandbox/` - Blaxel custom sandbox configuration for secure execution

## 💻 Development

### Project Structure
```
pr-review-agent/
├── src/
│   ├── index.ts           # Application entry point
│   ├── agent.ts           # Core agent implementation
├── custom-sandbox/ # Blaxel sandbox configuration
├── package.json           # Node.js package configuration
├── tsconfig.json          # TypeScript configuration
└── blaxel.toml            # Blaxel deployment configuration
```

## ❓ Troubleshooting

### Common Issues

1. **Blaxel Platform Issues**:
   - Ensure you're logged in to your workspace: `bl login`
   - Verify models are available: `bl get models`

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
