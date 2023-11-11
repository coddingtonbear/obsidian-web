import escapeStringRegexp from "escape-string-regexp";
import { v4 as uuid } from "uuid";

import {
  ContentCache,
  ExtensionSyncSettings,
  ExtensionLocalSettings,
  FileMetadataObject,
  SandboxRenderRequest,
  SandboxRenderResponse,
  SandboxExceptionResponse,
  SearchJsonResponseItem,
  SandboxLoadedResponse,
  BackgroundRequest,
  CheckHasHostPermissionRequest,
  RequestHostPermissionRequest,
  CheckKeyboardShortcutRequest,
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

export async function sendBackgroundRequest(
  message: CheckHasHostPermissionRequest
): Promise<boolean>;
export async function sendBackgroundRequest(
  message: RequestHostPermissionRequest
): Promise<boolean>;
export async function sendBackgroundRequest(
  message: CheckKeyboardShortcutRequest
): Promise<string>;
export async function sendBackgroundRequest(
  message: BackgroundRequest
): Promise<unknown> {
  return await chrome.runtime.sendMessage(message);
}

export async function checkHasHostPermission(host: string): Promise<boolean> {
  return await sendBackgroundRequest({
    type: "check-has-host-permission",
    host,
  });
}

export async function requestHostPermission(host: string): Promise<boolean> {
  return await sendBackgroundRequest({
    type: "request-host-permission",
    host,
  });
}

export async function checkKeyboardShortcut(): Promise<string> {
  return await sendBackgroundRequest({
    type: "check-keyboard-shortcut",
  });
}

export async function openFileInObsidian(
  host: string,
  apiKey: string,
  insecureMode: boolean,
  filename: string
): ReturnType<typeof obsidianRequest> {
  return obsidianRequest(
    host,
    apiKey,
    `/open/${filename}`,
    { method: "post" },
    insecureMode
  );
}

export async function getPageMetadata(
  host: string,
  apiKey: string,
  insecureMode: boolean,
  filename: string
): Promise<FileMetadataObject> {
  const result = await obsidianRequest(
    host,
    apiKey,
    `/vault/${filename}`,
    {
      method: "get",
      headers: {
        Accept: "application/vnd.olrapi.note+json",
      },
    },
    insecureMode
  );

  return await result.json();
}

export async function getUrlMentions(
  host: string,
  apiKey: string,
  insecureMode: boolean,
  url: string
): Promise<{
  mentions: SearchJsonResponseItem[];
  direct: SearchJsonResponseItem[];
}> {
  async function handleMentions() {
    return await obsidianSearchRequest(host, apiKey, insecureMode, {
      regexp: [`${escapeStringRegexp(url)}(?=\\s|\\)|$)`, { var: "content" }],
    });
  }

  async function handleDirect() {
    return await obsidianSearchRequest(host, apiKey, insecureMode, {
      glob: [{ var: "frontmatter.url" }, url],
    });
  }

  return {
    mentions: await handleMentions(),
    direct: await handleDirect(),
  };
}

export async function obsidianSearchRequest(
  host: string,
  apiKey: string,
  insecureMode: boolean,
  query: Record<string, any>
): Promise<SearchJsonResponseItem[]> {
  const result = await obsidianRequest(
    host,
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
  hostname: string,
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
    `http${insecureMode ? "" : "s"}://${hostname}:${
      insecureMode ? "27123" : "27124"
    }${path}`,
    requestOptions
  );
}

export function compileTemplate(
  sandbox: HTMLIFrameElement | null,
  template: string,
  context: Record<string, any>
): Promise<string> {
  if (!sandbox || !sandbox.contentWindow) {
    throw new Error("No sandbox available");
  }

  const result = new Promise<string>((resolve, reject) => {
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

export function getWindowSelectionAsHtml(): string {
  const selection = window.getSelection();
  if (!selection) {
    return "";
  }
  const contents = selection.getRangeAt(0).cloneContents();
  const node = document.createElement("div");
  node.appendChild(contents.cloneNode(true));
  return node.innerHTML;
}

const compileTemplateCallbackController = new AbortController();

export function unregisterCompileTemplateCallback(): void {
  compileTemplateCallbackController.abort();
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
  window.addEventListener("message", compileTemplateCallback, {
    signal: compileTemplateCallbackController.signal,
  });
}
