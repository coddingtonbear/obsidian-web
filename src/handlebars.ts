import Handlebars from "handlebars";
import { v4 as uuid } from "uuid";
import { format as formatDate } from "date-fns";
import {
  SandboxRequest,
  SandboxRenderResponse,
  SandboxRenderRequest,
} from "./types";

Handlebars.registerHelper("quote", (value: string): string => {
  const lines: string[] = [];
  for (const rawLine of value.split("\n")) {
    lines.push(`> ${rawLine}`);
  }
  return lines.join("\n");
});

Handlebars.registerHelper(
  "date",
  (format: string | { [key: string]: string }): string => {
    const now = new Date();
    let formatStr: string = "yyyy-MM-dd HH:mm:ss";
    if (typeof format === "string") {
      formatStr = format;
    }
    return formatDate(now, formatStr);
  }
);

Handlebars.registerHelper("filename", (unsafe: string | undefined): string => {
  if (typeof unsafe === "string") {
    return unsafe.replace(/[/\\?%*:|"<>]/g, "");
  }
  return "";
});

Handlebars.registerHelper("json", (unsafe: string | undefined): string => {
  if (typeof unsafe === "string") {
    return JSON.stringify(unsafe);
  }
  return "";
});

Handlebars.registerHelper("uuid", (): string => {
  return uuid();
});

const render = (request: SandboxRenderRequest): SandboxRenderResponse => {
  const compiled = Handlebars.compile(request.template, { noEscape: true });

  return {
    success: true,
    request,
    rendered: compiled(request.context),
  };
};

function handleEvent(evt: MessageEvent<SandboxRequest>): void {
  const command = evt.data.command;

  const debug = document.getElementById("debug");
  if (debug) {
    debug.innerHTML = JSON.stringify(evt.data);
  }

  try {
    switch (command) {
      case "render":
        (evt.source as WindowProxy).postMessage(render(evt.data), evt.origin);
        break;
      default:
        throw new Error(`Unexpected command: ${command}`);
    }
  } catch (e) {
    (evt.source as WindowProxy).postMessage(
      {
        success: false,
        request: evt.data,
        message: (e as Error).message,
      },
      evt.origin
    );
  }
}

window.addEventListener("message", handleEvent);
window.parent.postMessage({ loaded: true }, "*");
