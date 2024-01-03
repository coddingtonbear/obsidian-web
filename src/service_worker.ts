import { _getUrlMentions, getLocalSettings, _obsidianRequest } from "./utils";
import {
  BackgroundRequest,
  ExtensionLocalSettings,
  ObsidianResponse,
  ObsidianResponseError,
} from "./types";

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  const settings: ExtensionLocalSettings = await getLocalSettings(
    chrome.storage.local
  );
  const url = tab.url;

  if (
    !settings ||
    !settings.host ||
    !settings.apiKey ||
    !url ||
    changeInfo.status !== "loading"
  ) {
    return;
  }

  try {
    const mentions = await _getUrlMentions(
      settings.host,
      settings.apiKey,
      Boolean(settings.insecureMode),
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
      chrome.action.setTitle({
        title: `${mentions.direct.length} mentions`,
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
      chrome.action.setTitle({
        title: `${mentions.mentions.length} mentions`,
        tabId,
      });
    } else {
      chrome.action.setBadgeText({
        text: "",
        tabId,
      });
      chrome.action.setTitle({
        title: "",
        tabId,
      });
    }

    for (const mention of mentions.direct) {
      const mentionData = await _obsidianRequest(
        settings.host,
        settings.apiKey,
        `/vault/${mention.filename}`,
        {
          method: "get",
          headers: {
            Accept: "application/vnd.olrapi.note+json",
          },
        },
        Boolean(settings.insecureMode)
      );
      const result = (await mentionData.json()) ?? {};

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
        chrome.action.setTitle({
          title: result.frontmatter["web-badge-message"],
          tabId,
        });
      }
    }
  } catch (e) {
    chrome.action.setBadgeBackgroundColor({
      color: "#FF0000",
      tabId,
    });
    chrome.action.setBadgeText({
      text: "ERR",
      tabId,
    });
    console.error(e);
  }
});

chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ["js/vendor.js", "js/popup.js"],
    });
  } else {
    console.error("No tab ID found when attempting to inject into tab", tab);
  }
});

chrome.runtime.onMessage.addListener(
  (message: BackgroundRequest, sender, sendResponse) => {
    console.log("Received background request", message, sender);
    if (message.type === "check-has-host-permission") {
      chrome.permissions.contains(
        {
          origins: [
            `http://${message.host}:27123/*`,
            `https://${message.host}:27124/*`,
          ],
        },
        (result) => {
          sendResponse(result);
        }
      );
    } else if (message.type === "request-host-permission") {
      chrome.permissions.request(
        {
          origins: [
            `http://${message.host}:27123/*`,
            `https://${message.host}:27124/*`,
          ],
        },
        (result) => {
          sendResponse(result);
        }
      );
    } else if (message.type === "check-keyboard-shortcut") {
      chrome.commands.getAll((commands) => {
        for (const command of commands) {
          if (command.name === "_execute_action") {
            sendResponse(command.shortcut);
          }
        }
      });
    } else if (message.type === "obsidian-request") {
      getLocalSettings(chrome.storage.local).then((settings) => {
        _obsidianRequest(
          settings.host,
          settings.apiKey,
          message.request.path,
          message.request.options,
          Boolean(settings.insecureMode)
        )
          .then((response) => {
            console.log("Response received", response);

            const result: Partial<ObsidianResponse> = {
              status: response.status,
            };

            result.headers = {};
            for (const [name, value] of response.headers.entries()) {
              result.headers[name] = value;
            }

            response
              .json()
              .then((data) => {
                result.ok = true;
                result.data = data;
                sendResponse(result as ObsidianResponse);
              })
              .catch((error) => {
                sendResponse({
                  ok: false,
                  error: error.toString(),
                } as ObsidianResponseError);
              });
          })
          .catch((e) => {
            sendResponse({
              ok: false,
              error: e.toString(),
            } as ObsidianResponseError);
          });
      });
    }

    return true;
  }
);
