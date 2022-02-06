import { compile } from "micromustache";
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import HeaderControl from "./components/HeaderControl";
import { ExtensionSettings, OutputPreset } from "./types";
import { getSettings, postNotification } from "./utils";

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
        postNotification({
          title: "Error",
          message: "Could not get selection!",
        });
        return;
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

    const finalHeaders = {
      ...headers,
      Authorization: `Bearer ${apiKey}`,
    };

    const result = await fetch(`https://127.0.0.1:27124${compiledUrl}`, {
      method: method,
      body: compiledContent,
      headers: finalHeaders,
      mode: "cors",
    });

    if (result.status < 300) {
      postNotification({
        title: "All done!",
        message: "Your content was sent to Obsidian successfully.",
      });
    } else {
      postNotification({
        title: "Error",
        message: `Could not send content to Obsidian: ${result.body}`,
      });
    }
  };

  return (
    <div className="obsidian-web-popup-container">
      <div className="option-panel">
        <div className="option">
          <div className="option-name">
            <label htmlFor="preset">Preset</label>
          </div>
          <div className="option-value">
            <select
              id="preset"
              value={selectedPreset}
              onChange={(event) =>
                setSelectedPreset(parseInt(event.target.value))
              }
            >
              {presets.map((preset, idx) => (
                <option key={preset.name} value={idx}>
                  {preset.name}
                </option>
              ))}
            </select>
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
            <textarea
              id="content-template"
              value={compiledContent}
              onChange={(event) => setCompiledContent(event.target.value)}
            />
          </div>
        </div>
        <div className="option">
          <div className="option-name">
            <label htmlFor="method">Method</label>
          </div>
          <div className="option-value">
            <select
              id="method"
              value={method}
              onChange={(event) =>
                setMethod(event.target.value as OutputPreset["method"])
              }
            >
              <option value="post">POST</option>
              <option value="put">PUT</option>
              <option value="patch">PATCH</option>
            </select>
          </div>
        </div>
        <div className="option">
          <div className="option-name">
            <label htmlFor="url-template">URL Template</label>
          </div>
          <div className="option-value">
            <input
              id="url-template"
              type="text"
              value={compiledUrl}
              onChange={(event) => setCompiledUrl(event.target.value)}
            />
          </div>
        </div>
        <div className="submit">
          <button onClick={sendToObsidian}>Send to Obsidian</button>
        </div>
      </div>
    </div>
  );
};

ReactDOM.render(
  <React.StrictMode>
    <Popup />
  </React.StrictMode>,
  document.getElementById("root")
);
