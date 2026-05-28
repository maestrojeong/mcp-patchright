# mcp-patchright

🛡️ Undetectable browser MCP server — 41 tools, Patchright-powered, zero CDP fingerprint.

[![npm]](https://npmjs.com/mcp-patchright) [![MCP]](https://modelcontextprotocol.io)

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
npm i -g mcp-patchright
mcp-patchright --port 9321 --host 127.0.0.1
```

### With Claude / GPT / agents

```json
{
  "mcpServers": {
    "patchright": {
      "command": "npx",
      "args": ["mcp-patchright", "--port", "9321", "--host", "127.0.0.1"]
    }
  }
}
```

## Features

- **41 MCP tools** — full browser automation surface
- **3 transports** — stdio, SSE, Streamable HTTP (`/mcp`)
- **Persistent profiles** — real Chrome profile, reuse across sessions
- **Multi-page** — tab management (new, list, switch, close)
- **CDP attach** — control an already-running Chrome
- **Network tracking + interception** — request list/detail, offline toggle, block/mock routes
- **Session import/export** — `browser_storage_save` / `browser_storage_load` (cookies + localStorage)
- **Authenticated API requests** — `browser_api_request` reuses session cookies (hybrid scraping)
- **Text/HTML extraction** — `browser_get_visible_text` / `_html` (token-light)
- **Iframe actions** — `browser_iframe_click` / `_fill`
- **PDF export** — `browser_save_pdf` via CDP (works in headed/stealth mode)
- **Stealth profiles** — proxy / geolocation / locale / timezone / colorScheme
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
- `browser_take_screenshot`
- `browser_click`
- `browser_fill`
- `browser_type`
- `browser_hover`
- `browser_press_key`
- `browser_wait_for`
- `browser_evaluate`
- `browser_fingerprint_check`
- `browser_navigate_back`
- `browser_select_option`
- `browser_handle_dialog`
- `browser_file_upload`
- `browser_network_requests`
- `browser_network_request`
- `browser_console_messages`
- `browser_resize`
- `browser_drag`
- `browser_fill_form`
- `browser_run_code_unsafe`
- `browser_network_state_set`
- `browser_api_request`
- `browser_get_visible_text`
- `browser_get_visible_html`
- `browser_iframe_click`
- `browser_iframe_fill`
- `browser_route_block`
- `browser_route_mock`
- `browser_route_clear`
- `browser_storage_save`
- `browser_storage_load`
- `browser_save_pdf`
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

Shipped:

- ✅ persistent user data dirs
- ✅ CDP attach to real Chrome
- ✅ proxy / timezone / locale / geolocation profiles
- ✅ accessibility snapshots for LLM-friendly page control
- ✅ fingerprint diagnostics
- ✅ network interception (block / mock)
- ✅ session import/export (storageState)
- ✅ PDF export
- ✅ authenticated API requests (reuse browser cookies)
- ✅ lightweight text/HTML extraction
- ✅ iframe actions

Next:

- rebrowser-playwright backend
- codegen sessions
- coordinate-based (vision) clicks
- tracing / video recording
