import React, { useState, useMemo } from "react";

import { detect } from "detect-browser";

import Button from "@mui/material/Button";
import Modal from "@mui/material/Modal";
import Paper from "@mui/material/Paper";
import FormGroup from "@mui/material/FormGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Typography from "@mui/material/Typography";
import Switch from "@mui/material/Switch";
import UnsupportedEnvironmentWarning from "./UnsupportedEnvironmentWarning";

interface Props {
  open: boolean;
  onClose: () => void;
  onExportBugReportData: (logs: boolean, configuration: boolean) => void;
}

const BugReportModal: React.FC<Props> = ({
  open,
  onClose,
  onExportBugReportData,
}) => {
  const [bugReportExportLogs, setBugReportExportLogs] = useState<boolean>(true);
  const [bugReportExportConfig, setBugReportExportConfig] =
    useState<boolean>(true);

  const browser = useMemo(detect, []);

  return (
    <Modal open={open} onClose={onClose}>
      <Paper elevation={3} className="modal">
        <div className="modal-content">
          <h1>Are you having trouble?</h1>

          {browser && browser.name !== "chrome" && (
            <UnsupportedEnvironmentWarning />
          )}
          <Typography paragraph={true}>
            If you think you've found a bug or are looking for help with
            something else, you can find ongoing discussions on{" "}
            <a
              target="_blank"
              href="https://github.com/coddingtonbear/obsidian-web/discussions"
            >
              our support forum
            </a>{" "}
            — maybe somebody else has already found the answer you're looking
            for. If you think you've found something new that you'd like to
            report, feel free to create a new{" "}
            <a
              target="_blank"
              href="https://github.com/coddingtonbear/obsidian-web/discussions/new?category=bug-report"
            >
              Bug Report
            </a>
            . You might be able to speed things along, too, if you provide the
            an export generated using the below form.
          </Typography>

          <Typography paragraph={true}>
            You may be asked to provide a bug report export as part of a bug
            report submission, and you can generate that by using the below
            form. This file will include basic information about the environment
            in which you are running this extension and optionally may include
            logs or information about the template presets you have configured.
          </Typography>
        </div>
        <FormGroup>
          <FormControlLabel
            control={
              <Switch
                onChange={(evt) => {
                  setBugReportExportLogs(evt.target.checked);
                }}
                checked={bugReportExportLogs}
              />
            }
            label={
              <>
                <b>Include log entries from the previous fifteen minutes?</b>{" "}
                This information is needed when troubleshooting problems that
                are occurring in background scripts. If you select this option,
                the exported file may reveal private information like what
                websites you have recently visited in any tab.
              </>
            }
          />
        </FormGroup>
        <FormGroup>
          <FormControlLabel
            control={
              <Switch
                onChange={(evt) => {
                  setBugReportExportConfig(evt.target.checked);
                }}
                checked={bugReportExportConfig}
              />
            }
            label={
              <>
                <b>Include a snapshot of your plugin configuration?</b> This
                information is needed when troubleshooting configuration or
                template-related problems. If you select this option, the
                exported file may reveal detailed information about the template
                presets you have created, the address of the host you have
                configured this extension to communicate with, the permissions
                you've granted to the plugin, and the options you have enabled
                within the plugin.
              </>
            }
          />
        </FormGroup>
        <div className="submit">
          <Button variant="outlined" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={() =>
              onExportBugReportData(bugReportExportLogs, bugReportExportConfig)
            }
          >
            Export
          </Button>
        </div>
      </Paper>
    </Modal>
  );
};

export default BugReportModal;
