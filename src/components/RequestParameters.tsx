import React from "react";

import TextField from "@mui/material/TextField";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";

import { OutputPreset } from "../types";
import HeaderControl from "./HeaderControl";

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
          <Select
            label="HTTP Method"
            value={method}
            onChange={(event) =>
              onChangeMethod(event.target.value as OutputPreset["method"])
            }
          >
            <MenuItem value="post">POST</MenuItem>
            <MenuItem value="put">PUT</MenuItem>
            <MenuItem value="patch">PATCH</MenuItem>
          </Select>
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
