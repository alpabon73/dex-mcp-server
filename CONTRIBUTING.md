# Contributing to Dex MCP Server

Thank you for your interest in contributing! Please follow these guidelines to help us maintain a high-quality, collaborative project.

## Getting Started
- Fork the repository and clone your fork.
- Create a new branch for your feature or bugfix.
- Install dependencies with `npm install`.

## Code Quality
- Run `npm run lint` to check for lint errors.
- Run `npm run build` or `npx tsc --noEmit` to check for type errors.
- All code must pass CI checks before merging.

## Commit Messages & PRs
- Use clear, descriptive commit messages.
- Reference related issues in your PR description.
- Fill out the PR template and test plan.

## Issue Reporting
- Use the provided issue templates for bugs and feature requests.
- Provide as much detail as possible for reproducibility.

## Security
- **Never commit secrets or API keys.**
- If a secret is ever committed, follow the repo's history-scrubbing protocol (`scrub-git-history.sh`).

## Community
- Be respectful and constructive in all communications.
- See `CODE_OF_CONDUCT.md` for our community standards.

## License
By contributing, you agree that your contributions will be licensed under the MIT License.
