import { z } from "zod";

export const startSchema = z.object({
  browser: z.enum(["chromium", "firefox", "webkit"]).optional(),
  headless: z.boolean().optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  userAgent: z.string().optional(),
  userDataDir: z.string().optional(),
  channel: z.enum(["chrome", "chrome-beta", "chrome-dev", "chrome-canary", "msedge"]).optional(),
  locale: z.string().optional(),
  timezoneId: z.string().optional(),
  proxy: z.object({
    server: z.string(),
    username: z.string().optional(),
    password: z.string().optional(),
    bypass: z.string().optional(),
  }).optional(),
  geolocation: z.object({
    latitude: z.number(),
    longitude: z.number(),
    accuracy: z.number().optional(),
  }).optional(),
  colorScheme: z.enum(["light", "dark", "no-preference"]).optional(),
  cdpEndpoint: z.string().url().optional(),
});

export const navigateSchema = z.object({
  url: z.string().url(),
  waitUntil: z.enum(["load", "domcontentloaded", "networkidle", "commit"]).optional(),
  timeout: z.number().int().positive().optional(),
});

export const newPageSchema = z.object({
  url: z.string().url().optional(),
});

export const pageIdSchema = z.object({
  pageId: z.string().min(1),
});

export const closePageSchema = z.object({
  pageId: z.string().min(1).optional(),
});

export const screenshotSchema = z.object({
  path: z.string().optional(),
  fullPage: z.boolean().optional(),
});

export const targetSchema = z
  .object({
    selector: z.string().min(1).optional(),
    ref: z.string().min(1).optional(),
    frameSelector: z.string().min(1).optional(),
    timeout: z.number().int().positive().optional(),
  })
  .refine((value) => !!value.selector !== !!value.ref, {
    message: "Provide exactly one of selector or ref",
  });

export const fillSchema = targetSchema.extend({
  text: z.string(),
});

export const typeSchema = targetSchema.extend({
  text: z.string(),
  delay: z.number().int().nonnegative().optional(),
});

export const pressSchema = z.object({
  key: z.string().min(1),
  selector: z.string().optional(),
  ref: z.string().optional(),
  frameSelector: z.string().optional(),
  timeout: z.number().int().positive().optional(),
});

export const waitForSchema = z.object({
  selector: z.string().min(1).optional(),
  ref: z.string().min(1).optional(),
  frameSelector: z.string().min(1).optional(),
  state: z.enum(["attached", "detached", "visible", "hidden"]).optional(),
  timeout: z.number().int().positive().optional(),
}).refine((value) => !(value.selector && value.ref), {
  message: "Provide at most one of selector or ref",
});

export const evaluateSchema = z.object({
  function: z.string().min(1).optional(),
  expression: z.string().min(1).optional(),
  script: z.string().min(1).optional(),
}).refine(v => v.function || v.expression || v.script, {
  message: "Provide function, expression, or script",
});

export const selectOptionSchema = targetSchema.extend({
  values: z.array(z.string()).min(1),
});

export const dialogSchema = z.object({
  accept: z.boolean(),
  promptText: z.string().optional(),
  wait: z.boolean().optional(),
  timeout: z.number().int().positive().optional(),
});

export const fileUploadSchema = targetSchema.extend({
  paths: z.array(z.string()).min(1),
});

export const networkRequestsSchema = z.object({
  activeOnly: z.boolean().optional(),
});

export const networkRequestSchema = z.object({
  id: z.string().min(1).optional(),
  index: z.number().int().nonnegative().optional(),
  details: z.boolean().optional(),
}).refine((value) => !!value.id !== (value.index !== undefined), {
  message: "Provide exactly one of id or index",
});

export const networkStateSchema = z.object({
  offline: z.boolean(),
});

export const resizeSchema = z.object({
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export const dragDropSchema = z.object({
  source: z.object({ selector: z.string().optional(), ref: z.string().optional(), frameSelector: z.string().optional() }).refine(v => !!v.selector !== !!v.ref, { message: "Provide exactly one of selector or ref" }),
  target: z.object({ selector: z.string().optional(), ref: z.string().optional(), frameSelector: z.string().optional() }).refine(v => !!v.selector !== !!v.ref, { message: "Provide exactly one of selector or ref" }),
  timeout: z.number().int().positive().optional(),
});

export const fillFormSchema = z.object({
  fields: z.array(z.object({
    selector: z.string().optional(),
    ref: z.string().optional(),
    frameSelector: z.string().optional(),
    name: z.string().optional(),
    value: z.string(),
  })).min(1),
  timeout: z.number().int().positive().optional(),
});

export const runCodeSchema = z.object({
  script: z.string().min(1),
  args: z.array(z.unknown()).optional(),
});

const resourceTypeEnum = z.enum([
  "document", "stylesheet", "image", "media", "font", "script",
  "texttrack", "xhr", "fetch", "eventsource", "websocket", "manifest", "other",
]);

export const routeBlockSchema = z.object({
  urlPattern: z.string().optional(),
  resourceTypes: z.array(resourceTypeEnum).optional(),
});

export const routeMockSchema = z.object({
  urlPattern: z.string().min(1),
  status: z.number().int().optional(),
  body: z.string().optional(),
  contentType: z.string().optional(),
});

export const storageSaveSchema = z.object({
  path: z.string().optional(),
});

export const storageLoadSchema = z.object({
  path: z.string().optional(),
  state: z.object({
    cookies: z.array(z.record(z.string(), z.unknown())).optional(),
    origins: z.array(z.object({
      origin: z.string(),
      localStorage: z.array(z.object({ name: z.string(), value: z.string() })),
    })).optional(),
  }).optional(),
}).refine((v) => !!v.path || !!v.state, {
  message: "Provide path or state",
});

export const apiRequestSchema = z.object({
  url: z.string().url(),
  method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE", "HEAD"]).optional(),
  headers: z.record(z.string(), z.string()).optional(),
  data: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
  timeout: z.number().int().positive().optional(),
  maxBytes: z.number().int().positive().optional(),
});

export const visibleTextSchema = z.object({
  maxLength: z.number().int().positive().optional(),
});

export const visibleHtmlSchema = z.object({
  selector: z.string().optional(),
  removeScripts: z.boolean().optional(),
  maxLength: z.number().int().positive().optional(),
});

export const iframeClickSchema = z.object({
  frameSelector: z.string().min(1),
  selector: z.string().min(1),
  timeout: z.number().int().positive().optional(),
});

export const iframeFillSchema = iframeClickSchema.extend({
  value: z.string(),
});

export const savePdfSchema = z.object({
  path: z.string().optional(),
  landscape: z.boolean().optional(),
  printBackground: z.boolean().optional(),
  scale: z.number().positive().optional(),
  format: z.enum(["Letter", "Legal", "Tabloid", "A3", "A4", "A5"]).optional(),
});
