import { readFile, writeFile } from "node:fs/promises";
import type { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import type { Dialog, Locator, Page } from "patchright";
import type { BrowserManager } from "../browser/manager.js";
import {
  closePageSchema,
  selectOptionSchema,
  dialogSchema,
  fileUploadSchema,
  networkRequestsSchema,
  networkRequestSchema,
  networkStateSchema,
  resizeSchema,
  dragDropSchema,
  fillFormSchema,
  runCodeSchema,
  savePdfSchema,
  storageSaveSchema,
  storageLoadSchema,
  evaluateSchema,
  fillSchema,
  navigateSchema,
  newPageSchema,
  pageIdSchema,
  pressSchema,
  screenshotSchema,
  targetSchema,
  typeSchema,
  waitForSchema,
  startSchema,
} from "./schemas.js";

type ToolResult = CallToolResult;

function text(value: unknown): ToolResult {
  return {
    content: [
      {
        type: "text",
        text: typeof value === "string" ? value : JSON.stringify(value, null, 2),
      },
    ],
  };
}

function image(data: Buffer): ToolResult {
  return {
    content: [{ type: "image", data: data.toString("base64"), mimeType: "image/png" }],
  };
}

// CDP Page.printToPDF takes paper dimensions in inches.
const PDF_PAPER: Record<string, { width: number; height: number }> = {
  Letter: { width: 8.5, height: 11 },
  Legal: { width: 8.5, height: 14 },
  Tabloid: { width: 11, height: 17 },
  A3: { width: 11.69, height: 16.54 },
  A4: { width: 8.27, height: 11.69 },
  A5: { width: 5.83, height: 8.27 },
};

function locatorFor(page: Page, target: { selector?: string; ref?: string }): Locator {
  if (target.ref) return page.locator(`aria-ref=${target.ref}`);
  if (target.selector) return page.locator(target.selector);
  throw new Error("Missing selector or ref");
}


async function collectFingerprint(page: Page): Promise<unknown> {
  const client = await page.context().newCDPSession(page);
  const uaData = await client.send("Browser.getVersion").catch(() => undefined);
  await client.detach().catch(() => undefined);

  const data = await page.evaluate(() => {
    const glCanvas = document.createElement("canvas");
    const gl = (glCanvas.getContext("webgl") || glCanvas.getContext("experimental-webgl")) as WebGLRenderingContext | null;
    let webgl: { vendor?: string | null; renderer?: string | null } | undefined;
    if (gl) {
      const dbg = gl.getExtension("WEBGL_debug_renderer_info");
      webgl = {
        vendor: dbg ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR),
        renderer: dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      };
    }

    return {
      url: location.href,
      userAgent: navigator.userAgent,
      webdriver: navigator.webdriver,
      languages: navigator.languages,
      language: navigator.language,
      platform: navigator.platform,
      hardwareConcurrency: navigator.hardwareConcurrency,
      deviceMemory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
      maxTouchPoints: navigator.maxTouchPoints,
      cookieEnabled: navigator.cookieEnabled,
      pluginsLength: navigator.plugins?.length,
      mimeTypesLength: navigator.mimeTypes?.length,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      screen: {
        width: screen.width,
        height: screen.height,
        availWidth: screen.availWidth,
        availHeight: screen.availHeight,
        colorDepth: screen.colorDepth,
        pixelDepth: screen.pixelDepth,
      },
      viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
      chromeRuntime: !!(globalThis as typeof globalThis & { chrome?: unknown }).chrome,
      permissionsQuery: !!navigator.permissions?.query,
      webgl,
    };
  });

  const warnings: string[] = [];
  if (data.webdriver) warnings.push("navigator.webdriver is truthy");
  if (/HeadlessChrome/i.test(data.userAgent)) warnings.push("User-Agent contains HeadlessChrome");
  if (!data.languages?.length) warnings.push("navigator.languages is empty");
  if (!data.pluginsLength) warnings.push("navigator.plugins is empty");
  if (data.viewport.width === 0 || data.viewport.height === 0) warnings.push("Viewport size is zero");

  return { ...data, browserVersion: uaData, warnings };
}

