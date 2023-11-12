import React from "react";

import TextField from "@mui/material/TextField";

import { UrlOutputPreset } from "../types";
import HeaderControl from "./HeaderControl";
import { NativeSelect, Stack, Typography } from "@mui/material";
import { compileTemplate } from "../utils";
import Alert from "./Alert";

interface Props {
  method: UrlOutputPreset["method"];
  sandbox: HTMLIFrameElement;
  previewContext: Record<string, any>;
  allowUrlConfiguration?: boolean;
  url: string;
  headers: Record<string, string>;
  content: string;

  onChangeMethod: (method: UrlOutputPreset["method"]) => void;
  onChangeUrl: (url: string) => void;
  onChangeHeaders: (headers: Record<string, string>) => void;
  onChangeContent: (content: string) => void;
  onChangeIsValid: (valid: boolean) => void;
}

const RequestParameters: React.FC<Props> = ({
  method,
  sandbox,
  previewContext,
  allowUrlConfiguration = true,
  url,
  headers,
  content,
  onChangeMethod,
  onChangeUrl,
  onChangeHeaders,
  onChangeContent,
  onChangeIsValid,
}) => {
  const [compiledUrl, setCompiledUrl] = React.useState<string>(url);
  const [compiledUrlError, setCompiledUrlError] = React.useState<string>();
  const [compiledContent, setCompiledContent] = React.useState<string>(content);
  const [compiledContentError, setCompiledContentError] =
    React.useState<string>();

  React.useEffect(() => {
    async function handle() {
      try {
        setCompiledContent(
          await compileTemplate(sandbox, content, previewContext)
        );
        setCompiledContentError(undefined);
      } catch (e) {
        setCompiledContentError(e as string);
      }
    }

    handle();
  }, [content]);

  React.useEffect(() => {
    async function handle() {
      try {
        setCompiledUrl(await compileTemplate(sandbox, url, previewContext));
        setCompiledUrlError(undefined);
      } catch (e) {
        setCompiledUrlError(e as string);
      }
    }

    handle();
  }, [url]);

  React.useEffect(() => {
    onChangeIsValid(
      !(Boolean(compiledUrlError) || Boolean(compiledContentError))
    );
  }, [compiledUrlError, compiledContentError]);

  return (
    <>
      <div className="option">
        <div className="option-value">
          <NativeSelect
            value={method}
            className="method-select"
            onChange={(event) =>
              onChangeMethod(event.target.value as UrlOutputPreset["method"])
            }
          >
            <option value="post">POST</option>
            <option value="put">PUT</option>
            <option value="patch">PATCH</option>
          </NativeSelect>
          {allowUrlConfiguration && (
            <>
              <TextField
                label="API URL"
                fullWidth={true}
                value={url}
                onChange={(event) => onChangeUrl(event.target.value)}
              />
              <pre className="template-rendered-preview">{compiledUrl}</pre>
            </>
          )}
          {!allowUrlConfiguration && (
            <Typography
              paragraph={true}
              className="request-params-no-url-notice"
            >
              URL will be set to address file in which match was found.
            </Typography>
          )}
        </div>
      </div>
      {compiledUrlError && (
        <Alert
          value={{
            severity: "error",
            title: "Error",
            message: `Could not compile: ${compiledUrlError}`,
          }}
        />
      )}
      <div className="option">
        <div className="option-value">
          <HeaderControl headers={headers} onChange={onChangeHeaders} />
        </div>
      </div>
      <div className="option">
        <div className="option-value">
          <Stack direction="row" className="template-input-stack">
            <TextField
              className="template-content"
              label="Content"
              fullWidth={true}
              multiline={true}
              value={content}
              onChange={(event) => onChangeContent(event.target.value)}
            />
            <pre className="template-rendered-preview">{compiledContent}</pre>
          </Stack>
        </div>
      </div>
      {compiledContentError && (
        <Alert
          value={{
            severity: "error",
            title: "Error",
            message: `Could not compile: ${compiledContentError}`,
          }}
        />
      )}
    </>
  );
};

export default RequestParameters;
