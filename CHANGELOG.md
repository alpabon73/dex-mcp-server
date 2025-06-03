# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
- Initial changelog created. All major security, CI, and documentation improvements tracked from this point forward.
- Added Dependabot for automated dependency updates.
- Added issue and PR templates for consistent contributions.
- Enforced linting and type-checking in CI.
- Updated README and security practices.

## [1.0.0] - 2025-06-03
### Added
- kill-dex-mcp-server.sh script to automatically kill any running Dex MCP server before agent startup.
- Forced absolute-path .env loading in src/index.ts for robust agent/CLI startup regardless of working directory.
- Top-level debug logs for startup context and environment troubleshooting.
- Documentation: clarified accepted meeting types for note creation, with explicit examples and warnings.

### Fixed
- AnythingLLM agent startup now works reliably (no more 'Connection closed' errors due to missing env).
- Meeting type mapping and error handling for note creation edge cases.

### Security
- Ensured DEX_API_KEY is always loaded securely from .env, never hardcoded.
