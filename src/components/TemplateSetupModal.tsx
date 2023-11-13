import * as React from "react";

import RequestParameters from "./RequestParameters";
import Modal from "@mui/material/Modal";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import { ConfiguredTemplate } from "../types";
import { DefaultPreviewContext } from "../constants";

export interface Props {
  open: boolean;
  sandbox: HTMLIFrameElement;
  isAdhocSelectedTemplate?: boolean;
  name?: string;
  method?: ConfiguredTemplate["method"];
  urlTemplate?: string;
  headers?: Record<string, string>;
  contentTemplate?: string;
  onSave: (preset: ConfiguredTemplate) => void;
  onClose: () => void;
}

const TemplateSetupModal: React.FunctionComponent<Props> = ({
  open,
  sandbox,
  isAdhocSelectedTemplate = true,
  name: originalName,
  method: originalMethod = "post",
  urlTemplate: originalUrlTemplate,
  headers: originalHeaders,
  contentTemplate: originalContentTemplate,
  onSave,
  onClose,
}) => {
  const [name, setName] = React.useState<string>(originalName ?? "");
  const [contentTemplate, setContentTemplate] = React.useState<string>(
    originalContentTemplate ?? ""
  );
  const [urlTemplate, setUrlTemplate] = React.useState<string>(
    originalUrlTemplate ?? ""
  );
  const [headers, setHeaders] = React.useState<Record<string, string>>(
    originalHeaders ?? {}
  );
  const [method, setMethod] =
    React.useState<ConfiguredTemplate["method"]>(originalMethod);

  const [saveError, setSaveError] = React.useState<boolean>(false);

  const onAttemptSave = () => {
    const preset: ConfiguredTemplate = {
      name: name ? name : undefined,
      urlTemplate: urlTemplate,
      contentTemplate: contentTemplate,
      headers: headers,
      method: method,
    };

    onSave(preset);
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Paper elevation={3} className="modal">
        {isAdhocSelectedTemplate && (
          <div className="option">
            <div className="option-value">
              <TextField
                label="Template Name"
                fullWidth={true}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>
          </div>
        )}
        <Typography paragraph={true}>
          {isAdhocSelectedTemplate ? (
            <>
              You can use templating in your API URL and Content fields below.
            </>
          ) : (
            <>You can use templating in your Content field below.</>
          )}
          See Obsidian Web's{" "}
          <a
            href="https://github.com/coddingtonbear/obsidian-web/wiki/Understanding-Templates"
            target="_blank"
          >
            template documentation
          </a>{" "}
          to get an understanding of how to write your{" "}
          <a href="https://handlebarsjs.com/guide/" target="_blank">
            Handlebars
          </a>{" "}
          template and what context variables and helpers are available.
        </Typography>
        {isAdhocSelectedTemplate && (
          <Typography paragraph={true}>
            See{" "}
            <a
              href="https://coddingtonbear.github.io/obsidian-local-rest-api/"
              target="_blank"
            >
              Obsidian Local REST API's live documentation
            </a>{" "}
            for insight into the options available for API URL.
          </Typography>
        )}
        <RequestParameters
          allowUrlConfiguration={isAdhocSelectedTemplate}
          method={method}
          sandbox={sandbox}
          previewContext={DefaultPreviewContext}
          url={urlTemplate}
          headers={headers}
          content={contentTemplate}
          onChangeMethod={setMethod}
          onChangeUrl={setUrlTemplate}
          onChangeHeaders={setHeaders}
          onChangeContent={setContentTemplate}
          onChangeIsValid={(valid) => setSaveError(!valid)}
        />
        <div className="submit">
          <Button variant="outlined" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={onAttemptSave}
            disabled={saveError}
          >
            Save Changes
          </Button>
        </div>
      </Paper>
    </Modal>
  );
};

export default TemplateSetupModal;
