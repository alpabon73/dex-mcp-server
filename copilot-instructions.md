> **Related Docs:**
>
> - [Pull Request Checklist](.github/PULL_REQUEST_TEMPLATE.md)
> - [Agent Prompt Library](agent-prompts.md)
> - [Memory Bank Files](memory-bank/)
> - [Docker Setup Guide](DOCKER-README.md)
> - [Project README](README.md)

# GitHub Copilot Chat Custom Instructions

## 🤖 Copilot Agent Workflow Protocol

**READ THIS FIRST**: This file contains custom instructions for GitHub Copilot Chat with integrated 7-step Agent Workflow. These instructions must be applied at the start of every chat session and for every code-related task to ensure optimal use of MCP servers and agent-driven development.

## 🔄 MANDATORY 7-Step Agent Development Cycle

**For EVERY task, ALWAYS follow this procedure:**

### 1. **PULL & AUDIT**

```bash
git pull --rebase origin main
```

- Audit current codebase structure and identify missing/outdated documentation
- Highlight technical debt (TODO, FIXME, etc.)
- Summarize changes since last session using Memory Bank

### 2. **READ & REVIEW**

- Generate comprehensive code summaries using Sequential-Thinking
- Review all modules/classes/functions for missing docstrings
- Flag ambiguous code that needs clarification
- Use Context7 for best practice validation

### 3. **DOCUMENT & CLARIFY**

- Auto-generate/expand docstrings for ALL code (what, how, why)
- Update inline comments explaining rationale
- Expand module-level documentation
- Update README and contributing guidelines as needed

### 4. **ADJUST NOTES & TECHNICAL DEBT**

- Resolve all TODO/FIXME comments OR convert to GitHub Issues
- Address technical debt with clear action items
- Update or create GitHub Issues with full context

### 5. **UPDATE & TRACK**

- Update CHANGELOG.md with all changes (Jest setup, sample test, Node.js CI workflow)
- Update Memory Bank with session outcomes and decisions (progress tracked for Jest and CI setup)
- Track progress and architectural decisions (testing and automation phase started)
- Store patterns in Memory Bank system-patterns.md (add Node.js CI and Jest patterns)

### 6. **COMMIT & COMMENT**

- Generate clear, descriptive commit messages
- Create detailed PR descriptions with test plans and risks
- Use PR template checklist
- Document rationale for all changes

### 7. **PUSH & AUTOMATE**

- Trigger automated workflows on push
- Ensure PR templates and automation are followed
- Update documentation and issue tracking
- Verify all quality gates are met

## Session Initialization Protocol

## MCP Server Configuration & Usage Guide

This workspace has **6 MCP servers** configured for enhanced development capabilities. These instructions serve as your starting point for every session to maximize productivity with GitHub Copilot Chat.

## 🚀 MCP Server Activation

**IMPORTANT**: MCP servers require manual activation:

1. Open GitHub Copilot Chat (`Cmd+Shift+I`)
2. Look for server status indicators
3. Click **"start then restart"** for any stopped servers
4. Verify all 6 servers are active before proceeding

## 📚 Available MCP Servers

### 1. Filesystem Server

**Purpose**: File operations and workspace management for this project

**Usage Instructions**:

- List, read, write, and manage files in the dex-mcp-server codebase
- Example: `@filesystem List all files in src/`

### 2. Dex MCP Local Server

**Purpose**: Run and test the local Dex MCP server in development mode

**Usage Instructions**:

- Start the server: `@dex-mcp-local Start the Dex MCP server`
- Test endpoints: `@dex-mcp-local get_contacts`

### 3. GitHub Server

**Purpose**: GitHub repository management and automation

**Usage Instructions**:

- PR management, issue creation, and repo queries
- Example: `@github List all open pull requests`

### 4. Context7 Server

**Purpose**: Documentation and code examples from any library/framework

**Usage Instructions**:

- Ask for documentation: `@context7 Show me Zod schema validation examples`

### 5. Sequential-Thinking Server

**Purpose**: Enhanced reasoning and step-by-step problem solving

**Usage Instructions**:

- Plan features, debug, and design workflows
- Example: `@sequential-thinking Plan a contact import feature step by step`

### 6. Memory Bank Server

**Purpose**: Persistent memory and context storage across sessions

**Files Available**:

- `active-context.md` - Current tasks and issues
- `decision-log.md` - Important decisions and rationale
- `product-context.md` - Project goals and context
- `progress.md` - Development milestones
- `system-patterns.md` - Code patterns and architecture

**Usage Instructions**:

