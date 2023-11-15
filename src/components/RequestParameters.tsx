import React from "react";

import TextField from "@mui/material/TextField";
import { useDebounce } from "usehooks-ts";

import { UrlOutputPreset } from "../types";
import HeaderControl from "./HeaderControl";
import { IconButton, NativeSelect, Stack, Typography } from "@mui/material";
import { compileTemplate } from "../utils";
import Alert from "./Alert";

import Prerender from "@mui/icons-material/Publish";

interface Props {
  method: UrlOutputPreset["method"];
  showCrystalizeOption?: boolean;
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

  onChangeRenderedUrl?: (value: string) => void;
  onChangeRenderedContent?: (value: string) => void;
}

const RequestParameters: React.FC<Props> = ({
  method,
  sandbox,
  previewContext,
  showCrystalizeOption = false,
  allowUrlConfiguration = true,
  url,
  headers,
  content,
  onChangeMethod,
  onChangeUrl,
  onChangeHeaders,
  onChangeContent,
  onChangeRenderedUrl,
  onChangeRenderedContent,
  onChangeIsValid,
}) => {
  const [compiledUrl, setCompiledUrl] = React.useState<string>(url);
  const [compiledUrlError, setCompiledUrlError] = React.useState<string>();
  const [compiledContent, setCompiledContent] = React.useState<string>(content);
  const [compiledContentError, setCompiledContentError] =
    React.useState<string>();

  const [compiledUrlMatches, setCompiledUrlMatches] =
    React.useState<boolean>(true);
  const debouncedCompiledUrlMatches = useDebounce(compiledUrlMatches, 500);

  const [compiledContentMatches, setCompiledContentMatches] =
    React.useState<boolean>(true);
  const debouncedCompiledContentMatches = useDebounce(
    compiledContentMatches,
    500
  );

  React.useEffect(() => {
    setCompiledUrlMatches(url === compiledUrl);
  }, [url, compiledUrl]);

  React.useEffect(() => {
    setCompiledContentMatches(content === compiledContent);
  }, [content, compiledContent]);

  React.useEffect(() => {
    async function handle() {
      try {
        const renderedContent = await compileTemplate(
          sandbox,
          content,
          previewContext
        );
        setCompiledContent(renderedContent);
        setCompiledContentError(undefined);
        if (onChangeRenderedContent) {
          onChangeRenderedContent(renderedContent);
        }
      } catch (e) {
        setCompiledContentError(e as string);
      }
    }

    handle();
  }, [content]);

  React.useEffect(() => {
    async function handle() {
      try {
        const renderedUrl = await compileTemplate(sandbox, url, previewContext);

        setCompiledUrl(renderedUrl);
        setCompiledUrlError(undefined);
        if (onChangeRenderedUrl) {
          onChangeRenderedUrl(renderedUrl);
        }
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
            <TextField
              label="API URL"
              fullWidth={true}
              value={url}
              onChange={(event) => onChangeUrl(event.target.value)}
            />
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
        {allowUrlConfiguration && !debouncedCompiledUrlMatches && (
          <Stack direction="row" className="preview-content url">
            {showCrystalizeOption && (
              <div>
                <IconButton
                  color="primary"
                  size="small"
                  onClick={() => {
                    onChangeUrl(compiledUrl);
                  }}
                  title="Pre-render template (optional)"
                >
                  <Prerender />
                </IconButton>
              </div>
            )}
            <TextField
              label="API URL (Rendered)"
              fullWidth={true}
              value={compiledUrl}
              disabled={true}
              title={
                "This is the URL that will be used when interacting with the API." +
                (showCrystalizeOption
                  ? "If you would like to modify this URL before the request, use the 'Pre-render' button."
                  : "")
              }
            />
          </Stack>
        )}
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
          <TextField
            className="template-content"
            label="Content (Template)"
            fullWidth={true}
            multiline={true}
            value={content}
            onChange={(event) => onChangeContent(event.target.value)}
            title={
              "This template will be used for generating the content to send to Obsidian.  You can see the actual data that will be sent by looking below at 'Content (Rendered)'."
            }
          />
        </div>
        {!debouncedCompiledContentMatches && (
          <Stack direction="row" className="preview-content">
            {showCrystalizeOption && (
              <div>
                <IconButton
                  color="primary"
                  size="small"
                  onClick={() => {
                    onChangeContent(compiledContent);
                  }}
                  title="Pre-render template (optional)"
                >
                  <Prerender />
                </IconButton>
              </div>
            )}
            <TextField
              label="Content (Rendered)"
              fullWidth={true}
              value={compiledContent}
              disabled={true}
              multiline={true}
              title={
                "This is the content that will be sent to Obsidian when interacting with the API. " +
                (showCrystalizeOption
                  ? "If you would like to modify this content before the request, use the 'Pre-render' button."
                  : "")
              }
            />
          </Stack>
        )}
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
