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
  ObsidianRequest,
  ObsidianResponse,
  ObsidianResponseError,
  BackgroundErrorLog,
  LogEntry,
  SearchJsonResponseItemWithMetadata,
} from "./types";
import {
  DefaultSyncSettings,
  DefaultLocalSettings,
  KnownSyncSettingKeys,
  KnownLocalSettingKeys,
} from "./constants";
import {
  migrateLocalSettings,
  migrateSyncSettings,
} from "./settings_migrations";

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
  let settings = await sync.get(KnownSyncSettingKeys);

  settings = await migrateSyncSettings(sync, settings);

  for (const key in DefaultSyncSettings) {
    if (settings[key] === undefined) {
      settings[key] =
        DefaultSyncSettings[key as keyof typeof DefaultSyncSettings];
    }
  }
  await sync.set(settings);

  return settings as ExtensionSyncSettings;
}

export async function getLocalSettings(
  local: chrome.storage.LocalStorageArea
): Promise<ExtensionLocalSettings> {
  let settings = await local.get(KnownLocalSettingKeys);

  settings = await migrateLocalSettings(local, settings);

  for (const key in DefaultLocalSettings) {
    if (settings[key] === undefined) {
      settings[key] =
        DefaultLocalSettings[key as keyof typeof DefaultLocalSettings];
    }
  }
  await local.set(settings);

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
  message: ObsidianRequest
): Promise<ObsidianResponse | ObsidianResponseError>;
export async function sendBackgroundRequest(
  message: BackgroundErrorLog
): Promise<LogEntry[]>;
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

export async function getBackgroundErrorLog(): Promise<LogEntry[]> {
  return await sendBackgroundRequest({
    type: "background-error-log",
  });
}

export async function openFileInObsidian(
  filename: string
): Promise<ObsidianResponse> {
  return obsidianRequest(`/open/${filename}`, { method: "post" });
}

export async function _getPageMetadata(
  hostname: string,
  apiKey: string,
  insecureMode: boolean,
  filename: string
): Promise<FileMetadataObject> {
  const result = await _obsidianRequest(
    hostname,
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

  return (await result.json()) as FileMetadataObject;
}

export async function getPageMetadata(
  filename: string
): Promise<FileMetadataObject> {
  const result = await obsidianRequest(`/vault/${filename}`, {
    method: "get",
    headers: {
      Accept: "application/vnd.olrapi.note+json",
    },
  });

  return result.data as FileMetadataObject;
}

export async function getUrlMentions(url: string): Promise<{
  mentions: SearchJsonResponseItem[];
  direct: SearchJsonResponseItemWithMetadata[];
}> {
  async function handleMentions() {
    const result = await obsidianSearchRequest({
      regexp: [`${escapeStringRegexp(url)}(?=\\s|\\)|$)`, { var: "content" }],
    });
    return result;
  }

  async function handleDirect(): Promise<SearchJsonResponseItemWithMetadata[]> {
    const results = await obsidianSearchRequest({
      glob: [{ var: "frontmatter.url" }, url],
    });
    const pageMetadata: SearchJsonResponseItemWithMetadata[] = [];
    for (const result of results) {
      pageMetadata.push({
        ...result,
        meta: await getPageMetadata(result.filename),
      });
    }
    return pageMetadata;
  }

  return {
    mentions: await handleMentions(),
    direct: await handleDirect(),
  };
}

export async function _getUrlMentions(
  hostname: string,
  apiKey: string,
  insecureMode: boolean,
  url: string
): Promise<{
  mentions: SearchJsonResponseItem[];
  direct: SearchJsonResponseItemWithMetadata[];
}> {
  async function handleMentions() {
    const result = await _obsidianSearchRequest(
      hostname,
      apiKey,
      insecureMode,
      {
        regexp: [`${escapeStringRegexp(url)}(?=\\s|\\)|$)`, { var: "content" }],
      }
    );
    return result;
  }

  async function handleDirect(): Promise<SearchJsonResponseItemWithMetadata[]> {
    const results = await _obsidianSearchRequest(
      hostname,
      apiKey,
      insecureMode,
      {
        glob: [{ var: "frontmatter.url" }, url],
      }
    );
    const pageMetadata: SearchJsonResponseItemWithMetadata[] = [];
    for (const result of results) {
      const meta = await _getPageMetadata(
        hostname,
        apiKey,
        insecureMode,
        result.filename
      );
      pageMetadata.push({
        ...result,
        meta,
      });
    }
    return pageMetadata;
  }

  return {
    mentions: await handleMentions(),
    direct: await handleDirect(),
  };
}

export async function obsidianSearchRequest(
  query: Record<string, any>
): Promise<SearchJsonResponseItem[]> {
  const result = await obsidianRequest("/search/", {
    method: "post",
    body: JSON.stringify(query),
    headers: {
      "Content-type": "application/vnd.olrapi.jsonlogic+json",
    },
  });

  return result.data as SearchJsonResponseItem[];
}

export async function _obsidianSearchRequest(
  hostname: string,
  apiKey: string,
  insecureMode: boolean,
  query: Record<string, any>
): Promise<SearchJsonResponseItem[]> {
  const result = await _obsidianRequest(
    hostname,
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

  return (await result.json()) as SearchJsonResponseItem[];
}

export async function obsidianRequest(
  path: string,
  options: RequestInit
): Promise<ObsidianResponse> {
  const result = await sendBackgroundRequest({
    type: "obsidian-request",
    request: {
      path: path,
      options: options,
    },
  });

  if (!result.ok) {
    throw new Error(result.error);
  }

  return result;
}

export async function _obsidianRequest(
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
