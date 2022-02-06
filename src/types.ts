export interface OutputPreset {
  name: string;
  urlTemplate: string;
  contentTemplate: string;
  headers: Record<string, string>;
  method: "post" | "put" | "patch";
}

export interface ExtensionSettings {
  apiKey: string;
  version: string;
  presets: OutputPreset[];
}
