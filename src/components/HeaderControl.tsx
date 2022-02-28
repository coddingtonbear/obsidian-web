import React from "react";
import TextField from "@mui/material/TextField";

interface Props {
  headers: Record<string, string>;
  onChange: (headers: Record<string, string>) => void;
}

const HeaderControl: React.FC<Props> = ({ headers, onChange }) => {
  const [headersAsText, setHeadersAsText] = React.useState<string>("");

  React.useEffect(() => {
    const rows = [];
    for (const header in headers) {
      rows.push(`${header}: ${headers[header]}`);
    }
    setHeadersAsText(rows.join("\n"));
  }, [headers]);

  const onChangedHeadersAsText = (value: string) => {
    const generatedHeaders: Record<string, string> = {};

    for (const line of value.split("\n")) {
      const delimiter = line.indexOf(":");
      if (delimiter > -1) {
        generatedHeaders[line.slice(0, delimiter).trim()] = line
          .slice(delimiter + 1)
          .trim();
      }
    }

    onChange(generatedHeaders);
  };

  return (
    <>
      <TextField
        label="HTTP Headers"
        multiline={true}
        fullWidth={true}
        value={headersAsText}
        onChange={(event) => setHeadersAsText(event.target.value)}
        onBlur={(event) => onChangedHeadersAsText(event.target.value)}
      />
    </>
  );
};

export default HeaderControl;
