import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import { ExtensionSettings } from "./types";
import { compile } from "micromustache";

const Options = () => {
  const [apiKey, setApiKey] = useState<string>("");
  const [contentTemplate, setContentTemplate] = useState<string>("");
  const [urlTemplate, setUrlTemplate] = useState<string>("");
  const [headerTemplate, setHeaderTemplate] = useState<string>("");
  const [method, setMethod] = useState<ExtensionSettings["method"]>("post");

  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    // Restores select box and checkbox state using the preferences
    // stored in chrome.storage.
    chrome.storage.sync.get(
      {
        apiKey: "",
        contentTemplate:
          "## {{ page.title }}\nURL: {{ page.url }}\n\n> {{ page.selectedText }}\n\n",
        urlTemplate: "/periodic/daily/",
        method: "post",
        headerTemplate: "",
      } as ExtensionSettings,
      (items) => {
        setApiKey(items.apiKey);
        setContentTemplate(items.contentTemplate);
        setUrlTemplate(items.urlTemplate);
        setMethod(items.method);
        setHeaderTemplate(items.headerTemplate);
      }
    );
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
    if (!errorMessage) {
      try {
        compile(headerTemplate);
      } catch (e) {
        errorMessage = "Could not compile header template.";
      }
    }

    if (errorMessage) {
      setStatus(`Error: ${errorMessage}`);
    } else {
      chrome.storage.sync.set(
        {
          apiKey,
          contentTemplate,
          urlTemplate,
          method,
          headerTemplate,
        } as ExtensionSettings,
        () => {
          // Update status to let user know options were saved.
          setStatus("Options saved.");
          const id = setTimeout(() => {
            setStatus("");
          }, 1000);
          return () => clearTimeout(id);
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
          <textarea
            id="header-template"
            value={headerTemplate}
            onChange={(event) => setHeaderTemplate(event.target.value)}
          />
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
              setMethod(event.target.value as ExtensionSettings["method"])
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
