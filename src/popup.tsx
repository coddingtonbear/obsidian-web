import { compile } from "micromustache";
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import HeaderControl from "./components/HeaderControl";
import { ExtensionSettings, OutputPreset } from "./types";
import { getSettings, postNotification } from "./utils";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import TextField from "@mui/material/TextField";
import { ThemeProvider } from "@mui/system";
import { PurpleTheme } from "./theme";

const Popup = () => {
  const [apiKey, setApiKey] = useState<string>("");
  const [method, setMethod] = useState<OutputPreset["method"]>("post");
  const [compiledUrl, setCompiledUrl] = useState<string>("");
  const [headers, setHeaders] = useState<Record<string, string>>({});
  const [compiledContent, setCompiledContent] = useState<string>("");

  const [presets, setPresets] = useState<OutputPreset[]>([]);
  const [selectedPreset, setSelectedPreset] = useState<number>(0);

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
        postNotification({
          title: "Error",
          message: "Could not get current tab!",
        });
        return;
      }

      if (!tab.id) {
        return;
      }
      let items: ExtensionSettings;

      try {
        items = await getSettings(chrome.storage.sync);
        setPresets(items.presets);
      } catch (e) {
        postNotification({
          title: "Error",
          message: "Could not get settings!",
        });
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

      const preset = items.presets[selectedPreset];

      const context = {
        page: {
          url: tab.url,
          title: tab.title,
          selectedText: selectedText,
        },
      };

      setApiKey(items.apiKey);
      setMethod(preset.method as OutputPreset["method"]);
      setCompiledUrl(compile(preset.urlTemplate).render(context));
      setHeaders(preset.headers);
      setCompiledContent(compile(preset.contentTemplate).render(context));
    }

    handle();
  }, [selectedPreset]);

  const sendToObsidian = async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];

    if (!tab.id) {
      return;
    }

    const request: RequestInit = {
      method: method,
      body: compiledContent,
      headers: {
        ...headers,
        Authorization: `Bearer ${apiKey}`,
      },
      mode: "cors",
    };

    const result = await fetch(
      `https://127.0.0.1:27124${compiledUrl}`,
      request
    );

    if (result.status < 300) {
      postNotification({
        title: "All done!",
        message: "Your content was sent to Obsidian successfully.",
      });
    } else {
      const body = await result.json();
      postNotification({
        title: "Error",
        message: `Could not send content to Obsidian: (Code ${body.errorCode}) ${body.message}`,
      });
    }
  };

  return (
    <ThemeProvider theme={PurpleTheme}>
      <div className="obsidian-web-popup-container">
        <div className="option-panel">
          <div className="option">
            <div className="option-name">
              <label htmlFor="preset">Preset</label>
            </div>
            <div className="option-value">
              <Select
                id="preset"
                value={selectedPreset}
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
            </div>
          </div>
          <div className="option">
            <div className="option-name">
              <label htmlFor="header-template">Header</label>
            </div>
            <div className="option-value">
              <HeaderControl headers={headers} onChange={setHeaders} />
            </div>
          </div>
          <div className="option">
            <div className="option-name">
              <label htmlFor="content-template">Content</label>
            </div>
            <div className="option-value">
              <TextField
                multiline={true}
                id="content-template"
                value={compiledContent}
                helperText="Available template properties include {{ page.url }}, {{ page.title }}, and {{ page.selectedText }}."
                onChange={(event) => setCompiledContent(event.target.value)}
              />
            </div>
          </div>
          <div className="option">
            <div className="option-name">
              <label htmlFor="method">Method</label>
            </div>
            <div className="option-value">
              <Select
                id="method"
                value={method}
                onChange={(event) =>
                  setMethod(event.target.value as OutputPreset["method"])
                }
              >
                <MenuItem value="post">POST</MenuItem>
                <MenuItem value="put">PUT</MenuItem>
                <MenuItem value="patch">PATCH</MenuItem>
              </Select>
            </div>
          </div>
          <div className="option">
            <div className="option-name">
              <label htmlFor="url-template">URL Template</label>
            </div>
            <div className="option-value">
              <TextField
                fullWidth={true}
                id="url-template"
                type="text"
                value={compiledUrl}
                onChange={(event) => setCompiledUrl(event.target.value)}
              />
            </div>
          </div>
          <div className="submit">
            <Button variant="contained" onClick={sendToObsidian}>
              Send to Obsidian
            </Button>
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
};

ReactDOM.render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>,
  document.getElementById("root")
);
