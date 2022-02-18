import { ExtensionSettings } from "./types";

export const DefaultContentTemplate =
  "---\npage-title: {{page.title}}\nurl: {{page.url}}\n---\n{{#if page.selectedText}}\n\n{{quote page.selectedText}}\n{{/if}}";
export const DefaultUrlTemplate = "/vault/{{ page.title }}.md";
export const DefaultHeaders = {};
export const DefaultMethod = "put";

export const DefaultSettings: ExtensionSettings = {
  version: "0.1",
  apiKey: "",
  presets: [
    {
      name: "Append to current daily note",
      urlTemplate: "/periodic/daily/",
      contentTemplate:
        "## {{page.title}}\nURL: {{page.url}}\n{{#if page.selectedText}}\n\n{{quote page.selectedText}}{{/if}}\n",
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
