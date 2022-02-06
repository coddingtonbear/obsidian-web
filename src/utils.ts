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
