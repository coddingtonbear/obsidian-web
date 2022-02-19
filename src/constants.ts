import { ExtensionLocalSettings, ExtensionSyncSettings } from "./types";

export const DefaultContentTemplate =
  "---\npage-title: {{page.title}}\nurl: {{page.url}}\ndate: {{date}}\n---\n{{#if page.selectedText}}\n\n{{quote page.selectedText}}\n{{/if}}";
export const DefaultUrlTemplate = "/vault/{{filename page.title}}.md";
export const DefaultHeaders = {};
export const DefaultMethod = "put";

export const DefaultLocalSettings: ExtensionLocalSettings = {
  version: "0.1",
  apiKey: "",
};

export const DefaultSyncSettings: ExtensionSyncSettings = {
  version: "0.1",
  presets: [
    {
      name: "Append to current daily note",
      urlTemplate: "/periodic/daily/",
      contentTemplate:
        "## {{page.title}}\nURL: {{page.url}}\n{{#if page.selectedText}}\n\n{{quote page.selectedText}}\n{{/if}}",
      headers: {},
      method: "post",
    },
    {
      name: "Create new note",
      urlTemplate: DefaultUrlTemplate,
      contentTemplate: DefaultContentTemplate,
      headers: DefaultHeaders,
      method: DefaultMethod,
    },
  ],
};