export async function handleTool(manager: BrowserManager, name: string, args: unknown): Promise<ToolResult> {
  switch (name) {
    case "browser_start": {
      const parsed = startSchema.parse(args ?? {});
      const page = await manager.start(parsed);
      return text({ ok: true, url: page.url(), status: await manager.status() });
    }
    case "browser_status": {
      return text(await manager.status());
    }
    case "browser_navigate": {
      const parsed = navigateSchema.parse(args);
      const page = await manager.getPage();
      const response = await page.goto(parsed.url, {
        waitUntil: parsed.waitUntil ?? "domcontentloaded",
        timeout: parsed.timeout ?? 30_000,
      });
      return text({
        ok: true,
        url: page.url(),
        title: await page.title().catch(() => undefined),
        status: response?.status(),
      });
    }
    case "browser_new_page": {
      const parsed = newPageSchema.parse(args ?? {});
      return text(await manager.newPage(parsed.url));
    }
    case "browser_pages": {
      return text(await manager.listPages());
    }
    case "browser_switch_page": {
      const parsed = pageIdSchema.parse(args);
      return text(await manager.switchPage(parsed.pageId));
    }
    case "browser_close_page": {
      const parsed = closePageSchema.parse(args ?? {});
      return text(await manager.closePage(parsed.pageId));
    }
    case "browser_snapshot": {
      const page = await manager.getPage();
      const snapshot = await page.ariaSnapshot({ mode: "ai", timeout: 5_000 });
      return text({ url: page.url(), title: await page.title().catch(() => undefined), snapshot });
    }
    case "browser_take_screenshot": {
      const parsed = screenshotSchema.parse(args ?? {});
      const page = await manager.getPage();
      const shot = await page.screenshot({ path: parsed.path, fullPage: parsed.fullPage ?? true });
      if (parsed.path) return text({ ok: true, path: parsed.path });
      return image(shot);
    }
    case "browser_click": {
      const parsed = targetSchema.parse(args);
      const page = await manager.getPage();
      await locatorFor(page, parsed).click({ timeout: parsed.timeout ?? 30_000 });
      return text({ ok: true });
    }
    case "browser_fill": {
      const parsed = fillSchema.parse(args);
      const page = await manager.getPage();
      await locatorFor(page, parsed).fill(parsed.text, { timeout: parsed.timeout ?? 30_000 });
      return text({ ok: true });
    }
    case "browser_type": {
      const parsed = typeSchema.parse(args);
      const page = await manager.getPage();
      await locatorFor(page, parsed).pressSequentially(parsed.text, {
        delay: parsed.delay ?? 50,
        timeout: parsed.timeout ?? 30_000,
      });
      return text({ ok: true });
    }
    case "browser_hover": {
      const parsed = targetSchema.parse(args);
      const page = await manager.getPage();
      await locatorFor(page, parsed).hover({ timeout: parsed.timeout ?? 30_000 });
      return text({ ok: true });
    }
    case "browser_press_key": {
      const parsed = pressSchema.parse(args);
      const page = await manager.getPage();
      if (parsed.selector || parsed.ref) await locatorFor(page, parsed).press(parsed.key, { timeout: parsed.timeout ?? 30_000 });
      else await page.keyboard.press(parsed.key);
      return text({ ok: true });
    }
    case "browser_wait_for": {
      const parsed = waitForSchema.parse(args ?? {});
      const page = await manager.getPage();
      if (parsed.selector || parsed.ref) {
        await locatorFor(page, parsed).waitFor({ state: parsed.state ?? "visible", timeout: parsed.timeout ?? 30_000 });
      } else {
        await page.waitForTimeout(parsed.timeout ?? 1_000);
      }
      return text({ ok: true });
    }
    case "browser_evaluate": {
      const parsed = evaluateSchema.parse(args);
      const page = await manager.getPage();
      const code = parsed.function ?? parsed.script;
      if (code) {
        const result = await page.evaluate((script: string) => Function(`"use strict"; return (${script})`)(), code);
        return text(result);
      }
      if (parsed.expression) {
        const result = await page.evaluate(new Function(`return (${parsed.expression})`) as any);
        return text(result);
      }
      return text({ ok: false, error: "Provide function, expression, or script" });
    }
    case "browser_fingerprint_check": {
      const page = await manager.getPage();
      return text(await collectFingerprint(page));
    }
    case "browser_navigate_back": {
      const page = await manager.getPage();
      await page.goBack({ timeout: 10_000 }).catch(() => undefined);
      return text({ ok: true, url: page.url(), title: await page.title().catch(() => undefined) });
    }
    case "browser_select_option": {
      const parsed = selectOptionSchema.parse(args);
      const page = await manager.getPage();
      await locatorFor(page, parsed).selectOption(parsed.values, { timeout: parsed.timeout ?? 30_000 });
      return text({ ok: true });
    }
    case "browser_handle_dialog": {
      const parsed = dialogSchema.parse(args);
      const page = await manager.getPage();
      const handle = async (dialog: Dialog) => {
        const result = {
          type: dialog.type(),
          message: dialog.message(),
          defaultValue: dialog.defaultValue(),
          accepted: parsed.accept,
        };
        if (parsed.accept) await dialog.accept(parsed.promptText);
        else await dialog.dismiss();
        return result;
      };

      if (parsed.wait) {
        const dialog = await page.waitForEvent("dialog", { timeout: parsed.timeout ?? 30_000 });
        return text({ ok: true, dialog: await handle(dialog) });
      }

      page.once("dialog", (dialog) => {
        handle(dialog).catch(() => undefined);
      });
      return text({ ok: true, armed: true });
    }
    case "browser_file_upload": {
      const parsed = fileUploadSchema.parse(args);
      const page = await manager.getPage();
      await locatorFor(page, parsed).setInputFiles(parsed.paths, { timeout: parsed.timeout ?? 30_000 });
      return text({ ok: true });
    }
    case "browser_network_requests": {
      const parsed = networkRequestsSchema.parse(args ?? {});
      return text(manager.getNetworkRequests(parsed.activeOnly));
    }
    case "browser_network_request": {
      const parsed = networkRequestSchema.parse(args);
      const req =
        parsed.id !== undefined
          ? manager.getNetworkRequestById(parsed.id)
          : parsed.index !== undefined
            ? manager.getNetworkRequestByIndex(parsed.index)
            : undefined;
      if (!req) {
        return text({
          ok: false,
          error: parsed.id !== undefined ? `No request with id ${parsed.id}` : `No request at index ${parsed.index}`,
        });
      }
      return text(req);
    }
    case "browser_console_messages": {
      return text(manager.getConsoleMessages());
    }
    case "browser_resize": {
      const parsed = resizeSchema.parse(args);
      const page = await manager.getPage();
      await page.setViewportSize({ width: parsed.width, height: parsed.height });
      return text({ ok: true, width: parsed.width, height: parsed.height });
    }
    case "browser_drag": {
      const parsed = dragDropSchema.parse(args);
      const page = await manager.getPage();
      const src = locatorFor(page, parsed.source);
      const dst = locatorFor(page, parsed.target);
      await src.dragTo(dst, { timeout: parsed.timeout ?? 30_000 });
      return text({ ok: true });
    }
    case "browser_fill_form": {
      const parsed = fillFormSchema.parse(args);
      const page = await manager.getPage();
      const results: { name?: string; ok: boolean; error?: string }[] = [];
      for (const field of parsed.fields) {
        try {
          const loc = field.selector ? page.locator(field.selector) : field.ref ? page.locator(`aria-ref=${field.ref}`) : null;
          if (!loc) { results.push({ name: field.name, ok: false, error: "Missing selector or ref" }); continue; }
          await loc.fill(field.value, { timeout: parsed.timeout ?? 30_000 });
          results.push({ name: field.name, ok: true });
        } catch (e: any) {
          results.push({ name: field.name, ok: false, error: e?.message ?? String(e) });
        }
      }
      return text({ ok: results.every(r => r.ok), fields: results });
    }
    case "browser_run_code_unsafe": {
      const parsed = runCodeSchema.parse(args);
      const page = await manager.getPage();
      const result = await page.evaluate(
        (opts: { script: string; args?: unknown[] }) => Function("args", opts.script)(opts.args),
        { script: parsed.script, args: parsed.args },
      );
      return text(result);
    }
    case "browser_network_state_set": {
      const parsed = networkStateSchema.parse(args);
      const page = await manager.getPage();
      await page.context().setOffline(parsed.offline);
      return text({ ok: true, offline: parsed.offline });
    }
    case "browser_storage_save": {
      const parsed = storageSaveSchema.parse(args ?? {});
      const page = await manager.getPage();
      const state = await page.context().storageState(parsed.path ? { path: parsed.path } : {});
      if (parsed.path) {
        return text({ ok: true, path: parsed.path, cookies: state.cookies.length, origins: state.origins.length });
      }
      return text(state);
    }
    case "browser_storage_load": {
      const parsed = storageLoadSchema.parse(args);
      const page = await manager.getPage();
      const ctx = page.context();
      const state = parsed.state ?? JSON.parse(await readFile(parsed.path!, "utf8"));
      if (state.cookies?.length) await ctx.addCookies(state.cookies);
      // Persistent contexts can't ingest storageState at launch, so restore
      // localStorage by visiting each origin and writing entries directly.
      let originsApplied = 0;
      for (const origin of state.origins ?? []) {
        if (!origin.localStorage?.length) continue;
        await page.goto(origin.origin, { waitUntil: "domcontentloaded", timeout: 30_000 }).catch(() => undefined);
        await page.evaluate((items: { name: string; value: string }[]) => {
          for (const item of items) localStorage.setItem(item.name, item.value);
        }, origin.localStorage);
        originsApplied++;
      }
      return text({ ok: true, cookies: state.cookies?.length ?? 0, origins: originsApplied });
    }
    case "browser_save_pdf": {
      const parsed = savePdfSchema.parse(args ?? {});
      const page = await manager.getPage();
      // page.pdf() only works in headless Chromium, so drive CDP Page.printToPDF
      // directly — this works in headed/stealth mode too.
      const client = await page.context().newCDPSession(page);
      const paper = parsed.format ? PDF_PAPER[parsed.format] : undefined;
      try {
        const { data } = await client.send("Page.printToPDF", {
          landscape: parsed.landscape ?? false,
          printBackground: parsed.printBackground ?? true,
          scale: parsed.scale ?? 1,
          ...(paper ? { paperWidth: paper.width, paperHeight: paper.height } : {}),
        });
        const buf = Buffer.from(data, "base64");
        if (parsed.path) {
          await writeFile(parsed.path, buf);
          return text({ ok: true, path: parsed.path, bytes: buf.length });
        }
        return text({ ok: true, bytes: buf.length, pdfBase64: data });
      } finally {
        await client.detach().catch(() => undefined);
      }
    }
    case "browser_close": {
      await manager.close();
      return text({ ok: true });
    }
    default:
      return { content: [{ type: "text", text: `Unknown tool: ${name}` }], isError: true };
  }
}
