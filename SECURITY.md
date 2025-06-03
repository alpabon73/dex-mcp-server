# Security Policy

## Reporting a Vulnerability

If you discover a security vulnerability, please do the following:

1. **Do not open a public issue.**
2. Email the maintainer at angel@pabon.dev with details of the vulnerability.
3. We will respond as quickly as possible and coordinate a fix.

## Supported Versions

| Version | Supported          |
| ------- | ----------------- |
| 1.x     | :white_check_mark:|

## Best Practices
- Never commit secrets or API keys.
- Use environment variables for all sensitive data.
- If a secret is ever committed, follow the repo's history-scrubbing protocol (`scrub-git-history.sh`).
