# Release Notes – v1.0.0 (2025-06-03)

## 🎉 Highlights
- **Production-ready, agent/CLI-compatible Dex MCP server**
- Robust, secure, and reliable environment variable loading for all workflows
- Fully documented, with best practices and onboarding for open-source use

## 🚀 Major Features
- **kill-dex-mcp-server.sh**: Prevents process conflicts by killing any running Dex MCP server before agent startup.
- **Absolute-path .env loading**: Ensures DEX_API_KEY is always loaded, regardless of working directory or launch context.
- **Comprehensive documentation**: Clear instructions for agent, CLI, and manual workflows. Accepted meeting types for note creation are now explicit and error-proof.

## 🛠️ Fixes
- AnythingLLM agent startup is now reliable (no more 'Connection closed' errors).
- Meeting type mapping and error handling for note creation edge cases.

## 🔒 Security
- DEX_API_KEY is always loaded securely from .env, never hardcoded.

## 📚 For Contributors
- Please see CONTRIBUTING.md and copilot-instructions.md for workflow and best practices.
- All changes are tracked in CHANGELOG.md and Memory Bank.

---

Thank you for using and contributing to Dex MCP Server!
