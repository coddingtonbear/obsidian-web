import { DefaultSearchMatchTemplate } from "./constants";
import {
  ExtensionLocalSettings,
  ExtensionSyncSettings,
  ExtensionSyncSettings__0_1,
} from "./types";

import cloneDeep from "clone-deep";

export async function migrateLocalSettings(
  local: chrome.storage.LocalStorageArea,
  settings: Record<string, any>
): Promise<ExtensionLocalSettings> {
  return settings as ExtensionLocalSettings;
}

export async function migrateSyncSettings(
  sync: chrome.storage.SyncStorageArea,
  settings: Record<string, any>
): Promise<ExtensionSyncSettings> {
  if (settings.version === "0.1") {
    const oldSettings = cloneDeep(settings) as ExtensionSyncSettings__0_1;
    const mentionTemplate = oldSettings.presets.find(
      (preset) => preset.name === oldSettings.searchMatchMentionTemplate
    );
    const directTemplate = oldSettings.presets.find(
      (preset) => preset.name === oldSettings.searchMatchDirectTemplate
    );
    const newSettings: ExtensionSyncSettings = {
      version: "0.2",
      presets: oldSettings.presets,
      searchMatch: {
        enabled: Boolean(oldSettings.searchEnabled),
        backgroundEnabled: Boolean(oldSettings.searchBackgroundEnabled),
        mentions: {
          suggestionEnabled: Boolean(oldSettings.searchMatchMentionTemplate),
          template: mentionTemplate
            ? {
                contentTemplate: mentionTemplate.contentTemplate,
                headers: mentionTemplate.headers,
                method: mentionTemplate.method,
              }
            : DefaultSearchMatchTemplate,
        },
        direct: {
          suggestionEnabled: Boolean(oldSettings.searchMatchDirectTemplate),
          template: directTemplate
            ? {
                contentTemplate: directTemplate.contentTemplate,
                headers: directTemplate.headers,
                method: directTemplate.method,
              }
            : DefaultSearchMatchTemplate,
        },
      },
    };
    await sync.clear();
    await sync.set(newSettings);
    settings = newSettings;
  }
  return settings as ExtensionSyncSettings;
}
