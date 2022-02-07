import { ExtensionSettings } from "./types";
import { DefaultSettings } from "./constants";

export async function getSettings(
  sync: chrome.storage.SyncStorageArea
): Promise<ExtensionSettings> {
  const settings = await sync.get(DefaultSettings);
  return settings as ExtensionSettings;
}

export function postNotification(
  options: chrome.notifications.NotificationOptions
): void {
  options.type = "basic";
  options.iconUrl = "icon256.png";

  chrome.notifications.create(options);
}

export async function obsidianRequest(
  apiKey: string,
  path: string,
  options: RequestInit
): Promise<ReturnType<typeof fetch>> {
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

  return fetch(`https://127.0.0.1:27124${path}`, requestOptions);
}
