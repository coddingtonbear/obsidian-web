import React, { useEffect, useState } from "react";

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
import CircularProgress from "@mui/material/CircularProgress";
import MaterialAlert from "@mui/material/Alert";
import createCache from "@emotion/cache";
import { CacheProvider } from "@emotion/react";
import Draggable from "react-draggable";

import SendIcon from "@mui/icons-material/SaveAlt";
import CancelIcon from "@mui/icons-material/Cancel";

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
  OutputPreset,
  PreviewContext,
} from "./types";
import {
  getLocalSettings,
  getSyncSettings,
  obsidianRequest,
  getUrlMentions,
  getPageMetadata,
  checkHasHostPermission,
  requestHostPermission,
  getWindowSelectionAsHtml,
  unregisterCompileTemplateCallback,
} from "./utils";
import RequestParameters from "./components/RequestParameters";
import { TurndownConfiguration } from "./constants";
import MentionNotice from "./components/MentionNotice";
import { NativeSelect, Paper } from "@mui/material";

const ROOT_CONTAINER_ID = "obsidian-web-container";

export interface Props {
  sandbox: HTMLIFrameElement;
}

const Popup: React.FunctionComponent<Props> = ({ sandbox }) => {
  const [status, setStatus] = useState<AlertStatus>();

  const [sandboxReady, setSandboxReady] = useState<boolean>(false);
  const [obsidianUnavailable, setObsidianUnavailable] =
    useState<boolean>(false);

  const [previewContext, setPreviewContext] = useState<PreviewContext>();

  const [host, setHost] = useState<string | null>(null);
  const [hasHostPermission, setHasHostPermission] = useState<boolean | null>(
    null
  );
  const [apiKey, setApiKey] = useState<string>("");
  const [insecureMode, setInsecureMode] = useState<boolean>(false);

  const [suggestionAccepted, setSuggestionAccepted] = useState<boolean>(false);
  const [mentions, setMentions] = useState<SearchJsonResponseItem[]>([]);
  const [directReferences, setDirectReferences] = useState<
    SearchJsonResponseItem[]
  >([]);
  const [directReferenceMessages, setDirectReferenceMessages] = useState<
    string[]
  >([]);

  const [searchEnabled, setSearchEnabled] = useState<boolean>(false);
  const [searchMatchMentionTemplate, setSearchMatchMentionTemplate] =
    useState<OutputPreset>();
  const [searchMatchDirectTemplate, setSearchMatchDirectTemplate] =
    useState<OutputPreset>();
  const [searchMatchTemplate, setSearchMatchtemplate] =
    useState<UrlOutputPreset>();

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

  const [displayState, setDisplayState] = useState<
    "welcome" | "form" | "error" | "loading" | "alert" | "permission"
  >("loading");

  const turndown = new Turndown(TurndownConfiguration);

  useEffect(() => {
    if (apiKey.length === 0) {
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

  useEffect(() => {
    window.addEventListener("message", (message) => {
      if (
        message.data.source === "obsidian-web-sandbox" &&
        message.data.success === true
      ) {
        setSandboxReady(true);
      }
    });
  }, []);

  useEffect(() => {
    if (!apiKey) {
      return;
    }

    async function handle() {
      try {
        if (!host) {
          throw new Error("No hostname configured");
        }

        const request = await obsidianRequest(
          host,
          apiKey,
          "/",
          { method: "get" },
          insecureMode
        );
        const result: StatusResponse = await request.json();
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
      setSearchMatchMentionTemplate(syncSettings.searchMatch.mentions.template);
      setSearchMatchDirectTemplate(syncSettings.searchMatch.direct.template);
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

  useEffect(() => {
    async function handle() {
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

      const previewContext: PreviewContext = {
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
          previewContext.article = {
            title: pageReadability.title,
            length: pageReadability.length,
            excerpt: pageReadability.excerpt,
            byline: pageReadability.byline,
            dir: pageReadability.dir,
            siteName: pageReadability.siteName,
          };
        } else {
          previewContext.article = {};
        }
        previewContext.page.content =
          readabilityDataToMarkdown(pageReadability);
      } catch (e) {}

      setPreviewContext(previewContext);
    }
    handle();
  }, []);

  useEffect(() => {
    setDirectReferenceMessages([]);

    async function handle() {
      const messages: string[] = [];

      if (!host) {
        return;
      }

      for (const ref of directReferences) {
        const meta = await getPageMetadata(
          host,
          apiKey,
          insecureMode,
          ref.filename
        );

        if (typeof meta.frontmatter["web-badge-message"] === "string") {
          messages.push(meta.frontmatter["web-badge-message"]);
        }
      }

      setDirectReferenceMessages(messages);
    }

    handle();
  }, [directReferences]);

  useEffect(() => {
    if (!searchEnabled) {
      return;
    }

    async function handle() {
      if (!host) {
        return;
      }
      const allMentions = await getUrlMentions(
        host,
        apiKey,
        insecureMode,
        window.location.href
      );

      setMentions(allMentions.mentions);
      setDirectReferences(allMentions.direct);
    }

    handle();
  }, [window.location.href, searchEnabled]);

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
    let result: Response;

    if (host === null) {
      console.error("Cannot send to Obsidian; no hostname set.");
      return;
    }

    try {
      result = await obsidianRequest(
        host,
        apiKey,
        compiledUrl,
        request,
        insecureMode
      );
    } catch (e) {
      setStatus({
        severity: "error",
        title: "Error",
        message: `Could not send content to Obsidian: ${e}`,
      });
      return;
    }
    const text = await result.text();

    if (result.status < 300) {
      setStatus({
        severity: "success",
        title: "All done!",
        message: "Your content was sent to Obsidian successfully.",
      });
      setTimeout(() => onFinished(), 1500);
    } else {
      try {
        const body = JSON.parse(text);
        setStatus({
          severity: "error",
          title: "Error",
          message: `Could not send content to Obsidian: (Error Code ${body.errorCode}) ${body.message}`,
        });
      } catch (e) {
        setStatus({
          severity: "error",
          title: "Error",
          message: `Could not send content to Obsidian!: (Status Code ${result.status}) ${text}`,
        });
      }
    }
  };

  const acceptSuggestion = async (filename: string, template: OutputPreset) => {
    if (presets === undefined) {
      throw new Error("Unexpectedly had no presets when accepting suggestion");
    }
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
    popupTeardown();
  };

  return (
    <ThemeProvider theme={DarkPurpleTheme}>
      <Draggable handle=".drag-handle">
        <div className="popup">
          <div className="drag-handle"></div>
          <Paper
            onClick={(evt) => {
              evt.stopPropagation();
            }}
          >
            {displayState === "welcome" && (
              <>
                <MaterialAlert severity="success">
                  <p className="popup-text">
                    Thanks for installing Obsidian Web! Obsidian Web needs some
                    information from you before it can connect to your Obsidian
                    instance.
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
                  Obsidian Web needs permission to access Obsidian on '{host}'.
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
            {displayState === "alert" && status && <Alert value={status} />}
            {displayState === "error" && (
              <MaterialAlert severity="error">
                <p className="popup-text">
                  Could not connect to Obsidian! Make sure Obsidian is running
                  and that the Obsidian Local REST API plugin is enabled.
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
                <CircularProgress />
              </div>
            )}
            {displayState === "form" && (
              <>
                {!suggestionAccepted && host && (
                  <>
                    {(mentions.length > 0 || directReferences.length > 0) && (
                      <div className="mentions">
                        {directReferences.map((ref) => (
                          <MentionNotice
                            key={ref.filename}
                            type="direct"
                            host={host}
                            apiKey={apiKey}
                            insecureMode={insecureMode}
                            templateSuggestion={searchMatchDirectTemplate}
                            mention={ref}
                            acceptSuggestion={acceptSuggestion}
                            directReferenceMessages={directReferenceMessages}
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
                              host={host}
                              apiKey={apiKey}
                              insecureMode={insecureMode}
                              templateSuggestion={searchMatchMentionTemplate}
                              mention={ref}
                              acceptSuggestion={acceptSuggestion}
                            />
                          ))}
                      </div>
                    )}
                  </>
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
                      disabled={!contentIsValid}
                      onClick={sendToObsidian}
                      title="Send to Obsidian"
                    >
                      <SendIcon className="send-to-obsidian-icon" />
                    </IconButton>
                    <IconButton
                      className="cancel-send"
                      color="error"
                      size="large"
                      onClick={onFinished}
                      title="Cancel"
                    >
                      <CancelIcon className="cancel-send-icon" />
                    </IconButton>
                  </div>
                </div>
                <Accordion>
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
                    />
                  </AccordionDetails>
                </Accordion>
              </>
            )}
          </Paper>
        </div>
      </Draggable>
    </ThemeProvider>
  );
};

function handleEscapeKey(event: KeyboardEvent) {
  if (event.code === "Escape") {
    popupTeardown();
  }
}
document.addEventListener("keydown", handleEscapeKey);

function preventBrowserFromStealingKeypress(event: KeyboardEvent) {
  if (event.code !== "Escape") {
    event.stopPropagation();
  }
}
document.addEventListener("keydown", preventBrowserFromStealingKeypress, true);

function popupTeardown() {
  unregisterCompileTemplateCallback();
  document.removeEventListener(
    "keydown",
    preventBrowserFromStealingKeypress,
    true
  );
  document.removeEventListener("keydown", handleEscapeKey);
  setTimeout(() => {
    document.getElementById(ROOT_CONTAINER_ID)?.remove();
  }, 300);
}

if (!document.getElementById(ROOT_CONTAINER_ID)) {
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
} else {
  popupTeardown();
}
