import React, { useEffect, useState } from "react";

import compareVersions from "compare-versions";
import ReactDOM from "react-dom";
import Turndown from "turndown";
import { Readability } from "@mozilla/readability";

import Button from "@mui/material/Button";
import ThemeProvider from "@mui/system/ThemeProvider";
import IconButton from "@mui/material/IconButton";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import MaterialAlert from "@mui/material/Alert";
import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import Draggable from "react-draggable";

import SendIcon from "@mui/icons-material/SaveAlt";

import styles from "./styles.css";

import { DarkPurpleTheme } from "./theme";
import Alert from "./components/Alert";
import {
  AlertStatus,
  ExtensionLocalSettings,
  ExtensionSyncSettings,
  UrlOutputPreset,
  SearchJsonResponseItem,
  StatusResponse,
  ObsidianResponse,
  OutputPreset,
  PreviewContext,
  SearchJsonResponseItemWithMetadata,
  UrlMentionContainer,
} from "./types";
import {
  getLocalSettings,
  getSyncSettings,
  checkHasHostPermission,
  requestHostPermission,
  getWindowSelectionAsHtml,
  compileTemplateCallback,
  compileTemplateCallbackController,
} from "./utils";
import { getUrlMentions, obsidianRequest } from "./utils/requests";
import RequestParameters from "./components/RequestParameters";
import {
  CurrentMaxOnboardingVersion,
  TurndownConfiguration,
} from "./constants";
import MentionNotice from "./components/MentionNotice";
import { LinearProgress, NativeSelect, Paper } from "@mui/material";
import MouseOverChip from "./components/MouseOverChip";

declare const BUILD_ID: string;
declare global {
  interface Window {
    ObsidianWeb: {
      showPopUp: () => void;
      showPopUpMessage: () => void;
      hidePopUp: () => void;
      togglePopUp: () => void;
      destroyPopUp: () => void;
    };
  }
  interface WindowEventMap {
    "obsidian-web": CustomEvent;
  }
}

const ROOT_CONTAINER_ID = `obsidian-web-container-${BUILD_ID}`;

