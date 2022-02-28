import React, { useEffect, useState } from "react";

import ReactDOM from "react-dom";
import Turndown from "turndown";
import { Readability } from "@mozilla/readability";

import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import ThemeProvider from "@mui/system/ThemeProvider";
import IconButton from "@mui/material/IconButton";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Typography from "@mui/material/Typography";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import CircularProgress from "@mui/material/CircularProgress";
import MaterialAlert from "@mui/material/Alert";

import SendIcon from "@mui/icons-material/SaveAlt";

import { PurpleTheme } from "./theme";
import Alert from "./components/Alert";
import {
  AlertStatus,
  ExtensionLocalSettings,
  ExtensionSyncSettings,
  OutputPreset,
  SearchJsonResponseItem,
  StatusResponse,
} from "./types";
import {
  getLocalSettings,
  getSyncSettings,
  obsidianRequest,
  compileTemplate,
  getUrlMentions,
} from "./utils";
import RequestParameters from "./components/RequestParameters";
import { TurndownConfiguration } from "./constants";
import MentionNotice from "./components/MentionNotice";

const Popup = () => {
  const [status, setStatus] = useState<AlertStatus>();

  const [sandboxReady, setSandboxReady] = useState<boolean>(false);
  const [obsidianUnavailable, setObsidianUnavailable] =
    useState<boolean>(false);
  const [ready, setReady] = useState<boolean>(false);
  const [apiKey, setApiKey] = useState<string>("");
  const [insecureMode, setInsecureMode] = useState<boolean>(false);

  const [url, setUrl] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [selection, setSelection] = useState<string>("");
  const [pageContent, setPageContent] = useState<string>("");

  const [suggestionAccepted, setSuggestionAccepted] = useState<boolean>(false);
  const [mentions, setMentions] = useState<SearchJsonResponseItem[]>([]);
  const [directReferences, setDirectReferences] = useState<
    SearchJsonResponseItem[]
  >([]);

  const [searchEnabled, setSearchEnabled] = useState<boolean>(false);
  const [searchMatchMentionTemplate, setSearchMatchMentionTemplate] =
    useState<string>("");
  const [searchMatchDirectTemplate, setSearchMatchDirectTemplate] =
    useState<string>("");

  const [method, setMethod] = useState<OutputPreset["method"]>("post");
  const [overrideUrl, setOverrideUrl] = useState<string>();
  const [compiledUrl, setCompiledUrl] = useState<string>("");
  const [headers, setHeaders] = useState<Record<string, string>>({});
  const [compiledContent, setCompiledContent] = useState<string>("");

  const [presets, setPresets] = useState<OutputPreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<number>(0);

  const turndown = new Turndown(TurndownConfiguration);

  window.addEventListener(
    "message",
    () => {
      setSandboxReady(true);
    },
    {
      once: true,
    }
  );

  useEffect(() => {
    if (!apiKey) {
      return;
    }

    async function handle() {
      try {
        const request = await obsidianRequest(
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
  }, []);

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

      setApiKey(localSettings.apiKey);
      setSearchEnabled(syncSettings.searchEnabled);
      setSearchMatchMentionTemplate(syncSettings.searchMatchMentionTemplate);
      setSearchMatchDirectTemplate(syncSettings.searchMatchDirectTemplate);
      setInsecureMode(localSettings.insecureMode ?? false);
    }
    handle();
  }, []);

  useEffect(() => {
    async function handle() {
      let tab: chrome.tabs.Tab;
      try {
        const tabs = await chrome.tabs.query({
          active: true,
          currentWindow: true,
        });
        tab = tabs[0];
      } catch (e) {
        setStatus({
          severity: "error",
          title: "Error",
          message: "Could not get current tab!",
        });
        return;
      }
      if (!tab.id) {
        return;
      }

      let selectedText: string;
      try {
        const selectedTextInjected = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => window.getSelection()?.toString(),
        });
        selectedText = selectedTextInjected[0].result;
      } catch (e) {
        selectedText = "";
      }

      let pageContent: string = "";
      try {
        const pageContentInjected = await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: () => window.document.body.innerHTML,
        });
        const tempDoc = document.implementation.createHTMLDocument();
        tempDoc.body.innerHTML = pageContentInjected[0].result;
        const reader = new Readability(tempDoc);
        const parsed = reader.parse();
        if (parsed) {
          pageContent = turndown.turndown(parsed.content);
        }
      } catch (e) {
        // Nothing -- we'll just have no pageContent
      }

      setUrl(tab.url ?? "");
      setTitle(tab.title ?? "");
      setSelection(selectedText);
      setPageContent(pageContent);
    }
    handle();
  }, []);

  useEffect(() => {
    if (!searchEnabled) {
      return;
    }

    async function handle() {
      const allMentions = await getUrlMentions(apiKey, insecureMode, url);

      setMentions(allMentions.mentions);
      setDirectReferences(allMentions.direct);
    }

    handle();
  }, [url]);

  useEffect(() => {
    if (!sandboxReady) {
      return;
    }

    async function handle() {
      const preset = presets[selectedPreset];

      const context = {
        page: {
          url: url,
          title: title,
          selectedText: selection,
          content: pageContent,
        },
      };

      if (overrideUrl) {
        setCompiledUrl(overrideUrl);
        setOverrideUrl(undefined);
      } else {
        const compiledUrl = await compileTemplate(preset.urlTemplate, context);
        setCompiledUrl(compiledUrl);
      }
      const compiledContent = await compileTemplate(
        preset.contentTemplate,
        context
      );

      setMethod(preset.method as OutputPreset["method"]);
      setHeaders(preset.headers);
      setCompiledContent(compiledContent);
      setReady(true);
    }

    handle();
  }, [
    sandboxReady,
    selectedPreset,
    presets,
    url,
    title,
    selection,
    pageContent,
  ]);

  const sendToObsidian = async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];

    if (!tab.id) {
      return;
    }

    const requestHeaders = {
      ...headers,
      "Content-Type": "text/markdown",
    };
    const request: RequestInit = {
      method: method,
      body: compiledContent,
      headers: requestHeaders,
    };
    const result = await obsidianRequest(
      apiKey,
      compiledUrl,
      request,
      insecureMode
    );
    const text = await result.text();

    if (result.status < 300) {
      setStatus({
        severity: "success",
        title: "All done!",
        message: "Your content was sent to Obsidian successfully.",
      });
      setTimeout(() => window.close(), 2000);
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

  const acceptSuggestion = (filename: string, template: string) => {
    const matchingPresetIdx = presets.findIndex(
      (preset) => preset.name === template
    );
    setOverrideUrl(`/vault/${filename}`);
    setSelectedPreset(matchingPresetIdx);
    setSuggestionAccepted(true);
  };

  return (
    <ThemeProvider theme={PurpleTheme}>
      {ready && !status && !obsidianUnavailable && (
        <>
          {apiKey.length === 0 && (
            <>
              <MaterialAlert severity="success">
                Thanks for installing Obsidian Web! Obsidian Web needs some
                information from you before it can connect to your Obsidian
                instance.
                <Button onClick={() => chrome.runtime.openOptionsPage()}>
                  Go to settings
                </Button>
              </MaterialAlert>
            </>
          )}
          {apiKey && (
            <>
              <div className="option">
                <div className="option-value">
                  <Select
                    label="Preset"
                    value={selectedPreset}
                    fullWidth={true}
                    onChange={(event) =>
                      setSelectedPreset(
                        typeof event.target.value === "number"
                          ? event.target.value
                          : parseInt(event.target.value, 10)
                      )
                    }
                  >
                    {presets.map((preset, idx) => (
                      <MenuItem key={preset.name} value={idx}>
                        {preset.name}
                      </MenuItem>
                    ))}
                  </Select>
                  <IconButton
                    className="send-to-obsidian"
                    color="primary"
                    size="large"
                    disabled={!ready}
                    onClick={sendToObsidian}
                    title="Send to Obsidian"
                  >
                    <SendIcon />
                  </IconButton>
                </div>
              </div>
              <Accordion>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Typography>Entry Details</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <RequestParameters
                    method={method}
                    url={compiledUrl}
                    headers={headers}
                    content={compiledContent}
                    onChangeMethod={setMethod}
                    onChangeUrl={setCompiledUrl}
                    onChangeHeaders={setHeaders}
                    onChangeContent={setCompiledContent}
                  />
                </AccordionDetails>
              </Accordion>
              {!suggestionAccepted && (
                <>
                  {(mentions.length > 0 || directReferences.length > 0) && (
                    <div className="mentions">
                      {directReferences.map((ref) => (
                        <MentionNotice
                          key={ref.filename}
                          type="direct"
                          apiKey={apiKey}
                          insecureMode={insecureMode}
                          templateSuggestion={searchMatchDirectTemplate}
                          mention={ref}
                          presets={presets}
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
                            apiKey={apiKey}
                            insecureMode={insecureMode}
                            templateSuggestion={searchMatchMentionTemplate}
                            mention={ref}
                            presets={presets}
                            acceptSuggestion={acceptSuggestion}
                          />
                        ))}
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </>
      )}
      {obsidianUnavailable && (
        <>
          <MaterialAlert severity="error">
            Could not connect to Obsidian! Make sure Obsidian is running and
            that the Obsidian Local REST API plugin is enabled.
          </MaterialAlert>
        </>
      )}
      {!ready && !obsidianUnavailable && (
        <div className="loading">
          {" "}
          <Typography paragraph={true}>
            Gathering page information...
          </Typography>
          <CircularProgress />
        </div>
      )}
      {status && <Alert value={status} />}
    </ThemeProvider>
  );
};

ReactDOM.render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>,
  document.getElementById("root")
);
