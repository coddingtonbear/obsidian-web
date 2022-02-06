import { ExtensionSettings } from "./types";

const DefaultSettings = {
  version: "0.1",
  apiKey: "",
  presets: [
    {
      name: "Append to daily note",
      urlTemplate: "/periodic/daily/",
      contentTemplate:
        "## {{ page.title }}\nURL: {{ page.url }}\n\n> {{ page.selectedText }}\n\n",
      headers: {},
      method: "post",
    },
    {
      name: "Create new note",
      urlTemplate: "/vault/{{ page.title }}.md",
      contentTemplate:
        "---\npage-title: {{ page.title }}\nurl: {{ page.url }}\n---\n\n> {{ page.selectedText }}\n\n",
      headers: {},
      method: "put",
    },
  ],
};

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
