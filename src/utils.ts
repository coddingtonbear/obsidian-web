import {
  ExtensionSettings,
  SandboxRenderRequest,
  SandboxRenderResponse,
  SandboxExceptionResponse,
} from "./types";
import { DefaultSettings } from "./constants";

export async function getSettings(
  sync: chrome.storage.SyncStorageArea
): Promise<ExtensionSettings> {
  const settings = await sync.get(DefaultSettings);
  return settings as ExtensionSettings;
}

export async function obsidianRequest(
  apiKey: string,
  path: string,
  options: RequestInit,
  insecureMode: boolean
): ReturnType<typeof fetch> {
  const requestOptions: RequestInit = {
    ...options,
    headers: {
      ...options.headers,
      "Content-Type": "text/markdown",
      Authorization: `Bearer ${apiKey}`,
    },
    method: options.method?.toUpperCase(),
    mode: "cors",
  };

  return fetch(
    `http${insecureMode ? "" : "s"}://127.0.0.1:${
      insecureMode ? "27123" : "27124"
    }${path}`,
    requestOptions
  );
}

export function compile(
  template: string,
  context: Record<string, any>
): Promise<string> {
  const result = new Promise<string>((resolve, reject) => {
    const sandbox = document.getElementById(
      "handlebars-sandbox"
    ) as HTMLIFrameElement;

    const message: SandboxRenderRequest = {
      command: "render",
      template,
      context,
    };

    if (!sandbox.contentWindow) {
      throw new Error("No content window found for handlebars sandbox!");
    }

    const handler = (
      event: MessageEvent<SandboxRenderResponse | SandboxExceptionResponse>
    ) => {
      console.log("SCRIPT RESPONSE", event);
      if (event.data.success) {
        resolve(event.data.rendered);
      } else {
        reject(event.data.message);
      }
    };

    window.addEventListener("message", handler, { once: true });

    sandbox.contentWindow.postMessage(message, "*");
  });

  return result;
}