- Store context: `@memory-bank Save this decision to memory bank`
- Retrieve info: `@memory-bank What's in my active context?`
- Track progress: `@memory-bank Update my progress with today's work`
- Log decisions: `@memory-bank Record this architectural decision`

**Example Prompts**:

```
@memory-bank Save this API design decision to decision-log
@memory-bank What's my current active context?
@memory-bank Update progress with the authentication feature completion
```

## 🎯 Best Practices for Multi-MCP Usage

### Workflow Combinations:

1. **Research → Plan → Implement → Store**:

   - Use Context7 to research libraries
   - Use Sequential-Thinking to plan implementation
   - Use Supabase for data operations
   - Use Memory Bank to store decisions

2. **Documentation → Development → Memory**:
   - Use MCP Docs for protocol understanding
   - Use Context7 for code examples
   - Use Memory Bank to save patterns

### Effective Prompting:

- **Be specific** about which MCP server you want to use
- **Combine servers** for complex tasks
- **Save important context** to Memory Bank for future sessions
- **Use Sequential-Thinking** for multi-step problems

## 🛠️ Troubleshooting

### If MCP Servers Don't Respond:

1. Check server status in Copilot Chat
2. Click "start then restart" for stopped servers
3. Reload VS Code window if needed (`Cmd+Shift+P` → "Developer: Reload Window")

### Common Issues:

- **No server response**: Servers need manual activation
- **Supabase errors**: Check your API token in mcp.json
- **Memory Bank not found**: Run initialization in terminal

## 📋 Quick Reference Commands

```bash
# Check MCP server status
./mcp-debug.sh

# Initialize Memory Bank (if needed)
npx @movibe/memory-bank-mcp@latest

# Restart MCP reminder
./start-mcp.sh
```

## 💡 Pro Tips

1. **Start each session** by activating all MCP servers manually
2. **Use Memory Bank** to maintain context between coding sessions
3. **Combine Context7 + Sequential-Thinking** for learning new technologies
4. **Save architectural decisions** to Memory Bank decision-log
5. **Use Supabase MCP** for all database operations instead of manual SQL

## 📋 Session Workflow

### At Session Start:

1. **Activate MCP Servers** - Open Copilot Chat (`Cmd+Shift+I`) and ensure all 6 servers are running
2. **Check Memory Bank** - Review active context and recent decisions from previous sessions
3. **Set Session Goals** - Define what you want to accomplish and which MCP servers will be needed
4. **Reference This Guide** - Keep this file open for quick reference to server capabilities

### During Development:

- **Use appropriate MCP servers** for each task type (see server details below)
- **Combine servers** for complex workflows (e.g., Context7 + Sequential-Thinking + Memory Bank)
- **Save important decisions** to Memory Bank throughout the session
- **Track progress** using Memory Bank progress tracking

### At Session End:

- **Update Memory Bank** with session outcomes and next steps
- **Save architectural decisions** that were made
- **Update active context** for the next session

---

## 🐳 Docker Compose Local Development Protocol

### Docker Workflow for Postgres, pgvector, and n8n

**For any local development requiring Postgres, pgvector, or n8n:**

1. **Start Services:**

   ```zsh
   docker-compose up -d
   ```

   - Starts Postgres (5432), pgvector (5433), and n8n (5678)
   - Data persists in the `pgdata` Docker volume

2. **Verify Health:**

   ```zsh
   docker-compose ps
   # All services should show STATUS 'Up' and HEALTHY
   ```

   - Optionally, check logs:

   ```zsh
   docker logs local-n8n --tail 20
   docker exec local-postgres pg_isready -U postgres
   docker exec local-pgvector pg_isready -U postgres
   ```

3. **Access n8n UI:**

   - Open [http://localhost:5678](http://localhost:5678) in your browser
   - Login: `admin` / `admin`

4. **Connect to Postgres:**

   - Host: `localhost`
   - Port: `5432` (standard), `5433` (pgvector)
   - User: `postgres`, Password: `postgres`

5. **Stop Services:**
   ```zsh
   docker-compose down
   ```

### Troubleshooting

- If a service is not healthy, check logs with `docker logs <container>`
- Remove the `version:` key from `docker-compose.yml` if you see warnings about it being obsolete
- For persistent issues, prune volumes: `docker volume prune`

### Documentation

- See `DOCKER-README.md` and the Docker section in `README.md` for full details

---

**Agent Workflow Compliance:**

- All Docker setup steps must be tracked in Memory Bank and CHANGELOG.md
- Any changes to Docker configuration require documentation updates
- Use this protocol for all local service development and integration testing
