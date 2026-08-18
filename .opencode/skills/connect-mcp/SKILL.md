---
name: connect-mcp
description: Connect and manage all MCP servers: MSSQL database, Google Workspace (Gmail/Drive/Docs/Sheets/Calendar), and Playwright browser automation
---

## MCP Servers

This project has three MCP servers configured in `opencode.json`:

### 1. MSSQL Server (`mssql-test-server`)

Database query tool for the DWH database.

**Configuration:** Already set in `opencode.json` with server IP, port, credentials.

**Capabilities:**
- Run SQL queries (SELECT, JOINs, aggregations)
- Get database info (table lists, schema)
- Check permissions
- View operation logs

**Usage:** `Use mssql to run a SQL query`

---

### 2. Playwright (`playwright`)

Browser automation for web testing and scraping.

**Configuration:** Local MCP via `@playwright/mcp`.

**Capabilities:**
- Navigate to URLs
- Click, type, fill forms
- Take screenshots and snapshots
- Run custom JavaScript in pages
- Network request inspection

**Usage:** `Use playwright to navigate to https://example.com`

---

### 3. Google Workspace (`google-workspace`)

Connect to Google Gmail, Drive, Docs, Sheets, and Calendar.

**Configuration:** Local MCP via `@a-bonus/google-docs-mcp` with OAuth 2.0.
Token stored at `~/.config/google-docs-mcp/token.json`.

**Capabilities:**
| Service | Tools |
|---|---|
| Gmail | read, send, draft, search, labels, trash, triage inbox |
| Drive | search, list, download, upload, copy, rename, move, manage permissions |
| Docs | create, read (text/json/markdown), append text/markdown, insert tables, apply styles, find/replace |
| Sheets | create, read, write, append rows, format cells, charts, tables, freeze rows/columns |
| Calendar | create, list, update, delete events, quick-add from natural language |

**Authenticating:**

If the token expires or you need to re-auth:
```bash
cmd /c "set GOOGLE_CLIENT_ID=<client-id> && set GOOGLE_CLIENT_SECRET=<client-secret> && npx -y @a-bonus/google-docs-mcp auth"
```

**Usage:** `Use google-workspace to read my Google Doc` or `use google-workspace to check my Gmail inbox`

---

## Adding a New MCP Server

### Local MCP (runs on your machine):

```json
{
  "mcp": {
    "my-server": {
      "type": "local",
      "command": ["npx", "-y", "package-name"],
      "enabled": true,
      "environment": {
        "API_KEY": "value"
      }
    }
  }
}
```

### Remote MCP (external HTTP endpoint):

```json
{
  "mcp": {
    "my-server": {
      "type": "remote",
      "url": "https://mcp.example.com",
      "enabled": true,
      "headers": {
        "Authorization": "Bearer {env:API_KEY}"
      }
    }
  }
}
```

### Remote MCP with OAuth:

```json
{
  "mcp": {
    "my-server": {
      "type": "remote",
      "url": "https://mcp.example.com",
      "enabled": true,
      "oauth": {
        "clientId": "{env:CLIENT_ID}",
        "clientSecret": "{env:CLIENT_SECRET}"
      }
    }
  }
}
```

Then run `opencode mcp auth my-server` to authenticate.

---

## Managing MCP Servers

- **Enable/Disable:** Set `"enabled": true/false` in `opencode.json`
- **Per-agent:** Use `tools` field to control which agents see which MCPs
- **Timeout:** Increase `timeout` (ms) for slow-responding servers
- **List servers:** `opencode mcp list`
- **Auth:** `opencode mcp auth <name>`
- **Logout:** `opencode mcp logout <name>`
