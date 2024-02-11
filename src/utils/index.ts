import { v4 as uuid } from "uuid";

import {
  ContentCache,
  ExtensionSyncSettings,
  ExtensionLocalSettings,
  SandboxRenderRequest,
  SandboxRenderResponse,
  SandboxExceptionResponse,
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
  SearchJsonResponseItem,
  SearchJsonResponseItemWithMetadata,
} from "../types";
import {
  DefaultSyncSettings,
  DefaultLocalSettings,
  KnownSyncSettingKeys,
  KnownLocalSettingKeys,
} from "../constants";
import {
  migrateLocalSettings,
  migrateSyncSettings,
} from "../settings_migrations";

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

export const compileTemplateCallbackController = new AbortController();

export function unregisterCompileTemplateCallback(): void {
  compileTemplateCallbackController.abort();
}

export function compileTemplateCallback(
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

export function countMentions(
  mentions: SearchJsonResponseItem[],
  direct: SearchJsonResponseItemWithMetadata[]
): number {
  const matchedFiles = [];

  for (const list of [mentions, direct]) {
    for (const mention of list) {
      if (matchedFiles.indexOf(mention.filename) === -1) {
        matchedFiles.push(mention.filename);
      }
    }
  }

  return matchedFiles.length;
}
