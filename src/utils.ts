import escapeStringRegexp from "escape-string-regexp";

import {
  ExtensionSyncSettings,
  ExtensionLocalSettings,
  SandboxRenderRequest,
  SandboxRenderResponse,
  SandboxExceptionResponse,
  SearchJsonResponseItem,
} from "./types";
import { DefaultSyncSettings, DefaultLocalSettings } from "./constants";

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

    const message: SandboxRenderRequest = {
      command: "render",
      template,
      context,
    };

    if (!sandbox.contentWindow) {
      throw new Error("No content window found for handlebars sandbox!");
    }

    const handler = (
      event: MessageEvent<SandboxRenderResponse | SandboxExceptionResponse>
    ) => {
      if (event.data.success) {
        resolve(event.data.rendered);
      } else {
        reject(event.data.message);
      }
    };

    window.addEventListener("message", handler, { once: true });

    sandbox.contentWindow.postMessage(message, "*");
  });

  return result;
}
