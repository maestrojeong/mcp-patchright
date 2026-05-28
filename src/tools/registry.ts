import type { Tool } from "@modelcontextprotocol/sdk/types.js";

const targetProperties = {
  selector: { type: "string", description: "CSS selector. Provide exactly one of selector or ref." },
  ref: { type: "string", description: "aria-ref from browser_snapshot, for example e12. Provide exactly one of selector or ref." },
  frameSelector: { type: "string", description: "Optional CSS selector for an iframe. When set, selector/ref resolve inside that frame." },
  timeout: { type: "number" },
} as const;

export const tools: Tool[] = [
  {
    name: "browser_start",
    description: "Start a browser session. Defaults to patchright chromium headed Chrome with a persistent profile.",
    inputSchema: {
      type: "object",
      properties: {
        browser: { type: "string", enum: ["chromium", "firefox", "webkit"] },
        headless: { type: "boolean" },
        width: { type: "number" },
        height: { type: "number" },
        userAgent: { type: "string" },
        userDataDir: { type: "string" },
        channel: { type: "string", enum: ["chrome", "chrome-beta", "chrome-dev", "chrome-canary", "msedge"] },
        locale: { type: "string" },
        timezoneId: { type: "string" },
        proxy: {
          type: "object",
          description: "Proxy for this session (persistent launch only). Keep IP country consistent with locale/timezone/geo to avoid bot detection.",
          properties: {
            server: { type: "string", description: "e.g. http://host:port or socks5://host:port" },
            username: { type: "string" },
            password: { type: "string" },
            bypass: { type: "string", description: "Comma-separated hosts to bypass" },
          },
          required: ["server"],
        },
        geolocation: {
          type: "object",
          description: "Spoof geolocation. Grants the geolocation permission automatically.",
          properties: {
            latitude: { type: "number" },
            longitude: { type: "number" },
            accuracy: { type: "number" },
          },
          required: ["latitude", "longitude"],
        },
        colorScheme: { type: "string", enum: ["light", "dark", "no-preference"] },
        cdpEndpoint: { type: "string", description: "Existing Chrome remote debugging endpoint, e.g. http://127.0.0.1:9222" },
      },
    },
  },
  {
    name: "browser_status",
    description: "Return current browser status.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "browser_navigate",
    description: "Navigate the active page to a URL.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string" },
        waitUntil: { type: "string", enum: ["load", "domcontentloaded", "networkidle", "commit"] },
        timeout: { type: "number" },
      },
      required: ["url"],
    },
  },

  {
    name: "browser_new_page",
    description: "Open a new page/tab and make it active. Optionally navigate to a URL.",
    inputSchema: {
      type: "object",
      properties: { url: { type: "string" } },
    },
  },
  {
    name: "browser_pages",
    description: "List open pages/tabs with ids, active state, URL, and title.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "browser_switch_page",
    description: "Switch the active page/tab by pageId from browser_pages.",
    inputSchema: {
      type: "object",
      properties: { pageId: { type: "string" } },
      required: ["pageId"],
    },
  },
  {
    name: "browser_close_page",
    description: "Close a page/tab by pageId, or the active page if omitted.",
    inputSchema: {
      type: "object",
      properties: { pageId: { type: "string" } },
    },
  },
  {
    name: "browser_snapshot",
    description: "Return an AI-oriented aria snapshot. Use [ref=eN] values with browser_click/fill/type/hover/press/wait_for.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "browser_take_screenshot",
    description: "Take a screenshot. Returns base64 if path is omitted.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string" },
        fullPage: { type: "boolean" },
      },
    },
  },
  {
    name: "browser_click",
    description: "Click an element by CSS selector or aria ref from browser_snapshot.",
    inputSchema: {
      type: "object",
      properties: targetProperties,
    },
  },
  {
    name: "browser_fill",
    description: "Fill an input by CSS selector or aria ref from browser_snapshot.",
    inputSchema: {
      type: "object",
      properties: {
        ...targetProperties,
        text: { type: "string" },
      },
      required: ["text"],
    },
  },
  {
    name: "browser_type",
    description: "Type text sequentially into an element by CSS selector or aria ref, with optional per-key delay.",
    inputSchema: {
      type: "object",
      properties: {
        ...targetProperties,
        text: { type: "string" },
        delay: { type: "number" },
      },
      required: ["text"],
    },
  },
  {
    name: "browser_hover",
    description: "Hover an element by CSS selector or aria ref from browser_snapshot.",
    inputSchema: {
      type: "object",
      properties: targetProperties,
    },
  },
  {
    name: "browser_press_key",
    description: "Press a keyboard key, optionally focused on a selector or aria ref first.",
    inputSchema: {
      type: "object",
      properties: {
        key: { type: "string" },
        selector: { type: "string" },
        ref: { type: "string" },
        frameSelector: { type: "string", description: "Optional iframe CSS selector; selector/ref resolve inside it." },
        timeout: { type: "number" },
      },
      required: ["key"],
    },
  },
  {
    name: "browser_wait_for",
    description: "Wait for time or for selector/ref state. If no selector/ref, waits timeout milliseconds.",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string" },
        ref: { type: "string" },
        frameSelector: { type: "string", description: "Optional iframe CSS selector; selector/ref resolve inside it." },
        state: { type: "string", enum: ["attached", "detached", "visible", "hidden"] },
        timeout: { type: "number" },
      },
    },
  },
  {
    name: "browser_evaluate",
    description: "Evaluate JavaScript in the active page. Pass 'function' for a function body, 'expression' for a plain expression, or 'script' (deprecated).",
    inputSchema: {
      type: "object",
      properties: {
        function: { type: "string" },
        expression: { type: "string" },
        script: { type: "string" },
      },
    },
  },
  {
    name: "browser_fingerprint_check",
    description: "Collect browser fingerprint diagnostics from the active page.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "browser_navigate_back",
    description: "Navigate back in browser history.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "browser_select_option",
    description: "Select options from a <select> element by CSS selector or aria ref.",
    inputSchema: {
      type: "object",
      properties: {
        ...targetProperties,
        values: { type: "array", items: { type: "string" }, description: "Option values or labels to select." },
      },
      required: ["values"],
    },
  },
  {
    name: "browser_handle_dialog",
    description: "Accept or dismiss a JavaScript dialog (alert / confirm / prompt).",
    inputSchema: {
      type: "object",
      properties: {
        accept: { type: "boolean", description: "true = accept, false = dismiss" },
        promptText: { type: "string", description: "Text to enter for prompt dialogs" },
        wait: { type: "boolean", description: "When true, wait for and handle the next dialog before returning. Default false arms a one-shot handler for the next action." },
        timeout: { type: "number", description: "Milliseconds to wait when wait=true" },
      },
      required: ["accept"],
    },
  },
  {
    name: "browser_file_upload",
    description: "Upload files to a <input type=file> by CSS selector or aria ref.",
    inputSchema: {
      type: "object",
      properties: {
        ...targetProperties,
        paths: { type: "array", items: { type: "string" }, description: "Local file paths to upload." },
      },
      required: ["paths"],
    },
  },
  {
    name: "browser_network_requests",
    description: "List captured network requests. Set activeOnly=true for in-flight only.",
    inputSchema: {
      type: "object",
      properties: { activeOnly: { type: "boolean" } },
    },
  },
  {
    name: "browser_network_request",
    description: "Get details for a single network request by stable id from browser_network_requests. Legacy zero-based index is also accepted.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "string" },
        index: { type: "number", description: "Legacy zero-based index into the retained request list" },
        details: { type: "boolean", description: "Include response body preview when true" },
      },
    },
  },
  {
    name: "browser_console_messages",
    description: "List captured console messages (log / warn / error etc.).",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "browser_resize",
    description: "Resize the active page viewport.",
    inputSchema: {
      type: "object",
      properties: {
        width: { type: "number", description: "Viewport width in pixels" },
        height: { type: "number", description: "Viewport height in pixels" },
      },
      required: ["width", "height"],
    },
  },
  {
    name: "browser_drag",
    description: "Drag an element from source to target by CSS selector or aria ref.",
    inputSchema: {
      type: "object",
      properties: {
        source: { type: "object", description: "{ selector|ref, frameSelector? }" },
        target: { type: "object", description: "{ selector|ref, frameSelector? }" },
        timeout: { type: "number" },
      },
    },
  },
  {
    name: "browser_fill_form",
    description: "Fill multiple form fields at once. Each field needs selector or ref, and value.",
    inputSchema: {
      type: "object",
      properties: {
        fields: {
          type: "array",
          items: {
            type: "object",
            properties: {
              selector: { type: "string" },
              ref: { type: "string" },
              frameSelector: { type: "string", description: "Optional iframe CSS selector for this field." },
              name: { type: "string" },
              value: { type: "string" },
            },
            required: ["value"],
          },
        },
        timeout: { type: "number" },
      },
      required: ["fields"],
    },
  },
  {
    name: "browser_run_code_unsafe",
    description: "Execute arbitrary JavaScript in page context. Prefer browser_evaluate when possible.",
    inputSchema: {
      type: "object",
      properties: {
        script: { type: "string" },
        args: { type: "array", items: {} },
      },
      required: ["script"],
    },
  },
  {
    name: "browser_network_state_set",
    description: "Set network state: pass offline=true to simulate offline, offline=false to restore connectivity.",
    inputSchema: {
      type: "object",
      properties: { offline: { type: "boolean" } },
      required: ["offline"],
    },
  },
  {
    name: "browser_api_request",
    description: "Make an HTTP request reusing the browser session's cookies/storage (authenticated API calls without re-login). Returns status, headers, and body.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string" },
        method: { type: "string", enum: ["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"] },
        headers: { type: "object", description: "Request headers as key/value strings." },
        data: { description: "Request body: a string, or an object (sent as JSON)." },
        timeout: { type: "number" },
        maxBytes: { type: "number", description: "Truncate response body to this many chars. Default 100000." },
      },
      required: ["url"],
    },
  },
  {
    name: "browser_get_visible_text",
    description: "Get the visible text (document.body.innerText) of the active page. Lighter than a full aria snapshot.",
    inputSchema: {
      type: "object",
      properties: { maxLength: { type: "number", description: "Truncate to this many chars. Default 100000." } },
    },
  },
  {
    name: "browser_get_visible_html",
    description: "Get page HTML, optionally scoped to a selector. Strips script/style/svg by default for token efficiency.",
    inputSchema: {
      type: "object",
      properties: {
        selector: { type: "string", description: "Limit to this element's outerHTML. Default whole document." },
        removeScripts: { type: "boolean", description: "Remove script/style/noscript/svg. Default true." },
        maxLength: { type: "number", description: "Truncate to this many chars. Default 100000." },
      },
    },
  },
  {
    name: "browser_iframe_click",
    description: "Shorthand for clicking inside an iframe. (Most tools now accept a frameSelector directly — prefer browser_click with frameSelector.)",
    inputSchema: {
      type: "object",
      properties: {
        frameSelector: { type: "string", description: "CSS selector for the iframe element." },
        selector: { type: "string", description: "CSS selector for the target element inside the iframe." },
        timeout: { type: "number" },
      },
      required: ["frameSelector", "selector"],
    },
  },
  {
    name: "browser_iframe_fill",
    description: "Shorthand for filling inside an iframe. (Most tools now accept a frameSelector directly — prefer browser_fill with frameSelector.)",
    inputSchema: {
      type: "object",
      properties: {
        frameSelector: { type: "string", description: "CSS selector for the iframe element." },
        selector: { type: "string", description: "CSS selector for the input inside the iframe." },
        value: { type: "string" },
        timeout: { type: "number" },
      },
      required: ["frameSelector", "selector", "value"],
    },
  },
  {
    name: "browser_route_block",
    description: "Block requests by resource type and/or URL pattern (e.g. block images/fonts/media to speed up loads and shrink fingerprint surface). Applies to all pages in the context.",
    inputSchema: {
      type: "object",
      properties: {
        urlPattern: { type: "string", description: "Glob/URL pattern to match. Default **/* (all)." },
        resourceTypes: {
          type: "array",
          items: { type: "string", enum: ["document", "stylesheet", "image", "media", "font", "script", "texttrack", "xhr", "fetch", "eventsource", "websocket", "manifest", "other"] },
          description: "Resource types to abort. If omitted, blocks every request matching urlPattern.",
        },
      },
    },
  },
  {
    name: "browser_route_mock",
    description: "Mock matching requests with a canned response (fulfill). Useful for stubbing APIs or bypassing endpoints.",
    inputSchema: {
      type: "object",
      properties: {
        urlPattern: { type: "string", description: "Glob/URL pattern to match." },
        status: { type: "number", description: "HTTP status, default 200." },
        body: { type: "string", description: "Response body." },
        contentType: { type: "string", description: "Content-Type, default text/plain." },
      },
      required: ["urlPattern"],
    },
  },
  {
    name: "browser_route_clear",
    description: "Remove all active block/mock routes.",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "browser_storage_save",
    description: "Export current session (cookies + localStorage) as a Playwright storageState. Saves to path, or returns the state JSON if path omitted.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Output JSON file path. If omitted, returns the state inline." },
      },
    },
  },
  {
    name: "browser_storage_load",
    description: "Restore a session from a storageState (cookies + localStorage). Provide a file path or an inline state object. Note: localStorage restore navigates to each origin.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Path to a storageState JSON file." },
        state: { type: "object", description: "Inline storageState object ({ cookies, origins })." },
      },
    },
  },
  {
    name: "browser_save_pdf",
    description: "Render the active page to PDF via CDP (works in headed/stealth mode). Saves to path, or returns base64 if path omitted.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Output file path. If omitted, returns base64." },
        landscape: { type: "boolean" },
        printBackground: { type: "boolean", description: "Include background graphics. Default true." },
        scale: { type: "number", description: "Render scale, default 1." },
        format: { type: "string", enum: ["Letter", "Legal", "Tabloid", "A3", "A4", "A5"] },
      },
    },
  },
  {
    name: "browser_close",
    description: "Close the browser session.",
    inputSchema: { type: "object", properties: {} },
  },
];
