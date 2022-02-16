import Handlebars from "handlebars";
import {
  SandboxRequest,
  SandboxRenderResponse,
  SandboxRenderRequest,
} from "./types";

const render = (request: SandboxRenderRequest): SandboxRenderResponse => {
  const compiled = Handlebars.compile(request.template);

  return {
    success: true,
    request,
    rendered: compiled(request.context),
  };
};

function handleEvent(evt: MessageEvent<SandboxRequest>): void {
  if (evt.origin === "null") {
    console.log("Received event from self :-(", evt);
    return;
  }
  console.log("Parent: ", window.parent);
  console.log("Received event: ", evt);

  const command = evt.data.command;
  const postMessage = (evt.source as WindowProxy).postMessage;
  console.log("Received event (Src): ", evt.source);

  const debug = document.getElementById("debug");
  if (debug) {
    debug.innerHTML = JSON.stringify(evt.data);
  }

  try {
    switch (command) {
      case "render":
        postMessage(render(evt.data), "*");
        break;
      default:
        return;
        throw new Error(`Unexpected command: ${command}`);
    }
  } catch (e) {
    console.error(e);
    postMessage(
      {
        success: false,
        request: evt.data,
        message: (e as Error).message,
      },
      "*"
    );
  }
}

window.addEventListener("message", handleEvent);
