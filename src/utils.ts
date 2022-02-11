import { ExtensionSettings } from "./types";
import { DefaultSettings } from "./constants";

export async function getSettings(
  sync: chrome.storage.SyncStorageArea
): Promise<ExtensionSettings> {
  const settings = await sync.get(DefaultSettings);
  return settings as ExtensionSettings;
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
      "Content-Type": "text/markdown",
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
