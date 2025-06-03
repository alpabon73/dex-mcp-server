# Dex MCP Server

[![Release](https://img.shields.io/badge/release-v1.0.0-blue)](https://github.com/alpabon73/dex-mcp-server/releases/tag/v1.0.0)

> **v1.0.0 is now released!**
> - See [RELEASE-NOTES.md](./RELEASE-NOTES.md) and [GitHub Releases](https://github.com/alpabon73/dex-mcp-server/releases) for highlights and upgrade info.
> - **How to upgrade:**
>   1. Pull the latest code: `git pull --rebase origin main`
>   2. Ensure your `.env` file is present and contains a valid `DEX_API_KEY`.
>   3. Use the `kill-dex-mcp-server.sh` script before agent startup if needed.
>   4. See `copilot-instructions.md` for agent/CLI usage and best practices.

A Model Context Protocol (MCP) server that provides AI agents with comprehensive contact relationship management capabilities through the Dex API.

## Features

### 🚀 Contact Management
- **Create, Read, Update, Delete** contacts with full details
- **Search contacts** by name, email, or company
- **Comprehensive contact fields**: name, company, job title, description, emails, phone numbers

### 📝 Note Management  
- **Contact-linked notes** stored as timeline items
- **Create, update, delete** notes for any contact
- **Search notes** by content across all contacts
- **Pagination support** for large note collections

### ⏰ Reminder Management
- **Set reminders** linked to specific contacts
- **Complete, update, delete** reminders as needed
- **Search reminders** by text content
- **Recurrence support** for recurring follow-ups
- **Due date tracking** with proper date formatting

## Installation

### Prerequisites
- Node.js 18 or later
- Dex API account and API key

### Setup

1. Clone this repository:
```bash
git clone https://github.com/alpabon73/dex-mcp-server.git
cd dex-mcp-server
```

2. Install dependencies:
```bash
npm install
```

3. Configure your Dex API key in `src/index.ts`:
```typescript
const API_KEY = 'your-dex-api-key-here';
```

4. Build the server:
```bash
npm run build
```

## Environment Variables

This project requires a Dex API key. **Never commit your real API key to a public repository.**

1. Copy `.env.example` to `.env`:
   ```sh
   cp .env.example .env
   ```
2. Edit `.env` and set your real Dex API key:
   ```
   DEX_API_KEY=your-dex-api-key-here
   ```
3. The server will not start unless `DEX_API_KEY` is set in your environment or `.env` file.

**.env is already in .gitignore and will never be committed.**

## Usage

### Standalone Usage
```bash
npm start
```

### With AnythingLLM
Add to your MCP server configuration:
```json
{
  "servers": {
    "dex-mcp": {
      "command": "/usr/local/bin/node",
      "args": ["/path/to/dex-mcp-server/dist/index.js"],
      "env": {}
    }
  }
}
```

## Available Tools

### Contact Tools (6)
- `get_contacts` - Retrieve contacts with pagination
- `get_contact_by_id` - Get specific contact details
- `search_contacts` - Search by name/company/email
- `create_contact` - Add new contacts
- `update_contact` - Modify existing contacts
- `delete_contact` - Remove contacts

### Note Tools (6)
- `get_notes_by_contact` - Get all notes for a contact
- `get_all_notes` - Retrieve all notes with pagination
- `search_notes` - Search notes by content
- `create_note` - Add notes to contacts
- `update_note` - Modify existing notes
- `delete_note` - Remove notes

### Reminder Tools (6)
- `get_reminders_by_contact` - Get contact reminders
- `get_all_reminders` - Retrieve all reminders with pagination
- `search_reminders` - Search reminders by text
- `create_reminder` - Set new reminders
- `update_reminder` - Modify existing reminders
- `complete_reminder` - Mark reminders as done
- `delete_reminder` - Remove reminders

## Allowed Meeting Types for Notes

When creating a note, you may specify the meeting type using either the display name or the Dex API enum value. The following table shows the accepted values:

| Display Name      | Dex API Enum Value   |
|-------------------|---------------------|
| Note              | note                |
| Call              | call                |
| Email             | email               |
| Text/Messaging    | text_messaging      |
| Linkedin          | linkedin            |
| Skype/Teams       | skype_teams         |
| Slack             | slack               |
| Coffee            | coffee              |
| Networking        | networking          |
| Party/Social      | party_social        |
| Other             | other               |
| Meal              | meal                |
| Meeting           | meeting             |
| Custom            | custom              |

You may use any of the above display names (case-insensitive, spaces and slashes allowed) or the exact enum value. The system will automatically map your input to the correct Dex API value.

## Example Use Cases

- **"Add John Smith from TechCorp as a new contact"**
- **"Set a reminder to follow up with Sarah next week"**
- **"Search for all notes about the ABC project"**
- **"Update Mike's job title to Senior Engineer"**
- **"Show me all pending reminders for this month"**
- **"Create a note about today's meeting with the client"**

## Development

### Scripts
- `npm run build` - Compile TypeScript
- `npm run dev` - Run with ts-node for development
- `npm run watch` - Watch mode compilation
- `npm start` - Run compiled server

### Architecture
- **TypeScript** for type safety
- **Zod** for schema validation
- **Axios** for HTTP requests to Dex API
- **MCP SDK** for protocol implementation

## API Integration

This server integrates with the Dex API using:
- **GraphQL endpoint**: `https://api.getdex.com/v1/graphql`
- **Timeline items** for note storage
- **Reminders table** with contact junction
- **Proper pagination** and search capabilities

## Code Quality & CI

This project uses **TypeScript** for type safety and **ESLint** for code linting. All code is automatically checked for type errors and lint issues in CI (see `.github/workflows/ci.yml`).

- Run type checks locally:
  ```sh
  npm run build # or npx tsc --noEmit
  ```
- Run linter locally:
  ```sh
  npm run lint
  ```

All pull requests must pass CI checks before merging.

## Issue & PR Templates

- Bug reports and feature requests use GitHub issue templates for consistency.
- All pull requests use a PR template to ensure quality and documentation.

## Security & Secrets

- **Never commit secrets or API keys.** `.env` is gitignored and secrets are loaded from environment variables.
- If a secret is ever committed, follow the repo's history-scrubbing protocol (see `scrub-git-history.sh`).

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Run `npm run lint` and `npm run build` to check code quality
6. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues related to:
- **Dex API**: Check [Dex documentation](https://docs.getdex.com)
- **MCP Protocol**: See [MCP specification](https://spec.modelcontextprotocol.io)
- **This server**: Open an issue in this repository

---

## How to report issues or contribute

- Found a bug or have a feature request? [Open an issue](https://github.com/alpabon73/dex-mcp-server/issues)
- Want to contribute? See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.
- Security concerns? See [SECURITY.md](./SECURITY.md) for responsible disclosure.
- For release notes and upgrade info, see [RELEASE-NOTES.md](./RELEASE-NOTES.md) and [CHANGELOG.md](./CHANGELOG.md).
