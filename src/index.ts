#!/usr/bin/env node
import { randomUUID } from "node:crypto";
import type { Server as HttpServer } from "node:http";
import type { Request, Response } from "express";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createMcpExpressApp } from "@modelcontextprotocol/sdk/server/express.js";
import { isInitializeRequest, CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { BrowserManager, type StartOptions } from "./browser/manager.js";
import { handleTool } from "./tools/handlers.js";
import { tools } from "./tools/registry.js";

type CliOptions = {
  host: string;
  port?: number;
  userDataDir?: string;
  headless?: boolean;
};

type ManagedServer = Server & { __manager: BrowserManager; __ownsManager: boolean };

type ManagedTransport = SSEServerTransport | StreamableHTTPServerTransport;

function parseCli(argv = process.argv.slice(2)): CliOptions {
  const options: CliOptions = { host: "127.0.0.1" };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const [flag, inlineValue] = arg.includes("=") ? arg.split(/=(.*)/s, 2) : [arg, undefined];
    const nextValue = () => inlineValue ?? argv[++index];

    switch (flag) {
      case "--host":
        options.host = nextValue();
        break;
      case "--port": {
        const value = Number(nextValue());
        if (!Number.isInteger(value) || value <= 0) throw new Error(`Invalid --port: ${String(value)}`);
        options.port = value;
        break;
      }
      case "--user-data-dir":
        options.userDataDir = nextValue();
        break;
      case "--headless":
        options.headless = true;
        break;
      case "--headed":
        options.headless = false;
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function printHelp(): void {
  console.log(`mcp-patchright\n\nUsage:\n  mcp-patchright                         # stdio MCP transport\n  mcp-patchright --port 9100 [options]   # HTTP MCP transport\n\nOptions:\n  --host <host>              HTTP bind host (default: 127.0.0.1)\n  --port <port>              Enable HTTP mode on this port\n  --user-data-dir <path>     Default persistent browser profile directory\n  --headless                 Start browser headless by default\n  --headed                   Start browser headed by default\n`);
}

function createServer(defaultStartOptions: StartOptions = {}, sharedManager?: BrowserManager): ManagedServer {
  const server = new Server(
    {
      name: "mcp-patchright",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  ) as ManagedServer;

  const manager = sharedManager ?? new BrowserManager(defaultStartOptions);
  server.__manager = manager;
  server.__ownsManager = !sharedManager;

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      return await handleTool(manager, request.params.name, request.params.arguments ?? {});
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: error instanceof Error ? `${error.name}: ${error.message}` : String(error),
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}

async function closeManagedServer(server: ManagedServer): Promise<void> {
  if (server.__ownsManager) await server.__manager.close().catch(() => undefined);
  await server.close().catch(() => undefined);
}

async function startStdio(defaultStartOptions: StartOptions): Promise<void> {
  const server = createServer(defaultStartOptions);

  process.on("SIGINT", () => {
    void closeManagedServer(server).finally(() => process.exit(0));
  });
  process.on("SIGTERM", () => {
    void closeManagedServer(server).finally(() => process.exit(0));
  });

  await server.connect(new StdioServerTransport());
}

async function startHttp(options: CliOptions & { port: number }, defaultStartOptions: StartOptions): Promise<void> {
  const app = createMcpExpressApp();
  const sharedManager = new BrowserManager(defaultStartOptions);
  const transports: Record<string, ManagedTransport> = {};
  const servers: Record<string, ManagedServer> = {};

  app.get("/health", async (_req: Request, res: Response) => {
    res.json({ ok: true, name: "mcp-patchright", transports: Object.keys(transports).length, browser: await sharedManager.status().catch(() => undefined) });
  });

  app.all("/mcp", async (req: Request, res: Response) => {
    try {
      const sessionId = req.headers["mcp-session-id"];
      const normalizedSessionId = Array.isArray(sessionId) ? sessionId[0] : typeof sessionId === "string" ? sessionId : undefined;
      let transport: StreamableHTTPServerTransport | undefined;

      if (normalizedSessionId && transports[normalizedSessionId]) {
        const existingTransport = transports[normalizedSessionId];
        if (!(existingTransport instanceof StreamableHTTPServerTransport)) {
          res.status(400).json({ jsonrpc: "2.0", error: { code: -32000, message: "Session uses a different transport protocol" }, id: null });
          return;
        }
        transport = existingTransport;
      } else if (!normalizedSessionId && req.method === "POST" && isInitializeRequest(req.body)) {
        let server: ManagedServer | undefined;
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => randomUUID(),
          onsessioninitialized: (newSessionId: string) => {
            if (!transport || !server) return;
            transports[newSessionId] = transport;
            servers[newSessionId] = server;
          },
        });

        server = createServer(defaultStartOptions, sharedManager);
        transport.onclose = () => {
          const sid = transport?.sessionId;
          if (sid) {
            delete transports[sid];
            const managedServer = servers[sid];
            delete servers[sid];
            void managedServer?.close().catch(() => undefined);
          }
        };
        await server.connect(transport);
      } else {
        res.status(400).json({ jsonrpc: "2.0", error: { code: -32000, message: "Bad Request: No valid session ID provided" }, id: null });
        return;
      }

      await transport.handleRequest(req, res, req.body);
    } catch (error) {
      console.error("Error handling /mcp request:", error);
      if (!res.headersSent) {
        res.status(500).json({ jsonrpc: "2.0", error: { code: -32603, message: "Internal server error" }, id: null });
      }
    }
  });

  app.get("/sse", async (_req: Request, res: Response) => {
    const transport = new SSEServerTransport("/messages", res);
    const server = createServer(defaultStartOptions, sharedManager);
    transports[transport.sessionId] = transport;
    servers[transport.sessionId] = server;

    res.on("close", () => {
      const sid = transport.sessionId;
      delete transports[sid];
      delete servers[sid];
      void server.close().catch(() => undefined);
    });

    await server.connect(transport);
  });

  app.post("/messages", async (req: Request, res: Response) => {
    const sessionId = req.query.sessionId;
    const normalizedSessionId = typeof sessionId === "string" ? sessionId : Array.isArray(sessionId) && typeof sessionId[0] === "string" ? sessionId[0] : undefined;
    const existingTransport = normalizedSessionId ? transports[normalizedSessionId] : undefined;

    if (!(existingTransport instanceof SSEServerTransport)) {
      res.status(400).send("No SSE transport found for sessionId");
      return;
    }

    await existingTransport.handlePostMessage(req, res, req.body);
  });

  const httpServer = await new Promise<HttpServer>((resolve, reject) => {
    const server = app.listen(options.port, options.host, () => resolve(server));
    server.on("error", reject);
  });

  const shutdown = () => {
    void (async () => {
      for (const [sessionId, transport] of Object.entries(transports)) {
        await transport.close().catch(() => undefined);
        delete transports[sessionId];
      }
      for (const [sessionId, server] of Object.entries(servers)) {
        await server.close().catch(() => undefined);
        delete servers[sessionId];
      }
      await sharedManager.close().catch(() => undefined);
      await new Promise<void>((resolve) => httpServer.close(() => resolve()));
      process.exit(0);
    })();
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  console.error(`mcp-patchright listening on http://${options.host}:${options.port}`);
  console.error(`  SSE:        http://${options.host}:${options.port}/sse`);
  console.error(`  Streamable: http://${options.host}:${options.port}/mcp`);
}

const cliOptions = parseCli();
const defaultStartOptions: StartOptions = {
  ...(cliOptions.userDataDir ? { userDataDir: cliOptions.userDataDir } : {}),
  ...(cliOptions.headless !== undefined ? { headless: cliOptions.headless } : {}),
};

if (cliOptions.port !== undefined) {
  await startHttp({ ...cliOptions, port: cliOptions.port }, defaultStartOptions);
} else {
  await startStdio(defaultStartOptions);
}
