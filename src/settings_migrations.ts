import { DefaultSearchMatchTemplate } from "./constants";
import {
  ExtensionLocalSettings,
  ExtensionSyncSettings,
  ExtensionSyncSettings__0_1,
  ExtensionSyncSettings__0_2,
} from "./types";

import cloneDeep from "clone-deep";

export async function migrateLocalSettings(
  local: chrome.storage.LocalStorageArea,
  settings: Record<string, any>
): Promise<ExtensionLocalSettings> {
  if (settings.version == "0.2") {
    // In ac0b804b634fded00363f38e996068dcd42ec68e and before, we
    // were erroneously setting the sync version to 2.0 in options.tsx;
    // and having two different version numbers for sync/local that
    // were 0.2 and 2.0 was going to be confusing -- let's just bump
    // them both together to 2.0.
    settings.version = "2.0";
    await local.clear();
    await local.set(settings);
  }
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
    const newSettings: ExtensionSyncSettings__0_2 = {
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
    settings.showOnboarding = true;
  }
  if (settings.version == "0.2") {
    // In ac0b804b634fded00363f38e996068dcd42ec68e and before, we
    // were erroneously setting the sync version to 2.0 in options.tsx;
    // so we need to just bump the version number up.
    settings.version = "2.0";
    await sync.clear();
    await sync.set(settings);
    settings.showOnboarding = true;
  }
  if (settings.version == "2.0") {
    settings.showOnboarding = true;
    settings.searchMatch.autoOpen = "never";
    settings.version = "2.1";
  }
  return settings as ExtensionSyncSettings;
}
