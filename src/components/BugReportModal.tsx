import React, { useState } from "react";

import Button from "@mui/material/Button";
import Modal from "@mui/material/Modal";
import Paper from "@mui/material/Paper";
import FormGroup from "@mui/material/FormGroup";
import FormControlLabel from "@mui/material/FormControlLabel";
import Typography from "@mui/material/Typography";
import Switch from "@mui/material/Switch";

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

  return (
    <Modal open={open} onClose={onClose}>
      <Paper elevation={3} className="modal">
        <div className="modal-content">
          <Typography paragraph={true}>
            You may be asked to provide this file as part of a bug report
            submission. This file will include basic information about the
            environment in which you are running this extension and optionally
            may include logs or information about the template presets you have
            configured.
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
                <b>Include log entries from the previous fifteen minutes?</b>
                &nbsp;This information is needed when troubleshooting problems
                that are occurring in background scripts. If you select this
                option, the exported file may reveal private information like
                what websites you have recently visited in any tab.
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
                <b>Include a snapshot of your plugin configuration?</b>
                &nbsp;This information is needed when troubleshooting
                configuration or template-related problems. If you select this
                option, the exported file may reveal detailed information about
                the template presets you have created, the address of the host
                you have configured this extension to communicate with, the
                permissions you've granted to the plugin, and the options you
                have enabled within the plugin.
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
