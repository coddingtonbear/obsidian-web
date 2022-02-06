import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { ExtensionSettings, OutputPreset } from "./types";
import { compile } from "micromustache";
import { getSettings, postNotification } from "./utils";
import HeaderControl from "./components/HeaderControl";
import {
  DefaultContentTemplate,
  DefaultHeaders,
  DefaultMethod,
  DefaultUrlTemplate,
} from "./constants";
import { ThemeProvider } from "@mui/system";
import { PurpleTheme } from "./theme";

const Options = () => {
  const [apiKey, setApiKey] = useState<string>("");

  const [presetName, setPresetName] = useState<string>("");
  const [contentTemplate, setContentTemplate] = useState<string>("");
  const [urlTemplate, setUrlTemplate] = useState<string>("");
  const [headers, setHeaders] = useState<Record<string, string>>({});
  const [method, setMethod] = useState<OutputPreset["method"]>("post");

  const [editingPreset, setEditingPreset] = useState<number>();

  const [presets, setPresets] = useState<OutputPreset[]>([]);

  useEffect(() => {
    // Restores select box and checkbox state using the preferences
    // stored in chrome.storage.
    async function handle() {
      const settings = await getSettings(chrome.storage.sync);
      console.log(settings);

      setApiKey(settings.apiKey);
      setPresets(settings.presets);
    }

    handle();
  }, []);

  useEffect(() => {
    if (editingPreset === undefined) {
      return;
    }
    if (editingPreset === -1) {
      setPresetName("Untitled Preset");
      setContentTemplate(DefaultContentTemplate);
      setUrlTemplate(DefaultUrlTemplate);
      setMethod(DefaultMethod);
      setHeaders(DefaultHeaders);
    } else {
      const preset = presets[editingPreset];

      setPresetName(preset.name);
      setContentTemplate(preset.contentTemplate);
      setUrlTemplate(preset.urlTemplate);
      setMethod(preset.method);
      setHeaders(preset.headers);
    }
  }, [editingPreset]);

  const deletePreset = (idx: number) => {
    const newPresets = [...presets.slice(0, idx), ...presets.slice(idx + 1)];
    setPresets(newPresets);
  };

  const savePreset = () => {
    if (editingPreset === undefined) {
      return;
    }

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
      postNotification({
        title: "Error",
        message: `Could not save preset: ${errorMessage}`,
      });
    } else {
      const preset = {
        name: presetName,
        urlTemplate: urlTemplate,
        contentTemplate: contentTemplate,
        headers: headers,
        method: method,
      };
      if (editingPreset === -1) {
        setPresets([...presets, preset]);
      } else {
        const newPresets = presets.slice();
        newPresets[editingPreset] = preset;
        setPresets(newPresets);
      }
      setEditingPreset(undefined);
    }
  };

  const saveOptions = () => {
    chrome.storage.sync.set(
      {
        apiKey,
        presets,
      } as ExtensionSettings,
      () => {
        postNotification({
          title: "Success",
          message: "Options saved",
        });
      }
    );
  };

  return (
    <ThemeProvider theme={PurpleTheme}>
      <div className="option-panel">
        {editingPreset === undefined && (
          <>
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
                <label htmlFor="api-key">Presets</label>
              </div>
              <div className="option-value">
                {presets.map((preset, idx) => (
                  <div key={preset.name}>
                    {preset.name}{" "}
                    <button
                      onClick={() => {
                        setEditingPreset(idx);
                      }}
                    >
                      Edit
                    </button>
                    {presets.length > 1 && (
                      <button
                        onClick={() => {
                          deletePreset(idx);
                        }}
                      >
                        Delete
                      </button>
                    )}
                  </div>
                ))}
                <button onClick={() => setEditingPreset(-1)}>Create new</button>
              </div>
            </div>
            <div className="submit">
              <button onClick={saveOptions}>Save</button>
              <div className="status">{status}</div>
            </div>
          </>
        )}
        {editingPreset !== undefined && (
          <>
            <div className="option">
              <div className="option-name">
                <label htmlFor="preset-name">Name</label>
              </div>
              <div className="option-value">
                <input
                  id="preset-name"
                  type="text"
                  value={presetName}
                  onChange={(event) => setPresetName(event.target.value)}
                />
              </div>
            </div>
            <div className="option">
              <div className="option-name">
                <label htmlFor="header-template">Headers</label>
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
              <button onClick={savePreset}>Save Preset</button>
            </div>
          </>
        )}
      </div>
    </ThemeProvider>
  );
};

ReactDOM.render(
  <React.StrictMode>
    <Options />
  </React.StrictMode>,
  document.getElementById("root")
);
