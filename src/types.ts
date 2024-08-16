import { AlertProps } from "@mui/material/Alert";
import { Step as JoyrideStep } from "react-joyride";

export interface OutputPreset {
  contentTemplate: string;
  headers: Record<string, string>;
  method: "post" | "put" | "patch";
}

export interface UrlOutputPreset extends OutputPreset {
  name: string;
  urlTemplate: string;
}

export interface ConfiguredTemplate extends OutputPreset {
  name?: string;
  urlTemplate?: string;
}

export interface ExtensionLocalSettings__2_0 {
  version: string;
  host: string;
  apiKey: string;
  insecureMode?: boolean;
}

export interface ExtensionLocalSettings {
  version: string;
  url: string;
  apiKey: string;
}

export interface ContentCache {
  url?: string;
  method?: "put" | "post" | "patch";
  compiledUrl?: string;
  headers?: Record<string, string>;
  compiledContent?: string;
}

export interface ExtensionSyncSettings__0_1 {
  version: string;
  presets: UrlOutputPreset[];
  searchEnabled: boolean;
  searchBackgroundEnabled: boolean;
  searchMatchMentionTemplate: string;
  searchMatchDirectTemplate: string;
}

export interface ExtensionSyncSettings__0_2 {
  version: string;
  presets: UrlOutputPreset[];
  searchMatch: {
    enabled: boolean;
    backgroundEnabled: boolean;
    mentions: {
      suggestionEnabled: boolean;
      template: OutputPreset;
    };
    direct: {
      suggestionEnabled: boolean;
      template: OutputPreset;
    };
  };
}

export type AutoOpenOption = "never" | "direct-message" | "direct" | "mention";

export interface ExtensionSyncSettings {
  version: string;
  presets: UrlOutputPreset[];
  searchMatch: {
    enabled: boolean;
    backgroundEnabled: boolean;
    autoOpen: AutoOpenOption;
    hoverEnabled: boolean;
    mentions: {
      suggestionEnabled: boolean;
      template: OutputPreset;
    };
    direct: {
      suggestionEnabled: boolean;
      template: OutputPreset;
    };
  };
  onboardedToVersion: string;
}

export interface AlertStatus {
  severity: AlertProps["severity"];
  title: string;
  message: string;
  recoverable?: boolean;
}

export interface SandboxRenderRequest {
  command: "render";
  template: string;
  id: string;
  context: Record<string, any>;
}

export type SandboxRequest = SandboxRenderRequest;

export interface SandboxMessageBase {
  type: string;
  success: boolean;
}

export interface SandboxLoadedResponse extends SandboxMessageBase {
  type: "loaded";
}

export interface SandboxResponseBase extends SandboxMessageBase {
  type: "response";
}

export interface SandboxExceptionResponse extends SandboxResponseBase {
  request: SandboxRequest;
  success: false;
  message: string;
}

export interface SandboxSuccessResponse extends SandboxResponseBase {
  request: SandboxRequest;
  success: true;
}

export interface SandboxRenderResponse extends SandboxSuccessResponse {
  request: SandboxRenderRequest;
  rendered: string;
}

export type SandboxResponse = SandboxRenderResponse | SandboxExceptionResponse;

export interface SearchJsonResponseItem {
  filename: string;
  result: unknown;
}

export interface SearchJsonResponseItemWithMetadata
  extends SearchJsonResponseItem {
  meta: FileMetadataObject;
}

export interface UrlMentionContainer {
  mentions: SearchJsonResponseItem[];
  direct: SearchJsonResponseItemWithMetadata[];
  count: number;
}

export interface StatusResponse {
  status: string;
  versions: {
    obsidian: string;
    self: string;
  };
  service: string;
  authenticated: boolean;
}

export interface FileMetadataObject {
  tags: string[];
  frontmatter: Record<string, unknown>;
  path: string;
  content: string;
}

export interface BaseBackgroundRequest {
  type: string;
}

export interface RequestHostPermissionRequest extends BaseBackgroundRequest {
  type: "request-host-permission";
  url: string;
}

export interface CheckHasHostPermissionRequest extends BaseBackgroundRequest {
  type: "check-has-host-permission";
  url: string;
}

export interface CheckKeyboardShortcutRequest extends BaseBackgroundRequest {
  type: "check-keyboard-shortcut";
}

export interface ObsidianRequestVerify extends BaseBackgroundRequest {
  type: "obsidian-request-verify";
  request: {
    url: string;
    apiKey: string;
    options: RequestInit;
  };
}

export interface ObsidianRequest extends BaseBackgroundRequest {
  type: "obsidian-request";
  request: {
    path: string;
    options: RequestInit;
  };
}

export interface BackgroundErrorLog extends BaseBackgroundRequest {
  type: "background-error-log";
}

export type BackgroundRequest =
  | RequestHostPermissionRequest
  | CheckHasHostPermissionRequest
  | CheckKeyboardShortcutRequest
  | ObsidianRequestVerify
  | ObsidianRequest
  | BackgroundErrorLog;

export interface ObsidianResponse {
  ok: true;
  data?: Record<string, any>;
  status: number;
  headers: Record<string, string>;
}

export interface ObsidianResponseError {
  ok: false;
  error: string;
}

export interface LogEntry {
  date: string;
  level: "error" | "log";
  message: string;
  data: any;
  stack: string | null;
}

export interface PreviewContext {
  page: {
    url: string;
    title: string;
    selectedText: string;
    content: string;
  };
  article: {
    title?: string;
    length?: number;
    excerpt?: string;
    byline?: string;
    dir?: string;
    siteName?: string;
  };
}

export interface OnboardingStep extends JoyrideStep {
  onboardingVersion?: string;
  skipDuringInitialOnboarding?: boolean;
}

export interface GithubRelease {
  name: string;
  tag_name: string;
  html_url: string;
}

export interface FormState {
  method: UrlOutputPreset["method"];
  url: string;
  headers: Record<string, any>;
  content: string;
}
