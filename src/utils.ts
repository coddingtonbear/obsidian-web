import escapeStringRegexp from "escape-string-regexp";
import { v4 as uuid } from "uuid";

import {
  ContentCache,
  ExtensionSyncSettings,
  ExtensionLocalSettings,
  SandboxRenderRequest,
  SandboxRenderResponse,
  SandboxExceptionResponse,
  SearchJsonResponseItem,
  SandboxLoadedResponse,
} from "./types";
import { DefaultSyncSettings, DefaultLocalSettings } from "./constants";

const HandlebarsCallbacks: Record<
  string,
  | {
      resolve: (value: string | PromiseLike<string>) => void;
      reject: (reason?: any) => void;
    }
  | undefined
> = {};

export async function getSyncSettings(
  sync: chrome.storage.SyncStorageArea
): Promise<ExtensionSyncSettings> {
  const settings = await sync.get(DefaultSyncSettings);
  return settings as ExtensionSyncSettings;
}

export async function getLocalSettings(
  local: chrome.storage.LocalStorageArea
): Promise<ExtensionLocalSettings> {
  const settings = await local.get(DefaultLocalSettings);
  return settings as ExtensionLocalSettings;
}

export async function setContentCache(
  local: chrome.storage.LocalStorageArea,
  content: ContentCache
): Promise<void> {
  await local.set({ contentCache: content });
}

export async function getContentCache(
  local: chrome.storage.LocalStorageArea
): Promise<ContentCache> {
  const cache = await local.get({ contentCache: {} });
  return cache.contentCache ?? {};
}

export function normalizeCacheUrl(urlString: string): string {
  const url = new URL(urlString);
  url.hash = "";
  url.username = "";
  url.password = "";

  return url.toString();
}

export async function openFileInObsidian(
  apiKey: string,
  insecureMode: boolean,
  filename: string
): ReturnType<typeof obsidianRequest> {
  return obsidianRequest(
    apiKey,
    `/open/${filename}`,
    { method: "post" },
    insecureMode
  );
}

export async function getUrlMentions(
  apiKey: string,
  insecureMode: boolean,
  url: string
): Promise<{
  mentions: SearchJsonResponseItem[];
  direct: SearchJsonResponseItem[];
}> {
  async function handleMentions() {
    return await obsidianSearchRequest(apiKey, insecureMode, {
      regexp: [`${escapeStringRegexp(url)}(?=\\s|\\)|$)`, { var: "content" }],
    });
  }

  async function handleDirect() {
    return await obsidianSearchRequest(apiKey, insecureMode, {
      glob: [{ var: "frontmatter.url" }, url],
    });
  }

  return {
    mentions: await handleMentions(),
    direct: await handleDirect(),
  };
}

export async function obsidianSearchRequest(
  apiKey: string,
  insecureMode: boolean,
  query: Record<string, any>
): Promise<SearchJsonResponseItem[]> {
  const result = await obsidianRequest(
    apiKey,
    "/search/",
    {
      method: "post",
      body: JSON.stringify(query),
      headers: {
        "Content-type": "application/vnd.olrapi.jsonlogic+json",
      },
    },
    insecureMode
  );

  return await result.json();
}

export async function obsidianRequest(
  apiKey: string,
  path: string,
  options: RequestInit,
  insecureMode: boolean
): ReturnType<typeof fetch> {
  const requestOptions: RequestInit = {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${apiKey}`,
    },
    method: options.method?.toUpperCase(),
    mode: "cors",
  };

  return fetch(
    `http${insecureMode ? "" : "s"}://127.0.0.1:${
      insecureMode ? "27123" : "27124"
    }${path}`,
    requestOptions
  );
}

export function compileTemplate(
  template: string,
  context: Record<string, any>
): Promise<string> {
  const result = new Promise<string>((resolve, reject) => {
    const sandbox = document.getElementById(
      "handlebars-sandbox"
    ) as HTMLIFrameElement;

    if (!sandbox.contentWindow) {
      throw new Error("No content window found for handlebars sandbox!");
    }

    const requestId = uuid();
    const message: SandboxRenderRequest = {
      command: "render",
      id: requestId,
      template,
      context,
    };
    HandlebarsCallbacks[requestId] = {
      resolve,
      reject,
    };

    sandbox.contentWindow.postMessage(message, "*");
  });

  return result;
}

function compileTemplateCallback(
  event: MessageEvent<
    SandboxRenderResponse | SandboxExceptionResponse | SandboxLoadedResponse
  >
) {
  const eventData = event.data;

  if (eventData.type !== "response") {
    return;
  }

  const resolvers = HandlebarsCallbacks[eventData.request.id];
  if (!resolvers) {
    throw new Error(
      `Received template compilation callback, but could not identify message: ${JSON.stringify(
        eventData
      )}`
    );
  }

  if (eventData.success) {
    resolvers.resolve(eventData.rendered);
  } else {
    resolvers.reject(eventData.message);
  }

  delete HandlebarsCallbacks[eventData.request.id];
}

if (typeof window !== "undefined") {
  window.addEventListener("message", compileTemplateCallback);
}
