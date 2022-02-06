import { compile } from "micromustache";
import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";
import {
  SendToObsidianMessage,
  ResultMessage,
  ExtensionSettings,
} from "./types";

const Popup = () => {
  const [compiledHeader, setCompiledHeader] = useState<string>("");
  const [compiledContent, setCompiledContent] = useState<string>("");
  const [compiledUrl, setCompiledUrl] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>("");
  const [method, setMethod] = useState<ExtensionSettings["method"]>("post");

  const [status, setStatus] = useState<string>("");

  const extractHeaders = (headerString: string): Record<string, string> => {
    const headers: Record<string, string> = {};

    for (const headerLine of headerString.split("\n")) {
      const delimiter = headerLine.indexOf(":");
      if (delimiter > -1) {
        headers[headerLine.slice(0, delimiter).trim()] = headerLine
          .slice(delimiter + 1)
          .trim();
      }
    }

    console.log(headers);

    return headers;
  };

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
        setStatus("Could not get tab");
        return;
      }

      if (!tab.id) {
        return;
      }
      let items: Record<string, string>;

      try {
        items = await chrome.storage.sync.get({
          apiKey: "",
          contentTemplate:
            "## {{ page.title }}\nURL: {{ page.url }}\n\n> {{ page.selectedText }}\n\n",
          urlTemplate: "/periodic/daily/",
          method: "post",
          headerTemplate: "",
        } as ExtensionSettings);
      } catch (e) {
        setStatus("Could not get settings");
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
        setStatus("Could not get selection");
        selectedText = "";
      }

      const context = {
        page: {
          url: tab.url,
          title: tab.title,
          selectedText: selectedText,
        },
      };

      setMethod(items.method as ExtensionSettings["method"]);
      setApiKey(items.apiKey);
      setCompiledContent(compile(items.contentTemplate).render(context));
      setCompiledHeader(compile(items.headerTemplate).render(context));
      setCompiledUrl(compile(items.urlTemplate).render(context));
    }

    handle();
  }, []);

  const sendToObsidian = async () => {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];

    if (!tab.id) {
      return;
    }

    const headers = extractHeaders(compiledHeader);
    headers["Authorization"] = `Bearer ${apiKey}`;

    const result = await fetch(`https://127.0.0.1:27124${compiledUrl}`, {
      method: method,
      body: compiledContent,
      headers: headers,
      mode: "cors",
    });

    setStatus(`${result.status}: ${result.body}`);

    console.log(result);
  };

  return (
    <div className="obsidian-web-popup-container">
      <div className="option-panel">
        <div className="option">
          <div className="option-name">
            <label htmlFor="header-template">Header</label>
          </div>
          <div className="option-value">
            <textarea
              id="header-template"
              value={compiledHeader}
              onChange={(event) => setCompiledHeader(event.target.value)}
            />
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
              value={compiledUrl}
              onChange={(event) => setCompiledUrl(event.target.value)}
            />
          </div>
        </div>
        <div className="submit">
          <button onClick={sendToObsidian}>Send to Obsidian</button>
          <div className="status">{status}</div>
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
