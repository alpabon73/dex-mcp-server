# Release v1.0.0

## Summary
Production-ready, agent/CLI-compatible Dex MCP server. Robust, secure, and reliable environment variable loading for all workflows. Fully documented, with best practices and onboarding for open-source use.

## Highlights
- kill-dex-mcp-server.sh script for process management
- Absolute-path .env loading for robust agent/CLI startup
- Comprehensive documentation and onboarding
- AnythingLLM agent startup now reliable
- Security: DEX_API_KEY always loaded from .env

## Changelog
See [CHANGELOG.md](../CHANGELOG.md) and [RELEASE-NOTES.md](../RELEASE-NOTES.md) for full details.

## Upgrade Notes
- Ensure your .env file is present and contains a valid DEX_API_KEY
- Use the kill-dex-mcp-server.sh script before agent startup if needed
- See copilot-instructions.md for agent/CLI usage and best practices

## Acknowledgements
Thank you to all contributors and testers!
