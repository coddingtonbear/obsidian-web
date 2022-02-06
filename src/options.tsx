import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { ExtensionSettings, OutputPreset } from "./types";
import { compile } from "micromustache";
import { getSettings } from "./utils";
import HeaderControl from "./components/HeaderControl";

const Options = () => {
  const [apiKey, setApiKey] = useState<string>("");

  const [contentTemplate, setContentTemplate] = useState<string>("");
  const [urlTemplate, setUrlTemplate] = useState<string>("");
  const [headers, setHeaders] = useState<Record<string, string>>({});
  const [method, setMethod] = useState<OutputPreset["method"]>("post");

  const [presets, setPresets] = useState<OutputPreset[]>([]);

  useEffect(() => {
    // Restores select box and checkbox state using the preferences
    // stored in chrome.storage.
    async function handle() {
      const settings = await getSettings(chrome.storage.sync);

      setApiKey(settings.apiKey);
      setPresets(settings.presets);
    }

    handle();
  }, []);

  const saveOptions = () => {
    let errorMessage: string | undefined = undefined;

    try {
      compile(contentTemplate);
    } catch (e) {
      errorMessage = "Could not compile content template.";
    }

    if (!errorMessage) {
      try {
        compile(urlTemplate);
      } catch (e) {
        errorMessage = "Could not compile url template.";
      }
    }

    if (errorMessage) {
      chrome.notifications.create({
        title: "Error",
        message: `Could not save settings: ${errorMessage}`,
      });
    } else {
      chrome.storage.sync.set(
        {
          apiKey,
          presets,
        } as ExtensionSettings,
        () => {
          chrome.notifications.create({
            title: "Success",
            message: "Options saved",
          });
        }
      );
    }
  };

  return (
    <div className="option-panel">
      <div className="option">
        <div className="option-name">
          <label htmlFor="api-key">Api Key</label>
        </div>
        <div className="option-value">
          <input
            id="api-key"
            type="text"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
          />
        </div>
      </div>
      <div className="option">
        <div className="option-name">
          <label htmlFor="header-template">Header Template</label>
        </div>
        <div className="option-value">
          <HeaderControl headers={headers} onChange={setHeaders} />
        </div>
      </div>
      <div className="option">
        <div className="option-name">
          <label htmlFor="content-template">Content Template</label>
        </div>
        <div className="option-value">
          <textarea
            id="content-template"
            value={contentTemplate}
            onChange={(event) => setContentTemplate(event.target.value)}
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
            value={urlTemplate}
            onChange={(event) => setUrlTemplate(event.target.value)}
          />
        </div>
      </div>
      <div className="submit">
        <button onClick={saveOptions}>Save</button>
        <div className="status">{status}</div>
      </div>
    </div>
  );
};

ReactDOM.render(
  <React.StrictMode>
    <Options />
  </React.StrictMode>,
  document.getElementById("root")
);
