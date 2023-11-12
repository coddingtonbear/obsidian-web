import TurndownService from "turndown";

import {
  ExtensionLocalSettings,
  ExtensionSyncSettings,
  OutputPreset,
} from "./types";

export const MinVersion = "1.3.1";

export const DefaultContentTemplate =
  '---\npage-title: {{json page.title}}\nurl: {{page.url}}\ndate: "{{date}}"\n---\n{{#if page.selectedText}}\n\n{{quote page.selectedText}}\n{{/if}}';
export const DefaultUrlTemplate = "/vault/{{filename page.title}}.md";
export const DefaultHeaders = {};
export const DefaultMethod = "put";

export const DefaultLocalSettings: ExtensionLocalSettings = {
  version: "0.2",
  host: "127.0.0.1",
  insecureMode: false,
  apiKey: "",
};

export const KnownLocalSettingKeys = [
  "version",
  "host",
  "insecureMode",
  "apiKey",
];

export const DefaultSearchMatchTemplate: OutputPreset = {
  contentTemplate:
    "## {{date}}\n{{#if page.selectedText}}\n\n{{quote page.selectedText}}\n{{/if}}",
  headers: {},
  method: "post",
};

export const DefaultSyncSettings: ExtensionSyncSettings = {
  version: "0.2",
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
    {
      name: "Capture page snapshot",
      urlTemplate: DefaultUrlTemplate,
      contentTemplate:
        '---\npage-title: {{json page.title}}\nurl: {{page.url}}\ndate: "{{date}}"\n---\n{{#if page.selectedText}}\n\n{{quote page.selectedText}}\n\n---\n\n{{/if}}{{page.content}}',
      headers: DefaultHeaders,
      method: DefaultMethod,
    },
  ],
  searchMatch: {
    enabled: false,
    backgroundEnabled: false,
    mentions: {
      suggestionEnabled: false,
      template: DefaultSearchMatchTemplate,
    },
    direct: {
      suggestionEnabled: true,
      template: DefaultSearchMatchTemplate,
    },
  },
};

export const KnownSyncSettingKeys = [
  "version",
  "presets",
  "searchMatch",
  "searchEnabled",
  "searchBackgroundEnabled",
  "searchMatchMentionTemplate",
  "searchMatchDirectTemplate",
];

export const TurndownConfiguration: TurndownService.Options = {
  headingStyle: "atx",
  hr: "---",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
  emDelimiter: "*",
};
