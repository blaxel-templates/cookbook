# 🧑‍🍳 Blaxel AI Cookbook

> *"The best way to learn AI agent development is by example. Welcome to your culinary journey!"*

<p align="center">
  <img src="https://blaxel.ai/logo.png" alt="Blaxel AI" width="200"/>
</p>

<div align="center">

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-enabled-blue.svg)](https://www.typescriptlang.org/)
[![Blaxel CLI](https://img.shields.io/badge/Blaxel-CLI-orange.svg)](https://docs.blaxel.ai/)

*Building intelligent AI agents has never been this delicious!* 🚀

</div>

## 🌟 What is Blaxel AI?

**Blaxel AI** is a cutting-edge platform that makes building, deploying, and managing AI agents as easy as following a recipe. Think of it as your AI agent kitchen where you can:

- 🤖 **Build Intelligent Agents** using the powerful Frameworks or Not
- 🏗️ **Deploy Securely** with isolated sandbox environments
- 🔧 **Orchestrate Multi-Agent Systems** for complex workflows
- 🚀 **Scale Effortlessly** with serverless infrastructure
- 🎯 **Monitor & Optimize** with built-in observability

## 🍽️ The Cookbook Menu

Welcome to our collection of production-ready AI agent recipes! Each example demonstrates real-world applications and best practices.

### 🥘 Main Courses (Featured Recipes)

| Recipe | Description | Difficulty | Ingredients |
|--------|-------------|------------|-------------|
| **[Git Review Agent](git-review-agent/)** | 🔍 Automated PR analysis and code review | ⭐⭐⭐ | GitHub API, Mastra |
| **Coming Soon...** | 🎨 Creative Code Generator | ⭐⭐⭐ | OpenAI, Image APIs |

## 🚀 Quick Start

Ready to cook up your first AI agent? Let's get you set up!

### Prerequisites

- **Node.js** (v18.0+)
- **Blaxel CLI** installed globally
- An API key from your favorite LLM provider

### Installation

```bash
# Install Blaxel CLI
curl -fsSL https://raw.githubusercontent.com/blaxel-ai/toolkit/main/install.sh | BINDIR=/usr/local/bin sudo -E sh

# Login to Blaxel
bl login

# Clone the cookbook
git clone https://github.com/blaxel-ai/cookbook.git
cd cookbook

# Pick your recipe!
cd git-review-agent
```

## 🔧 Core Ingredients

### 🏗️ Sandbox Environments
Secure, isolated execution environments for your agents.

```dockerfile
FROM node:22-alpine

# Your agent runs code safely here
RUN apk add --no-cache git bash curl
WORKDIR /app

# Blaxel handles the rest!
COPY --from=ghcr.io/blaxel-ai/sandbox:latest /sandbox-api /usr/local/bin/

ENTRYPOINT ["/usr/local/bin/sandbox-api"]
```

### 🚀 Deployment Magic

```bash
# Deploy your agent or your custom sandbox
bl deploy

# Monitor it
bl get sandbox my-sandbox --watch
bl get agent my-agent --watch

# Chat with your agent
bl chat my-agent

# Query your agent
bl run agent my-agent --data '{"inputs": "Hey, what are you cooking ?"}'
```

## 🎨 What Makes Blaxel Special?

### 🚀 **Developer Experience First**
- **TypeScript/Python Native** - Full type safety and IntelliSense
- **Hot Reload** - See changes instantly during development
- **Rich CLI** - Powerful command-line tools for every task
- **Visual Debugging** - Understand your agent's decision-making process

### 🛡️ **Security & Reliability**
- **Sandbox Isolation** - Code runs in secure containers
- **Resource Limits** - Prevent runaway processes
- **Monitoring** - Real-time observability, traces and logs

### 🌐 **Enterprise Ready**
- **Multi-tenant** - Support for teams and organizations
- **Multi-region** - Deploying all over the world has never been that simple
- **Audit Trails** - Complete operational history
- **SLA Monitoring** - Production-grade reliability

## 🧑‍🍳 Chef's Tips & Best Practices

### 🎯 **Agent Design Principles**
1. **Single Responsibility** - Each agent should have one clear purpose
2. **Stateless Operations** - Use memory for context, not state
3. **Error Handling** - Always plan for failures
4. **Security First** - Validate inputs and sanitize outputs
5. **Observability** - Log everything for debugging

### 🔧 **Performance Optimization**
```typescript
// Use streaming for long-running tasks
const response = await agent.stream(prompt);

// Implement caching for repeated operations
const cache = new Map();
if (cache.has(input)) return cache.get(input);

// Resource cleanup
finally {
  await sandbox.cleanup();
}
```

### 🛡️ **Security Checklist**
- [ ] Validate all user inputs
- [ ] Use sandbox environments for code execution
- [ ] Sanitize AI outputs
- [ ] Add log for audit

## 📚 Learning Resources

### 📖 **Documentation**
- [Blaxel Platform Docs](https://docs.blaxel.ai/) - Complete platform guide
- [API Reference](https://docs.blaxel.ai/api) - Comprehensive API docs

### 💬 **Community**
- [Discord Server](https://discord.gg/blaxel) - Real-time help and discussions
- [GitHub Discussions](https://github.com/blaxel-templates/cookbook/discussions) - Q&A and feature requests
- [X](https://x.com/blaxelAI) - Latest updates and announcements

## 🤝 Contributing

We love contributions! Whether you're fixing bugs, adding new recipes, or improving documentation, every contribution makes the cookbook better.

### 🍽️ **Recipe Contributions**
1. **Fork** the repository
2. **Create** a new recipe in its own directory
3. **Include** a complete README with:
   - Clear problem description
   - Step-by-step setup instructions
   - Code examples and explanations
   - Troubleshooting guide
4. **Test** thoroughly in different environments
5. **Submit** a pull request

### 📝 **Recipe Template**
```
your-recipe-name/
├── README.md          # Complete recipe guide
├── src/
│   ├── agent.ts       # Main agent implementation
│   ├── types.ts       # TypeScript definitions
│   └── utils.ts       # Helper functions
├── blaxel.toml        # Blaxel configuration
├── package.json       # Dependencies
└── .env.example       # Environment variables
```

## 🆘 Getting Help

- [Submit an issue](https://github.com/blaxel-templates/git-review-agent/issues) for bug reports or feature requests
- Visit the [Blaxel Documentation](https://docs.blaxel.ai) for platform guidance
- Join our [Discord Community](https://discord.gg/CsWKUZUHFQ) for real-time assistance

## 📄 License

This cookbook is licensed under the [MIT License](LICENSE). Feel free to use, modify, and distribute the recipes as you see fit!

---

<div align="center">

**Ready to start cooking? 🧑‍🍳**

[Get Started](https://docs.blaxel.ai/quickstart) • [Join Discord](https://discord.gg/blaxel) • [Follow on Twitter](https://twitter.com/blaxel_ai)

*Made with ❤️ by the Blaxel AI community*

</div>
