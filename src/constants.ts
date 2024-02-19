import TurndownService from "turndown";

import {
  ExtensionLocalSettings,
  ExtensionSyncSettings,
  OutputPreset,
  OutputPresetFieldDefinition,
  PreviewContext,
} from "./types";

export const MinVersion = "1.3.1";

export const CurrentMaxOnboardingVersion = "3.2";

export const DefaultContentTemplate =
  '---\npage-title: {{json page.title}}\nurl: {{page.url}}\nweb-message:\nweb-badge-color: ""\nweb-badge-message:\ndate: "{{date}}"\n---\n{{#if page.selectedText}}\n\n{{quote page.selectedText}}\n{{/if}}';
export const DefaultUrlTemplate = "/vault/{{filename page.title}}.md";
export const DefaultHeaders = {};
export const DefaultMethod = "put";

export const LocalSettingsVersion = "2.0";

export const DefaultLocalSettings: ExtensionLocalSettings = {
  version: LocalSettingsVersion,
  host: "127.0.0.1",
  insecureMode: false,
  apiKey: "",
};

export const DefaultPreviewContext: PreviewContext = {
  page: {
    url: "https://fortelabs.com/blog/para/",
    title:
      "The PARA Method: The Simple System for Organizing Your Digital Life in Seconds",
    selectedText: "Imagine for a moment the perfect organizational system.",
    content: "CONTENT",
  },
  article: {
    title:
      "The PARA Method: The Simple System for Organizing Your Digital Life in Seconds",
    length: 1000,
    excerpt:
      "It’s called PARA – a simple, comprehensive, yet extremely flexible system for organizing any type of digital information across any platform.",
    byline: "Tiago Forte",
    dir: "ltr",
    siteName: "Forte Labs",
  },
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

export const SyncSettingsVersion = "2.1";

export const DefaultSyncSettings: ExtensionSyncSettings = {
  version: SyncSettingsVersion,
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
    autoOpen: "never",
    hoverEnabled: false,
    mentions: {
      suggestionEnabled: false,
      template: DefaultSearchMatchTemplate,
    },
    direct: {
      suggestionEnabled: true,
      template: DefaultSearchMatchTemplate,
    },
  },
  onboardedToVersion: "",
};

export const KnownSyncSettingKeys = [
  "version",
  "presets",
  "searchMatch",
  "searchEnabled",
  "searchBackgroundEnabled",
  "searchMatchMentionTemplate",
  "searchMatchDirectTemplate",
  "onboardedToVersion",
];

export const TurndownConfiguration: TurndownService.Options = {
  headingStyle: "atx",
  hr: "---",
  bulletListMarker: "-",
  codeBlockStyle: "fenced",
  emDelimiter: "*",
};

export const MaximumErrorLogLength = 250;

export const DefaultOutputPresetFieldDefinitionOptions: Record<
  OutputPresetFieldDefinition["type"],
  Record<string, any>
> = {
  text: {},
  checkbox: {},
  date: {
    format: "yyyy-LL-dd",
  },
  datetime: {
    format: "yyyy-LL-dd'T'HH:mm",
  },
  time: {
    format: "HH:mm",
  },
};
