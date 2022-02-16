import { AlertProps } from "@mui/material/Alert";

export interface OutputPreset {
  name: string;
  urlTemplate: string;
  contentTemplate: string;
  headers: Record<string, string>;
  method: "post" | "put" | "patch";
}

export interface ExtensionSettings {
  apiKey: string;
  insecureMode?: boolean;
  version: string;
  presets: OutputPreset[];
}

export interface AlertStatus {
  severity: AlertProps["severity"];
  title: string;
  message: string;
}

export interface SandboxRenderRequest {
  command: "render";
  template: string;
  context: Record<string, any>;
}

export type SandboxRequest = SandboxRenderRequest;

export interface SandboxResponseBase {
  request: SandboxRequest;
  success: boolean;
}

export interface SandboxExceptionResponse extends SandboxResponseBase {
  success: false;
  message: string;
}

export interface SandboxSuccessResponse extends SandboxResponseBase {
  success: true;
}

export interface SandboxRenderResponse extends SandboxSuccessResponse {
  request: SandboxRenderRequest;
  rendered: string;
}

export type SandboxResponse = SandboxRenderResponse | SandboxExceptionResponse;
