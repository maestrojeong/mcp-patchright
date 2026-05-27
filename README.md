# patchright-mcp

🛡️ Undetectable browser MCP server — 30 tools, Patchright-powered, zero CDP fingerprint.

[![npm]](https://npmjs.com/patchright-mcp) [![MCP]](https://modelcontextprotocol.io)

Passes Cloudflare / Akamai / Kasada / Datadome.

## Why Patchright, not Playwright?

| | Playwright | Patchright |
|---|---|---|
| `Runtime.enable` | ✅ sends (detectable) | ❌ removed |
| `Console.enable` | ✅ sends | ❌ removed |
| `--enable-automation` flag | ✅ present | ❌ removed |
| `navigator.webdriver` | `true` | `false` / `undefined` |
| Anti-bot evasion | ❌ | ✅ |

See the [full comparison](#) for details.

## Quick start

```bash
npm i -g patchright-mcp
patchright-mcp --port 9321 --host 127.0.0.1
```

### With Claude / GPT / agents

```json
{
  "mcpServers": {
    "patchright": {
      "command": "npx",
      "args": ["patchright-mcp", "--port", "9321", "--host", "127.0.0.1"]
    }
  }
}
```

## Features

- **30 MCP tools** — full browser automation surface
- **3 transports** — stdio, SSE, Streamable HTTP (`/mcp`)
- **Persistent profiles** — real Chrome profile, reuse across sessions
- **Multi-page** — tab management (new, list, switch, close)
- **CDP attach** — control an already-running Chrome
- **Network tracking** — request list, detail, offline toggle
- **Console capture** — real-time console message stream
- **Fingerprint check** — `browser_fingerprint_check` diagnostics

## Tools

Full comparison HTML in [/docs/tool-comparison.html](docs/tool-comparison.html).

- `browser_start`
- `browser_status`
- `browser_navigate`
- `browser_new_page`
- `browser_pages`
- `browser_switch_page`
- `browser_close_page`
- `browser_snapshot`
- `browser_screenshot`
- `browser_click`
- `browser_fill`
- `browser_type`
- `browser_hover`
- `browser_press`
- `browser_wait_for`
- `browser_evaluate`
- `browser_fingerprint_check`
- `browser_close`

## Development

```bash
npm install
npm run build
node dist/index.js
```

By default, `browser_start` launches Chromium via patchright as headed real Chrome with a persistent profile at:

```text
~/.maestro/stealth-playwright-mcp/profiles/default
```

You can override it with the `userDataDir` tool argument or `STEALTH_PLAYWRIGHT_USER_DATA_DIR`.

To attach to an already-running Chrome instead of launching one, start Chrome with remote debugging and pass `cdpEndpoint` to `browser_start`:

```bash
/Applications/Google\\ Chrome.app/Contents/MacOS/Google\\ Chrome \\
  --remote-debugging-port=9222 \\
  --user-data-dir=$HOME/.maestro/stealth-playwright-mcp/profiles/cdp
```

```json
{ "cdpEndpoint": "http://127.0.0.1:9222" }
```

`browser_snapshot` returns Playwright's AI aria snapshot. Use `[ref=eN]` values from that snapshot with `browser_click`, `browser_fill`, `browser_type`, `browser_hover`, `browser_press`, and `browser_wait_for` by passing `{ "ref": "eN" }`. CSS selectors remain supported via `{ "selector": "..." }`.

MCP config example:

```json
{
  "mcpServers": {
    "stealth-playwright": {
      "command": "node",
      "args": ["/Users/maestrobot/stealth-playwright-mcp/dist/index.js"]
    }
  }
}
```

## Direction

This starts with Playwright-compatible basics, then adds stealth-first features:

- persistent user data dirs
- CDP attach to real Chrome
- rebrowser-playwright backend
- proxy / timezone / locale / geolocation profiles
- accessibility snapshots for LLM-friendly page control
- fingerprint diagnostics
