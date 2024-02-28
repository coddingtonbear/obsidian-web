import { getLocalSettings, getSyncSettings } from "./utils";
import { _obsidianRequest, _getUrlMentions } from "./utils/private_requests";
import {
  BackgroundRequest,
  LogEntry,
  ExtensionLocalSettings,
  ObsidianResponse,
  ObsidianResponseError,
  ExtensionSyncSettings,
} from "./types";
import { MaximumErrorLogLength } from "./constants";

const logEntries: LogEntry[] = [];

function log(errorLogItem: Partial<LogEntry>): number {
  console[errorLogItem.level ?? "log"](
    errorLogItem.message ?? "",
    errorLogItem.data
  );

  if (
    logEntries.push({
      date: new Date().toISOString(),
      level: errorLogItem.level ?? "log",
      message: errorLogItem.message ?? "",
      data: errorLogItem.data ?? null,
      stack: errorLogItem.stack ?? null,
    }) > MaximumErrorLogLength
  ) {
    logEntries.shift();
  }

  return logEntries.length;
}

function injectScript(tabId: number, func: () => void) {
  chrome.scripting
    .executeScript({
      target: { tabId },
      files: ["js/vendor.js", "js/popup.js"],
    })
    .then(() => {
      chrome.scripting.executeScript({
        target: {
          tabId,
        },
        func,
      });
    });
}

chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  const settings: ExtensionLocalSettings = await getLocalSettings(
    chrome.storage.local
  );
  const syncSettings: ExtensionSyncSettings = await getSyncSettings(
    chrome.storage.sync
  );
  const url = tab.url;

  if (
    !settings ||
    !settings.host ||
    !settings.apiKey ||
    !syncSettings.searchMatch.backgroundEnabled ||
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

    if (mentions.count > 0) {
      chrome.action.setBadgeText({
        text: `${mentions.count}`,
        tabId,
      });
      chrome.action.setTitle({
        title: `${mentions.count} mentions`,
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

    if (mentions.direct.length > 0) {
      chrome.action.setBadgeBackgroundColor({
        color: "#A68B36",
        tabId,
      });
    } else if (mentions.mentions.length > 0) {
      chrome.action.setBadgeBackgroundColor({
        color: "#3D7D98",
        tabId,
      });
    }

    if (
      syncSettings.searchMatch.autoOpen === "direct-message" &&
      mentions.direct.length > 0 &&
      mentions.direct.filter((match) => match.meta.frontmatter["web-message"])
        .length > 0
    ) {
      injectScript(tabId, () => window.ObsidianWeb.showPopUpMessage());
    } else if (
      syncSettings.searchMatch.autoOpen === "direct" &&
      mentions.direct.length > 0
    ) {
      injectScript(tabId, () => window.ObsidianWeb.showPopUpMessage());
    } else if (
      syncSettings.searchMatch.autoOpen === "mention" &&
      mentions.count > 0 // Any direct or mention is sufficient
    ) {
      injectScript(tabId, () => window.ObsidianWeb.showPopUpMessage());
    } else if (syncSettings.searchMatch.hoverEnabled) {
      injectScript(tabId, () => {});
    }

    console.log("Processing pageview");
    for (const mention of mentions.direct) {
      console.log("Looking at direct mentions");
      if (typeof mention.meta.frontmatter["web-badge-color"] === "string") {
        chrome.action.setBadgeBackgroundColor({
          color: mention.meta.frontmatter["web-badge-color"],
          tabId,
        });
      }
      if (typeof mention.meta.frontmatter["web-badge-message"] === "string") {
        chrome.action.setBadgeText({
          text: mention.meta.frontmatter["web-badge-message"],
          tabId,
        });
        chrome.action.setTitle({
          title: mention.meta.frontmatter["web-badge-message"],
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
    chrome.action.setTitle({
      title: `ERR: ${e}`,
      tabId,
    });
    log(e as Error);
    console.error(e);
  }
});

chrome.action.onClicked.addListener((tab) => {
  if (tab.id) {
    injectScript(tab.id, () => {
      window.ObsidianWeb.togglePopUp();
    });
  } else {
    console.error("No tab ID found when attempting to inject into tab", tab);
  }
});

chrome.runtime.onMessage.addListener(
  (message: BackgroundRequest, sender, sendResponse) => {
    log({
      message: `Incoming ${message.type} background request`,
      data: {
        sender,
        message,
      },
    });
    switch (message.type) {
      case "check-has-host-permission":
        chrome.permissions.contains(
          {
            origins: [
              `http://${message.host}:27123/*`,
              `https://${message.host}:27124/*`,
            ],
          },
          (result) => {
            log({ message: "check-has-host-permission result", data: result });
            sendResponse(result);
          }
        );
        break;
      case "request-host-permission":
        chrome.permissions.request(
          {
            origins: [
              `http://${message.host}:27123/*`,
              `https://${message.host}:27124/*`,
            ],
          },
          (result) => {
            log({
              message: "request-host-permission result",
              data: result,
            });
            sendResponse(result);
          }
        );
        break;
      case "check-keyboard-shortcut":
        chrome.commands.getAll((commands) => {
          for (const command of commands) {
            if (command.name === "_execute_action") {
              sendResponse(command.shortcut);
              log({
                message: "check-keyboard-shortcut result",
                data: command.shortcut,
              });
            }
          }
        });
        break;
      case "obsidian-request":
        getLocalSettings(chrome.storage.local).then((settings) => {
          _obsidianRequest(
            settings.host,
            settings.apiKey,
            message.request.path,
            message.request.options,
            Boolean(settings.insecureMode)
          )
            .then((response) => {
              const result: Partial<ObsidianResponse> = {
                status: response.status,
              };

              result.headers = {};
              for (const [name, value] of response.headers.entries()) {
                result.headers[name] = value;
              }

              response
                .text()
                .then((text) => {
                  let jsonData;
                  result.ok = true;
                  try {
                    jsonData = JSON.parse(text);
                    result.data = jsonData;
                  } catch (e) {}
                  sendResponse(result as ObsidianResponse);

                  log({
                    message: "obsidian-request response parsed",
                    data: {
                      request: {
                        path: message.request.path,
                        options: message.request.options,
                      },
                      response: {
                        status: response.status,
                        json: jsonData,
                        text,
                      },
                    },
                  });
                })
                .catch((error) => {
                  log({
                    message: "obsidian-request request failed to parse",
                    data: {
                      request: {
                        path: message.request.path,
                        options: message.request.options,
                      },
                      response: {
                        status: response.status,
                        text: response.text,
                      },
                      error,
                    },
                  });
                  sendResponse({
                    ok: false,
                    error: error.toString(),
                  } as ObsidianResponseError);
                });
            })
            .catch((e) => {
              log({
                message: "obsidian-request request failed",
                data: {
                  request: {
                    path: message.request.path,
                    options: message.request.options,
                  },
                  error: e,
                },
              });
              sendResponse({
                ok: false,
                error: e.toString(),
              } as ObsidianResponseError);
            });
        });
        break;
      case "background-error-log":
        sendResponse(logEntries);
        break;
    }

    return true;
  }
);
