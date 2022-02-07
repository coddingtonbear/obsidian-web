import React, { useEffect, useState } from "react";
import { compile } from "micromustache";
import ReactDOM from "react-dom";
import {
  DefaultContentTemplate,
  DefaultHeaders,
  DefaultMethod,
  DefaultUrlTemplate,
} from "./constants";
import ThemeProvider from "@mui/system/ThemeProvider";
import {
  Button,
  TextField,
  Typography,
  Alert as MaterialAlert,
} from "@mui/material";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import IconButton from "@mui/material/IconButton";
import Modal from "@mui/material/Modal";

import StarFilled from "@mui/icons-material/Star";
import StarEmpty from "@mui/icons-material/StarRate";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import CreateIcon from "@mui/icons-material/AddCircle";

import { ExtensionSettings, OutputPreset, AlertStatus } from "./types";
import { getSettings, obsidianRequest } from "./utils";
import Alert from "./components/Alert";
import RequestParameters from "./components/RequestParameters";
import { PurpleTheme } from "./theme";

const Options = () => {
  const [status, setStatus] = useState<AlertStatus>();

  const [apiKey, setApiKey] = useState<string>("");
  const [apiKeyOk, setApiKeyOk] = useState<boolean>(false);
  const [apiKeyError, setApiKeyError] = useState<string>();

  const [presetName, setPresetName] = useState<string>("");
  const [contentTemplate, setContentTemplate] = useState<string>("");
  const [urlTemplate, setUrlTemplate] = useState<string>("");
  const [headers, setHeaders] = useState<Record<string, string>>({});
  const [method, setMethod] = useState<OutputPreset["method"]>("post");

  const [editingPreset, setEditingPreset] = useState<number>();

  const [presets, setPresets] = useState<OutputPreset[]>([]);

  useEffect(() => {
    async function handle() {
      setApiKeyOk(false);
      if (apiKey === "") {
        setApiKeyError(undefined);
        return;
      }

      try {
        const result = await obsidianRequest(apiKey, "/", { method: "get" });

        if (result.status !== 200) {
          const body = await result.text();
          setApiKeyError(
            `Unable to connect to Obsidian: (Status Code ${result.status}) ${body}.`
          );
          return;
        }

        const jsonBody = await result.json();
        if (!jsonBody.authenticated) {
          setApiKeyError(`Your API key was not accepted.`);
          return;
        }
      } catch (e) {
        setApiKeyError(
          `Unable to connect to Obsidian: ${
            (e as Error).message
          }.  Your browser probably doesn't trust the Obsidian Local REST API's certificate.  See the settings panel for Obsidian Local REST API in Obsidian for instructions.`
        );
        return;
      }

      setApiKeyError(undefined);
      setApiKeyOk(true);
    }

    handle();
  }, [apiKey]);

  useEffect(() => {
    // Restores select box and checkbox state using the preferences
    // stored in chrome.storage.
    async function handle() {
      const settings = await getSettings(chrome.storage.sync);
      console.log(settings);

      setApiKey(settings.apiKey);
      setPresets(settings.presets);
    }

    handle();
  }, []);

  useEffect(() => {
    if (editingPreset === undefined) {
      return;
    }
    if (editingPreset === -1) {
      setPresetName("Untitled Preset");
      setContentTemplate(DefaultContentTemplate);
      setUrlTemplate(DefaultUrlTemplate);
      setMethod(DefaultMethod);
      setHeaders(DefaultHeaders);
    } else {
      const preset = presets[editingPreset];

      setPresetName(preset.name);
      setContentTemplate(preset.contentTemplate);
      setUrlTemplate(preset.urlTemplate);
      setMethod(preset.method);
      setHeaders(preset.headers);
    }
  }, [editingPreset]);

  const deletePreset = (idx: number) => {
    const newPresets = [...presets.slice(0, idx), ...presets.slice(idx + 1)];
    setPresets(newPresets);
  };

  const setAsDefault = (idx: number) => {
    const thisItem = presets[idx];

    const newPresets = [
      thisItem,
      ...presets.slice(0, idx),
      ...presets.slice(idx + 1),
    ];
    setPresets(newPresets);
  };

  const savePreset = () => {
    if (editingPreset === undefined) {
      return;
    }

    let errorMessage: string | undefined = undefined;

    try {
      compile(contentTemplate);
    } catch (e) {
      errorMessage = "Could not compile content template.";
    }

    if (!errorMessage) {
      try {
        compile(urlTemplate);
      } catch (e) {
        errorMessage = "Could not compile url template.";
      }
    }

    if (errorMessage) {
      setStatus({
        severity: "error",
        title: "Error",
        message: `Could not save preset: ${errorMessage}`,
      });
    } else {
      const preset = {
        name: presetName,
        urlTemplate: urlTemplate,
        contentTemplate: contentTemplate,
        headers: headers,
        method: method,
      };
      if (editingPreset === -1) {
        setPresets([...presets, preset]);
      } else {
        const newPresets = presets.slice();
        newPresets[editingPreset] = preset;
        setPresets(newPresets);
      }
      setEditingPreset(undefined);
    }
  };

  const saveOptions = () => {
    chrome.storage.sync.set(
      {
        apiKey,
        presets,
      } as ExtensionSettings,
      () => {
        setStatus({
          severity: "success",
          title: "Success",
          message: "Options saved",
        });
      }
    );
  };

  return (
    <ThemeProvider theme={PurpleTheme}>
      <Paper className="options-container">
        <div className="options-header">
          <div>
            <img src="./icon48.png" />
          </div>
          <h1>Obsidian Web Settings</h1>
        </div>
        <div className="option-panel">
          {editingPreset === undefined && (
            <>
              <Typography paragraph={true}>
                You can configure the connection between Obsidian Web and your
                Obsidian notes here.
              </Typography>
              <Typography paragraph={true}>
                Obsidian Web integrates with Obsidian via the interface provided
                by the{" "}
                <a href="https://github.com/coddingtonbear/obsidian-local-rest-api">
                  Local REST API
                </a>{" "}
                plugin. Before beginning to use this, you will want to install
                and enable that plugin from within Obsidian.
              </Typography>
              <div className="option">
                <div className="option-value">
                  <TextField
                    label="API Key"
                    value={apiKey}
                    helperText="You can find your API key from the 'Local REST API' section of your settings in Obsidian."
                    onChange={(event) => setApiKey(event.target.value)}
                  />
                </div>
                {apiKeyError && (
                  <div className="option-value">
                    <MaterialAlert severity="error">
                      {apiKeyError}
                    </MaterialAlert>
                  </div>
                )}
                {apiKeyOk && (
                  <div className="option-value">
                    <MaterialAlert severity="success">
                      This API Key was accepted.
                    </MaterialAlert>
                  </div>
                )}
              </div>
              <div className="option">
                <h2>Templates</h2>
                <Typography paragraph={true}>
                  You can configure multiple templates for use when inserting
                  content into Obsidian. Each template describes how to convert
                  information about the current tab into content for insertion
                  into your notes.
                </Typography>
                <div className="option-value">
                  <TableContainer component={Paper}>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Name</TableCell>
                          <TableCell align="right">Options</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {presets.map((preset, idx) => (
                          <TableRow key={preset.name}>
                            <TableCell component="th" scope="row">
                              {preset.name}
                            </TableCell>
                            <TableCell align="right">
                              {idx !== 0 && (
                                <IconButton
                                  aria-label="make default"
                                  onClick={() => {
                                    setAsDefault(idx);
                                  }}
                                >
                                  <StarEmpty />
                                </IconButton>
                              )}
                              <IconButton
                                aria-label="edit"
                                onClick={() => {
                                  setEditingPreset(idx);
                                }}
                              >
                                <EditIcon />
                              </IconButton>
                              {presets.length > 1 && (
                                <IconButton
                                  aria-label="delete"
                                  onClick={() => {
                                    deletePreset(idx);
                                  }}
                                >
                                  <DeleteIcon />
                                </IconButton>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                        <TableRow key="new">
                          <TableCell component="th" scope="row"></TableCell>
                          <TableCell align="right">
                            <IconButton onClick={() => setEditingPreset(-1)}>
                              <CreateIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </div>
              </div>
              {status && <Alert value={status} />}
              <div className="submit">
                <Button variant="outlined" onClick={() => window.close()}>
                  Close
                </Button>
                <Button variant="contained" onClick={saveOptions}>
                  Save Settings
                </Button>
              </div>
            </>
          )}
        </div>
      </Paper>
      <Modal
        open={editingPreset !== undefined}
        onClose={() => setEditingPreset(undefined)}
      >
        <Paper elevation={3} className="modal">
          <div className="option">
            <div className="option-value">
              <TextField
                label="Template Name"
                value={presetName}
                onChange={(event) => setPresetName(event.target.value)}
              />
            </div>
          </div>
          <Typography paragraph={true}>
            Enter your template information below. Note that you may use the
            following template properties in the "Content" and "API URL" fields:
          </Typography>
          <ul>
            <li>
              &#123;&#123; page.url &#125;&#125;: The URL of your the page you
              are on.
            </li>
            <li>
              &#123;&#123; page.title &#125;&#125;: The title of the page you
              are on.
            </li>
            <li>
              &#123;&#123; page.selectedContent &#125;&#125;: The text (if any)
              that is currently selected on the page you are on.
            </li>
          </ul>
          <Typography paragraph={true}>
            See{" "}
            <a
              target="_blank"
              href="https://coddingtonbear.github.io/obsidian-local-rest-api/"
            >
              Local REST API for Obsidian
            </a>
            's documentation for more information about how to construct these
            templates.
          </Typography>
          <RequestParameters
            method={method}
            url={urlTemplate}
            headers={headers}
            content={contentTemplate}
            onChangeMethod={setMethod}
            onChangeUrl={setUrlTemplate}
            onChangeHeaders={setHeaders}
            onChangeContent={setContentTemplate}
          />
          <div className="submit">
            <Button
              variant="outlined"
              onClick={() => setEditingPreset(undefined)}
            >
              Cancel
            </Button>
            <Button variant="contained" onClick={savePreset}>
              Save Changes
            </Button>
          </div>
        </Paper>
      </Modal>
    </ThemeProvider>
  );
};

ReactDOM.render(
  <React.StrictMode>
    <Options />
  </React.StrictMode>,
  document.getElementById("root")
);