if (!document.getElementById(ROOT_CONTAINER_ID)) {
  function dispatchObsidianWebMessage(action: string, data?: any): void {
    const evt = new CustomEvent("obsidian-web", {
      detail: { action, data },
    });
    window.dispatchEvent(evt);
  }

  window.ObsidianWeb = {
    showPopUp: () => {
      dispatchObsidianWebMessage("show-popup");
    },
    showPopUpMessage: () => {
      dispatchObsidianWebMessage("show-popup-message");
    },
    hidePopUp: () => {
      dispatchObsidianWebMessage("hide-popup");
    },
    togglePopUp: () => {
      dispatchObsidianWebMessage("toggle-popup");
    },
    destroyPopUp: () => {
      dispatchObsidianWebMessage("destroy-popup");
    },
  };

  interface Props {
    sandbox: HTMLIFrameElement;
  }

  window.addEventListener("message", compileTemplateCallback, {
    signal: compileTemplateCallbackController.signal,
  });

  const Popup: React.FunctionComponent<Props> = ({ sandbox }) => {
    const [status, setStatus] = useState<AlertStatus>();

    const [sandboxReady, setSandboxReady] = useState<boolean>(false);
    const [obsidianUnavailable, setObsidianUnavailable] = useState<boolean>();

    const [host, setHost] = useState<string | null>(null);
    const [hasHostPermission, setHasHostPermission] = useState<boolean | null>(
      null
    );
    const [apiKey, setApiKey] = useState<string>();
    const [insecureMode, setInsecureMode] = useState<boolean>(false);

    const [suggestionAccepted, setSuggestionAccepted] =
      useState<boolean>(false);
    const [mentions, setMentions] = useState<SearchJsonResponseItem[]>([]);
    const [directReferences, setDirectReferences] = useState<
      SearchJsonResponseItemWithMetadata[]
    >([]);

    const [searchEnabled, setSearchEnabled] = useState<boolean>(false);
    const [searchMatchMentionTemplate, setSearchMatchMentionTemplate] =
      useState<OutputPreset>();
    const [searchMatchDirectTemplate, setSearchMatchDirectTemplate] =
      useState<OutputPreset>();
    const [searchMatchTemplate, setSearchMatchtemplate] =
      useState<UrlOutputPreset>();
    const [hoverEnabled, setHoverEnabled] = useState<boolean>(false);

    const [presets, setPresets] = useState<UrlOutputPreset[]>();
    const [selectedPresetIdx, setSelectedPresetIdx] = useState<number>(0);
    const [selectedPreset, setSelectedPreset] = useState<UrlOutputPreset>();

    const [formMethod, setFormMethod] =
      useState<UrlOutputPreset["method"]>("post");
    const [formUrl, setFormUrl] = useState<string>("");
    const [formHeaders, setFormHeaders] = useState<Record<string, any>>({});
    const [formContent, setFormContent] = useState<string>("");

    const [compiledUrl, setCompiledUrl] = useState<string>("");
    const [compiledContent, setCompiledContent] = useState<string>("");
    const [contentIsValid, setContentIsValid] = useState<boolean>(false);

    const [popupDisplayed, setPopupDisplayed] = useState<boolean>(false);
    const [popupFormDisplayed, setPopupFormDisplayed] =
      useState<boolean>(false);

    const [onboardedToVersion, setOnboardedToVersion] = useState<string>("");

    const [previewContextProcessing, setPreviewContextProcessing] =
      useState<boolean>(false);
    const [accordionIsExpanded, setAccordionIsExpanded] =
      useState<boolean>(false);
    const [pageUrl, setPageUrl] = useState<string>(window.location.href);

    const [displayState, setDisplayState] = useState<
      "welcome" | "form" | "error" | "loading" | "alert" | "permission"
    >("loading");

    const turndown = new Turndown(TurndownConfiguration);

    useEffect(() => {
      if (
        apiKey === undefined ||
        hasHostPermission === null ||
        obsidianUnavailable === undefined
      ) {
        setDisplayState("loading");
        return;
      }
      if (apiKey !== undefined && apiKey.length === 0) {
        setDisplayState("welcome");
        return;
      }
      if (hasHostPermission != null && !hasHostPermission) {
        setDisplayState("permission");
        return;
      }
      if (status) {
        setDisplayState("alert");
        return;
      }
      if (obsidianUnavailable) {
        setDisplayState("error");
        return;
      }
      setDisplayState("form");
    }, [status, apiKey, obsidianUnavailable, hasHostPermission]);

    useEffect(() => {
      if (!selectedPreset) {
        return;
      }

      setFormMethod(selectedPreset.method);
      setFormUrl(selectedPreset.urlTemplate);
      setFormHeaders(selectedPreset.headers);
      setFormContent(selectedPreset.contentTemplate);
    }, [selectedPreset]);

    const [mouseOverTarget, setMouseOverTarget] = useState<HTMLAnchorElement>();
    const [mousePosition, setMousePosition] =
      useState<{ x: number; y: number }>();
    const [mouseOverMentions, setMouseOverMentions] =
      useState<UrlMentionContainer>();

    const mouseOverHandler = (event: MouseEvent) => {
      if ((event.target as HTMLElement).tagName === "A") {
        setMouseOverTarget(event.target as HTMLAnchorElement);
        setMousePosition({
          x: event.clientX,
          y: event.clientY,
        });
        setMouseOverMentions(undefined);
        (event.target as HTMLElement).addEventListener("mouseout", (event) => {
          setMouseOverTarget(undefined);
          setMousePosition(undefined);
          setMouseOverMentions(undefined);
        });
      }
    };

    function handleEscapeKey(event: KeyboardEvent) {
      if (event.code === "Escape") {
        onFinished();
      }
    }

    useEffect(() => {
      async function handler() {
        if (
          mouseOverTarget &&
          mouseOverTarget.href &&
          window.location.href !== mouseOverTarget.href
        ) {
          const url = new URL(mouseOverTarget.href, window.location.href).href;
          const mentions = await getUrlMentions(url);
          setMouseOverMentions(mentions);
        }
      }

      handler();
    }, [mouseOverTarget]);

    useEffect(() => {
      if (hoverEnabled) {
        document.body.addEventListener("mouseover", mouseOverHandler);
        document.addEventListener("keydown", handleEscapeKey);
      }

      return () => {
        if (hoverEnabled) {
          document.body.removeEventListener("mouseover", mouseOverHandler);
          document.removeEventListener("keydown", handleEscapeKey);
        }
      };
    }, [hoverEnabled]);

    const onSandboxMessage = (message: MessageEvent<any>) => {
      if (
        message.data.source === "obsidian-web-sandbox" &&
        message.data.success === true
      ) {
        setSandboxReady(true);
      }
    };

    const onObsidianWebMessage = (evt: CustomEvent<any>) => {
      if (evt.detail.action === "show-popup") {
        setPopupDisplayed(true);
        setPopupFormDisplayed(true);
      } else if (evt.detail.action === "show-popup-message") {
        setPopupDisplayed(true);
      } else if (evt.detail.action === "hide-popup") {
        setPopupDisplayed(false);
      } else if (evt.detail.action === "toggle-popup") {
        setPopupFormDisplayed((value) => {
          setPopupDisplayed(!value);
          return !value;
        });
      } else if (evt.detail.action === "show-message") {
        setPopupDisplayed(true);
      } else {
        console.error("Obsidian Web received unexpected event!", evt);
      }
    };

    const handleUrlChange = (): void => {
      if (pageUrl !== window.location.href) {
        setPageUrl(window.location.href);
      }
    };

    useEffect(() => {
      window.addEventListener("message", onSandboxMessage);
      window.addEventListener("obsidian-web", onObsidianWebMessage);
      window.addEventListener("popstate", handleUrlChange);
      window.addEventListener("hashchange", handleUrlChange);

      const timer = window.setInterval(handleUrlChange, 1000);

      return () => {
        window.removeEventListener("message", onSandboxMessage);
        window.removeEventListener("obsidian-web", onObsidianWebMessage);
        window.removeEventListener("popstate", handleUrlChange);
        window.removeEventListener("hashchange", handleUrlChange);

        window.clearInterval(timer);
      };
    }, []);

    useEffect(() => {
      if (apiKey === undefined) {
        return;
      }

      async function handle() {
        try {
          if (!host) {
            throw new Error("No hostname configured");
          }

          const request = await obsidianRequest("/", { method: "get" });
          const jsonData = request.data;
          if (!jsonData) {
            setObsidianUnavailable(true);
            return;
          }

          const result = jsonData as StatusResponse;
          if (
            result.status === "OK" &&
            result.service.includes("Obsidian Local REST API")
          ) {
            setObsidianUnavailable(false);
          } else {
            setObsidianUnavailable(true);
          }
        } catch (e) {
          setObsidianUnavailable(true);
        }
      }
      handle();
    }, [apiKey]);

    useEffect(() => {
      async function handle() {
        let syncSettings: ExtensionSyncSettings;
        let localSettings: ExtensionLocalSettings;

        try {
          localSettings = await getLocalSettings(chrome.storage.local);
        } catch (e) {
          setStatus({
            severity: "error",
            title: "Error",
            message: "Could not get local settings!",
          });
          return;
        }

        try {
          syncSettings = await getSyncSettings(chrome.storage.sync);
          setPresets(syncSettings.presets);
        } catch (e) {
          setStatus({
            severity: "error",
            title: "Error",
            message: "Could not get settings!",
          });
          return;
        }

        setHost(localSettings.host);
        setInsecureMode(localSettings.insecureMode ?? false);
        setApiKey(localSettings.apiKey);
        setSearchEnabled(syncSettings.searchMatch.enabled);
        if (syncSettings.searchMatch.mentions.suggestionEnabled) {
          setSearchMatchMentionTemplate(
            syncSettings.searchMatch.mentions.template
          );
        } else {
          setSearchMatchMentionTemplate(undefined);
        }
        if (syncSettings.searchMatch.direct.suggestionEnabled) {
          setSearchMatchDirectTemplate(
            syncSettings.searchMatch.direct.template
          );
        } else {
          setSearchMatchDirectTemplate(undefined);
        }
        if (syncSettings.searchMatch.enabled) {
          setHoverEnabled(syncSettings.searchMatch.hoverEnabled);
        } else {
          setHoverEnabled(false);
        }
        setOnboardedToVersion(syncSettings.onboardedToVersion);
      }
      handle();
    }, []);

    useEffect(() => {
      if (host) {
        checkHasHostPermission(host).then((hasPermission) => {
          setHasHostPermission(hasPermission);
        });
      }
    }, [host]);

    const [previewContext, setPreviewContext] =
      React.useState<Record<string, any>>();

    function preventBrowserFromStealingKeypress(event: KeyboardEvent) {
      if (event.code !== "Escape") {
        event.stopPropagation();
      }
    }

    useEffect(() => {
      if (popupFormDisplayed && !accordionIsExpanded) {
        updatePreviewContext();
        document.addEventListener(
          "keydown",
          preventBrowserFromStealingKeypress,
          true
        );
      } else {
        document.removeEventListener(
          "keydown",
          preventBrowserFromStealingKeypress,
          true
        );
      }
      return () => {
        document.removeEventListener(
          "keydown",
          preventBrowserFromStealingKeypress,
          true
        );
      };
    }, [popupFormDisplayed, accordionIsExpanded, pageUrl]);

    async function updatePreviewContext(): Promise<void> {
      setPreviewContextProcessing(true);
      let selectedText: string;
      try {
        const selectionReadability = htmlToReadabilityData(
          getWindowSelectionAsHtml(),
          window.document.location.href
        );
        selectedText = readabilityDataToMarkdown(selectionReadability);
      } catch (e) {
        selectedText = "";
      }

      const newPreviewContext: PreviewContext = {
        page: {
          url: window.document.location.href ?? "",
          title: window.document.title ?? "",
          selectedText: selectedText,
          content: "",
        },
        article: {},
      };

      try {
        const pageReadability = htmlToReadabilityData(
          window.document.body.innerHTML,
          window.document.location.href
        );
        if (pageReadability) {
          newPreviewContext.article = {
            title: pageReadability.title,
            length: pageReadability.length,
            excerpt: pageReadability.excerpt,
            byline: pageReadability.byline,
            dir: pageReadability.dir,
            siteName: pageReadability.siteName,
          };
        } else {
          newPreviewContext.article = {};
        }
        newPreviewContext.page.content =
          readabilityDataToMarkdown(pageReadability);
      } catch (e) {}

      setPreviewContext(newPreviewContext);
      setPreviewContextProcessing(false);
    }

    useEffect(() => {
      if (!searchEnabled || !popupDisplayed) {
        return;
      }

      async function handle() {
        if (!host) {
          return;
        }
        const allMentions = await getUrlMentions(window.location.href);

        setMentions(allMentions.mentions);
        setDirectReferences(allMentions.direct);
        if (allMentions.count === 0) {
          if (popupDisplayed && !popupFormDisplayed) {
            setPopupDisplayed(false);
          }
        }
      }

      handle();
    }, [pageUrl, searchEnabled, popupDisplayed]);

    useEffect(() => {
      if (!sandboxReady || presets === undefined) {
        return;
      }
      let preset: UrlOutputPreset;
      if (selectedPresetIdx === -2 && searchMatchTemplate) {
        preset = searchMatchTemplate;
      } else {
        preset = presets[selectedPresetIdx];
      }

      setSelectedPreset(preset);
    }, [sandboxReady, presets, selectedPresetIdx]);

    const htmlToReadabilityData = (
      html: string,
      baseUrl: string
    ): ReturnType<Readability["parse"]> => {
      const tempDoc = document.implementation.createHTMLDocument();
      const base = tempDoc.createElement("base");
      base.href = baseUrl;
      tempDoc.head.append(base);
      tempDoc.body.innerHTML = html;
      const reader = new Readability(tempDoc);
      return reader.parse();
    };

    const readabilityDataToMarkdown = (
      data: ReturnType<Readability["parse"]>
    ): string => {
      if (data) {
        return turndown.turndown(data.content);
      }
      return "";
    };

    const sendToObsidian = async () => {
      const requestHeaders = {
        ...formHeaders,
        "Content-Type": "text/markdown",
      };
      const request: RequestInit = {
        method: formMethod,
        body: compiledContent,
        headers: requestHeaders,
      };
      let result: ObsidianResponse;

      if (host === null) {
        console.error("Cannot send to Obsidian; no hostname set.");
        return;
      }

      try {
        result = await obsidianRequest(compiledUrl, request);
      } catch (e) {
        setStatus({
          severity: "error",
          title: "Error",
          message: `Could not send content to Obsidian: ${e}`,
        });
        return;
      }

      if (result.status < 300) {
        setStatus({
          severity: "success",
          title: "All done!",
          message: "Your content was sent to Obsidian successfully.",
        });
        setTimeout(() => onFinished(), 1500);
      } else {
        try {
          const body = result.data ?? {};
          setStatus({
            severity: "error",
            title: "Error",
            message: `Could not send content to Obsidian: (Error Code ${body.errorCode}) ${body.message}`,
          });
        } catch (e) {
          setStatus({
            severity: "error",
            title: "Error",
            message: `Could not send content to Obsidian!: (Status Code ${result.status}) ${result.data}`,
          });
        }
      }
    };

    const acceptSuggestion = async (
      filename: string,
      template: OutputPreset
    ) => {
      if (presets === undefined) {
        throw new Error(
          "Unexpectedly had no presets when accepting suggestion"
        );
      }
      setPopupFormDisplayed(true);
      setSearchMatchtemplate({
        name: "",
        urlTemplate: `/vault/${filename}`,
        method: template.method,
        headers: template.headers,
        contentTemplate: template.contentTemplate,
      });
      setSelectedPresetIdx(-2);

      setSuggestionAccepted(true);
    };

    const onFinished = () => {
      setPopupFormDisplayed(false);
      setPopupDisplayed(false);
      setStatus(undefined);
    };

    return (
      <ThemeProvider theme={DarkPurpleTheme}>
        {mouseOverTarget &&
          mousePosition &&
          mouseOverMentions &&
          mouseOverMentions.count > 0 && (
            <MouseOverChip
              mousePosition={mousePosition}
              mentions={mouseOverMentions}
            />
          )}
        <div
          className="obsidian-web-popup"
          title="Double-click to dismiss"
          onDoubleClick={() => onFinished()}
        >
          {popupDisplayed && (
            <Draggable handle=".drag-handle">
              <div className="popup">
                <div className="drag-handle"></div>
                <Paper
                  onClick={(evt) => {
                    evt.stopPropagation();
                  }}
                >
                  {onboardedToVersion &&
                    compareVersions(onboardedToVersion, "0.0") > 0 &&
                    compareVersions(
                      onboardedToVersion,
                      CurrentMaxOnboardingVersion
                    ) < 0 && (
                      <MaterialAlert severity="success">
                        <p className="popup-text">
                          New features were added as part of the latest version
                          of Obsidian Web that make it even more useful!
                        </p>
                        <div className="submit">
                          <Button
                            target="_blank"
                            variant="contained"
                            href={`chrome-extension://${chrome.runtime.id}/options.html`}
                          >
                            See what's new (opens new window)
                          </Button>
                        </div>
                      </MaterialAlert>
                    )}
                  {displayState === "welcome" && (
                    <>
                      <MaterialAlert severity="success">
                        <p className="popup-text">
                          Thanks for installing Obsidian Web! Obsidian Web needs
                          some information from you before it can connect to
                          your Obsidian instance.
                        </p>
                        <div className="submit">
                          <Button
                            target="_blank"
                            variant="contained"
                            href={`chrome-extension://${chrome.runtime.id}/options.html`}
                          >
                            Go to settings
                          </Button>
                        </div>
                      </MaterialAlert>
                    </>
                  )}
                  {displayState === "permission" && host && (
                    <MaterialAlert severity="warning" style={{ flexGrow: 1 }}>
                      <p className="popup-text">
                        Obsidian Web needs permission to access Obsidian on '
                        {host}
                        '.
                      </p>
                      <div className="submit">
                        <Button
                          target="_blank"
                          variant="outlined"
                          href={`chrome-extension://${chrome.runtime.id}/options.html`}
                        >
                          Go to settings
                        </Button>
                        <Button
                          variant="contained"
                          onClick={() =>
                            requestHostPermission(host).then((result) => {
                              setHasHostPermission(result);
                            })
                          }
                        >
                          Grant
                        </Button>
                      </div>
                    </MaterialAlert>
                  )}
                  {displayState === "alert" && status && (
                    <Alert value={status} />
                  )}
                  {displayState === "error" && (
                    <MaterialAlert severity="error">
                      <p className="popup-text">
                        Could not connect to Obsidian! Make sure Obsidian is
                        running and that the Obsidian Local REST API plugin is
                        enabled.
                      </p>
                      <div className="submit">
                        <Button
                          target="_blank"
                          variant="outlined"
                          href={`chrome-extension://${chrome.runtime.id}/options.html`}
                        >
                          Go to settings
                        </Button>
                      </div>
                    </MaterialAlert>
                  )}
                  {displayState === "loading" && (
                    <div className="loading">
                      {" "}
                      <LinearProgress />
                    </div>
                  )}
                  {displayState === "form" && (
                    <>
                      {host && (
                        <>
                          {(mentions.length > 0 ||
                            directReferences.length > 0) && (
                            <div className="mentions">
                              {directReferences.map((ref) => (
                                <MentionNotice
                                  key={ref.filename}
                                  type="direct"
                                  templateSuggestion={searchMatchDirectTemplate}
                                  mention={ref}
                                  acceptSuggestion={acceptSuggestion}
                                />
                              ))}
                              {mentions
                                .filter(
                                  (ref) =>
                                    !directReferences.find(
                                      (d) => d.filename === ref.filename
                                    )
                                )
                                .map((ref) => (
                                  <MentionNotice
                                    key={ref.filename}
                                    type="mention"
                                    templateSuggestion={
                                      searchMatchMentionTemplate
                                    }
                                    mention={ref}
                                    acceptSuggestion={acceptSuggestion}
                                  />
                                ))}
                            </div>
                          )}
                        </>
                      )}
                      {popupFormDisplayed && (
                        <>
                          {(previewContextProcessing || !previewContext) && (
                            <LinearProgress />
                          )}
                          <div className="option">
                            <div className="option-value">
                              <NativeSelect
                                autoFocus={true}
                                className="preset-selector"
                                value={selectedPresetIdx}
                                fullWidth={true}
                                onChange={(event) =>
                                  setSelectedPresetIdx(
                                    typeof event.target.value === "number"
                                      ? event.target.value
                                      : parseInt(event.target.value, 10)
                                  )
                                }
                              >
                                {suggestionAccepted && searchMatchTemplate && (
                                  <option key={"___suggestion"} value={-2}>
                                    [Suggested Template]
                                  </option>
                                )}
                                {presets &&
                                  presets.map((preset, idx) => (
                                    <option key={preset.name} value={idx}>
                                      {preset.name}
                                    </option>
                                  ))}
                              </NativeSelect>
                              <IconButton
                                className="send-to-obsidian"
                                color="primary"
                                size="large"
                                disabled={!contentIsValid || !previewContext}
                                onClick={sendToObsidian}
                                title="Send to Obsidian"
                              >
                                <SendIcon className="send-to-obsidian-icon" />
                              </IconButton>
                            </div>
                          </div>
                          <Accordion
                            onChange={(evt, expanded) => {
                              setAccordionIsExpanded(expanded);
                            }}
                          >
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                              <p>View Request Details</p>
                            </AccordionSummary>
                            <AccordionDetails>
                              <RequestParameters
                                method={formMethod}
                                url={formUrl}
                                sandbox={sandbox}
                                headers={formHeaders}
                                previewContext={previewContext ?? {}}
                                content={formContent}
                                onChangeMethod={setFormMethod}
                                onChangeUrl={setFormUrl}
                                onChangeHeaders={setFormHeaders}
                                onChangeContent={setFormContent}
                                onChangeIsValid={setContentIsValid}
                                onChangeRenderedContent={setCompiledContent}
                                onChangeRenderedUrl={setCompiledUrl}
                                showCrystalizeOption={true}
                              />
                            </AccordionDetails>
                          </Accordion>
                        </>
                      )}
                      {!popupFormDisplayed && (
                        <IconButton
                          onClick={() => setPopupFormDisplayed(true)}
                          className="show-form-cta"
                          aria-label="Show form"
                          title="Show form"
                        >
                          <SendIcon />
                        </IconButton>
                      )}
                    </>
                  )}
                </Paper>
              </div>
            </Draggable>
          )}
        </div>
      </ThemeProvider>
    );
  };

  const root = document.createElement("div");
  root.id = ROOT_CONTAINER_ID;
  const shadowContainer = root.attachShadow({ mode: "open" });

  const styleResetRoot = document.createElement("style");
  styleResetRoot.innerHTML = ":host {all: initial}";
  shadowContainer.appendChild(styleResetRoot);

  const popupRoot = document.createElement("div");
  shadowContainer.appendChild(popupRoot);

  const emotionRoot = document.createElement("div");
  shadowContainer.appendChild(emotionRoot);

  const stylesRoot = document.createElement("style");
  stylesRoot.innerHTML = styles;
  shadowContainer.appendChild(stylesRoot);

  const sandbox = document.createElement("iframe");
  sandbox.id = "handlebars-sandbox";
  sandbox.src = chrome.runtime.getURL("handlebars.html");
  sandbox.hidden = true;
  shadowContainer.appendChild(sandbox);

  const cache = createCache({
    key: "obsidian-web",
    prepend: true,
    container: emotionRoot,
  });

  document.body.prepend(root);

  ReactDOM.render(
    <React.StrictMode>
      <CacheProvider value={cache}>
        {/* Allows us to be sure we're positioned far above the page zIndex" */}
        <div style={{ position: "relative", zIndex: "999999999" }}>
          <Popup sandbox={sandbox} />
        </div>
      </CacheProvider>
    </React.StrictMode>,
    popupRoot
  );
}
