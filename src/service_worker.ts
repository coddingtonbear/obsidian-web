import { getUrlMentions, getLocalSettings, obsidianRequest } from "./utils";
import { ExtensionLocalSettings } from "./types";

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  const localSettings: ExtensionLocalSettings = await getLocalSettings(
    chrome.storage.local
  );
  const url = tab.url;

  if (
    !localSettings ||
    !localSettings.apiKey ||
    !url ||
    changeInfo.status !== "loading"
  ) {
    return;
  }

  try {
    const mentions = await getUrlMentions(
      localSettings.apiKey,
      localSettings.insecureMode || false,
      url
    );

    if (mentions.direct.length > 0) {
      chrome.action.setBadgeBackgroundColor({
        color: "#A68B36",
        tabId,
      });
      chrome.action.setBadgeText({
        text: `${mentions.direct.length}`,
        tabId,
      });
    } else if (mentions.mentions.length > 0) {
      chrome.action.setBadgeBackgroundColor({
        color: "#3D7D98",
        tabId,
      });
      chrome.action.setBadgeText({
        text: `${mentions.mentions.length}`,
        tabId,
      });
    } else {
      chrome.action.setBadgeText({
        text: "",
        tabId,
      });
    }

    for (const mention of mentions.direct) {
      const mentionData = await obsidianRequest(
        localSettings.apiKey,
        `/vault/${mention.filename}`,
        {
          method: "get",
          headers: {
            Accept: "application/vnd.olrapi.note+json",
          },
        },
        localSettings.insecureMode || false
      );
      const result = await mentionData.json();

      if (result.frontmatter["web-badge-color"]) {
        chrome.action.setBadgeBackgroundColor({
          color: result.frontmatter["web-badge-color"],
          tabId,
        });
      }
      if (result.frontmatter["web-badge-message"]) {
        chrome.action.setBadgeText({
          text: result.frontmatter["web-badge-message"],
          tabId,
        });
      }
    }
  } catch (e) {
    chrome.action.setBadgeText({
      text: "ERR",
    });
    console.error(e);
  }
});
