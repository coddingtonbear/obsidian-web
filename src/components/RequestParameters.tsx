import React from "react";

import TextField from "@mui/material/TextField";

import { UrlOutputPreset } from "../types";
import HeaderControl from "./HeaderControl";
import { NativeSelect, Typography } from "@mui/material";

interface Props {
  method: UrlOutputPreset["method"];
  allowUrlConfiguration?: boolean;
  url: string;
  headers: Record<string, string>;
  content: string;

  onChangeMethod: (method: UrlOutputPreset["method"]) => void;
  onChangeUrl: (url: string) => void;
  onChangeHeaders: (headers: Record<string, string>) => void;
  onChangeContent: (content: string) => void;
}

const RequestParameters: React.FC<Props> = ({
  method,
  allowUrlConfiguration = true,
  url,
  headers,
  content,
  onChangeMethod,
  onChangeUrl,
  onChangeHeaders,
  onChangeContent,
}) => {
  return (
    <>
      <div className="option">
        <div className="option-value">
          <NativeSelect
            value={method}
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
      </div>
      <div className="option">
        <div className="option-value">
          <HeaderControl headers={headers} onChange={onChangeHeaders} />
        </div>
      </div>
      <div className="option">
        <div className="option-value">
          <TextField
            label="Content"
            fullWidth={true}
            multiline={true}
            value={content}
            onChange={(event) => onChangeContent(event.target.value)}
          />
        </div>
      </div>
    </>
  );
};

export default RequestParameters;
