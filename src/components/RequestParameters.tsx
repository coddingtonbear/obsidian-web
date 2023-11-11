import React from "react";

import TextField from "@mui/material/TextField";

import { OutputPreset } from "../types";
import HeaderControl from "./HeaderControl";
import { NativeSelect } from "@mui/material";

interface Props {
  method: OutputPreset["method"];
  url: string;
  headers: Record<string, string>;
  content: string;

  onChangeMethod: (method: OutputPreset["method"]) => void;
  onChangeUrl: (url: string) => void;
  onChangeHeaders: (headers: Record<string, string>) => void;
  onChangeContent: (content: string) => void;
}

const RequestParameters: React.FC<Props> = ({
  method,
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
              onChangeMethod(event.target.value as OutputPreset["method"])
            }
          >
            <option value="post">POST</option>
            <option value="put">PUT</option>
            <option value="patch">PATCH</option>
          </NativeSelect>
          <TextField
            label="API URL"
            fullWidth={true}
            value={url}
            onChange={(event) => onChangeUrl(event.target.value)}
          />
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
