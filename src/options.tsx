import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom";

import compareVersions from "compare-versions";

import ThemeProvider from "@mui/system/ThemeProvider";
import Button from "@mui/material/Button";
import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import MaterialAlert from "@mui/material/Alert";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import IconButton from "@mui/material/IconButton";
import Modal from "@mui/material/Modal";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormGroup from "@mui/material/FormGroup";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Chip from "@mui/material/Chip";
import Snackbar from "@mui/material/Snackbar";

import SecureConnection from "@mui/icons-material/GppGood";
import InsecureConnection from "@mui/icons-material/GppMaybe";
import Error from "@mui/icons-material/Error";
import Copy from "@mui/icons-material/ContentCopy";
import Promote from "@mui/icons-material/ArrowCircleUp";
import Star from "@mui/icons-material/StarRate";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import CreateIcon from "@mui/icons-material/AddCircle";
import RestoreIcon from "@mui/icons-material/SettingsBackupRestore";

import {
  DefaultContentTemplate,
  DefaultHeaders,
  DefaultMethod,
  DefaultSyncSettings,
  DefaultUrlTemplate,
  MinVersion,
} from "./constants";
import {
  ExtensionSyncSettings,
  OutputPreset,
  AlertStatus,
  ExtensionLocalSettings,
  StatusResponse,
} from "./types";
import {
  getLocalSettings,
  getSyncSettings,
  obsidianRequest,
  compileTemplate,
} from "./utils";
import Alert from "./components/Alert";
import RequestParameters from "./components/RequestParameters";
import { PurpleTheme } from "./theme";

const Options = () => {
  const minVersion = MinVersion;

  const [loaded, setLoaded] = useState<boolean>(false);
  const [status, setStatus] = useState<AlertStatus>();
  const [pluginVersion, setPluginVersion] = useState<string>();
  const [modalStatus, setModalStatus] = useState<AlertStatus>();

  const [apiKey, setApiKey] = useState<string>("");
  const [apiKeyOk, setApiKeyOk] = useState<boolean>(false);
  const [apiKeyError, setApiKeyError] = useState<string>();

  const [searchEnabled, setSearchEnabled] = useState<boolean>(false);
  const [searchBackgroundEnabled, setSearchBackgroundEnabled] =
    useState<boolean>(false);
  const [searchMatchMentionTemplate, setSearchMatchMentionTemplate] =
    useState<string>("");
  const [searchMatchDirectTemplate, setSearchMatchDirectTemplate] =
    useState<string>("");

  const [presetName, setPresetName] = useState<string>("");
  const [insecureMode, setInsecureMode] = useState<boolean>(false);
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
      } else {
        let usedInsecureMode = false;
        let result: Response;
        try {
          result = await obsidianRequest(apiKey, "/", { method: "get" }, false);
        } catch (e) {
          try {
            result = await obsidianRequest(
              apiKey,
              "/",
              { method: "get" },
              true
            );
            usedInsecureMode = true;
          } catch (e) {
            setApiKeyError(
              `Unable to connect to Obsidian: ${
                (e as Error).message
              }. Obsidian Local REST API is probably running in secure-only mode, and your browser probably does not trust its certificate.  Either enable insecure mode from Obsidian Local REST API's settings panel, or see the settings panel for instructions regarding where to acquire the certificate you need to configure your browser to trust.`
            );
            return;
          }
        }

        const body: StatusResponse = await result.json();
        if (result.status !== 200) {
          setApiKeyError(
            `Unable to connect to Obsidian: (Status Code ${
              result.status
            }) ${JSON.stringify(body)}.`
          );
          return;
        }

        setPluginVersion(body.versions.self);

        if (!body.authenticated) {
          setApiKeyError(`Your API key was not accepted.`);
          return;
        }

        setInsecureMode(usedInsecureMode);
        setApiKeyError(undefined);
        setApiKeyOk(true);
      }

      if (loaded) {
        // If we are *not* loaded, it means we're just in the process
        // of populating the form from stored settings.  If we are,
        // it means you've changed something.
        await chrome.storage.local.set({
          apiKey,
          insecureMode,
        } as ExtensionLocalSettings);
        showSaveNotice();
      }
    }

    handle();
  }, [apiKey]);

  useEffect(() => {
    if (!loaded) {
      return;
    }
    async function handle() {
      await chrome.storage.sync.set({
        presets,
        searchEnabled,
        searchBackgroundEnabled,
        searchMatchDirectTemplate,
        searchMatchMentionTemplate,
      } as ExtensionSyncSettings);
      showSaveNotice();
    }

    handle();
  }, [
    presets,
    searchEnabled,
    searchBackgroundEnabled,
    searchMatchDirectTemplate,
    searchMatchMentionTemplate,
  ]);

  useEffect(() => {
    // Restores select box and checkbox state using the preferences
    // stored in chrome.storage.
    async function handle() {
      const syncSettings = await getSyncSettings(chrome.storage.sync);
      const localSettings = await getLocalSettings(chrome.storage.local);

      setApiKey(localSettings.apiKey);
      setPresets(syncSettings.presets);
      setSearchEnabled(syncSettings.searchEnabled);
      setSearchBackgroundEnabled(syncSettings.searchBackgroundEnabled);
      setSearchMatchDirectTemplate(syncSettings.searchMatchDirectTemplate);
      setSearchMatchMentionTemplate(syncSettings.searchMatchMentionTemplate);
      setLoaded(true);

      // If we do not have "tabs" permission; we can't really use
      // background search; so let's un-toggle that so they can re-toggle
      // it to re-probe for permissions
      chrome.permissions.contains(
        {
          permissions: ["tabs"],
        },
        (result) => {
          if (!result) {
            setSearchBackgroundEnabled(false);
          }
        }
      );
    }

    handle();
  }, []);

  const closeEditingModal = () => {
    setEditingPreset(undefined);
  };

  const openEditingModal = (
    idx: number | null,
    template?: number | undefined
  ) => {
    prepareForm(template ?? idx ?? null, template !== undefined);
    setEditingPreset(idx ?? -1);
  };

  const prepareForm = (idx: number | null, fromTemplate?: boolean) => {
    if (idx !== null) {
      const preset = presets[idx];

      setPresetName(fromTemplate ? `Copy of ${preset.name}` : preset.name);
      setContentTemplate(preset.contentTemplate);
      setUrlTemplate(preset.urlTemplate);
      setMethod(preset.method);
      setHeaders(preset.headers);
    } else {
      setPresetName("Untitled Preset");
      setContentTemplate(DefaultContentTemplate);
      setUrlTemplate(DefaultUrlTemplate);
      setMethod(DefaultMethod);
      setHeaders(DefaultHeaders);
    }
  };

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

  const restoreDefaultTemplates = () => {
    setPresets([...presets, ...DefaultSyncSettings.presets]);
  };

  const savePreset = async () => {
    if (editingPreset === undefined) {
      return;
    }

    let errorMessage: string | undefined = undefined;

    try {
      await compileTemplate(contentTemplate, {});
    } catch (e) {
      errorMessage = "Could not compile content template.";
    }

    if (!errorMessage) {
      try {
        await compileTemplate(urlTemplate, {});
      } catch (e) {
        errorMessage = "Could not compile url template.";
      }
    }

    if (errorMessage) {
      setModalStatus({
        severity: "error",
        title: "Error",
        message: `Could not save preset: ${errorMessage}`,
      });
    } else {
      setModalStatus(undefined);
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
      closeEditingModal();
    }
  };

  const onToggleBackgroundSearch = (targetStateEnabled: boolean) => {
    if (targetStateEnabled) {
      chrome.permissions.request(
        {
          permissions: ["tabs"],
        },
        (granted) => {
          if (granted) {
            setSearchBackgroundEnabled(targetStateEnabled);
          }
        }
      );
    } else {
      chrome.permissions.remove(
        {
          permissions: ["tabs"],
        },
        (removed) => {
          if (removed) {
            setSearchBackgroundEnabled(targetStateEnabled);
          }
        }
      );
    }
  };

  const showSaveNotice = () => {
    setStatus({
      severity: "success",
      title: "Success",
      message: "Options saved",
    });
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
                <a
                  href="https://github.com/coddingtonbear/obsidian-local-rest-api"
                  target="_blank"
                >
                  Local REST API
                </a>{" "}
                plugin. Before beginning to use this, you will want to install
                and enable that plugin from within Obsidian.
              </Typography>
              <div className="option">
                <div className="option-value api-key">
                  <TextField
                    label="API Key"
                    value={apiKey}
                    helperText="You can find your API key in the 'Local REST API' section of your settings in Obsidian."
                    onChange={(event) => setApiKey(event.target.value)}
                  />
                  <div className="api-key-valid-icon">
                    {apiKeyOk && (
                      <>
                        {insecureMode && (
                          <InsecureConnection
                            color="warning"
                            fontSize="large"
                            titleAccess="Connected insecurely to the API via HTTP."
                          />
                        )}
                        {!insecureMode && (
                          <SecureConnection
                            color="success"
                            fontSize="large"
                            titleAccess="Connected securely to the API via HTTPS."
                          />
                        )}
                      </>
                    )}
                    {apiKeyError && (
                      <Error
                        color="error"
                        fontSize="large"
                        titleAccess="Could not connect to the API."
                      />
                    )}
                  </div>
                </div>
                {apiKeyError && (
                  <div className="option-value">
                    <MaterialAlert severity="error">
                      {apiKeyError}
                    </MaterialAlert>
                  </div>
                )}
                {pluginVersion &&
                  compareVersions(pluginVersion, minVersion) < 0 && (
                    <>
                      <div className="option-value">
                        <MaterialAlert severity="warning">
                          <strong>
                            Your install of Obsidian Local REST API is
                            out-of-date and missing some important capabilities.
                          </strong>{" "}
                          Some features may not work correctly as a result.
                          Please go to the "Community Plugins" section of your
                          settings in Obsidian to update the "Obsidian Local
                          REST API" plugin to the latest version.
                        </MaterialAlert>
                      </div>
                    </>
                  )}
              </div>
              <div className="option">
                <h2>Note Recall</h2>
                <Typography paragraph={true}>
                  Have you been to this page before? Maybe you already have
                  notes about it. Enabling this feature will let this extension
                  search your notes when you click on the extension icon and, if
                  you enable background searches, show a badge on the extension
                  icon while you are browsing the web to let you know that you
                  have notes about the page you are currently visiting.
                </Typography>
                <FormGroup>
                  <FormControlLabel
                    control={
                      <Switch
                        onChange={(evt) => {
                          // If background search is enabled; disable it first.
                          if (searchBackgroundEnabled) {
                            onToggleBackgroundSearch(false);
                          }
                          setSearchEnabled(evt.target.checked);
                        }}
                        checked={searchEnabled}
                      />
                    }
                    label={
                      <>
                        Search for previous notes about this page when you open
                        the extension menu?
                      </>
                    }
                  />
                </FormGroup>
                <FormGroup>
                  <FormControlLabel
                    control={
                      <Switch
                        onChange={(evt) =>
                          onToggleBackgroundSearch(evt.target.checked)
                        }
                        disabled={!searchEnabled}
                        checked={searchBackgroundEnabled}
                      />
                    }
                    label={
                      <>
                        Search for previous notes about this page in the
                        background?
                        <Chip size="small" label="Requires extra permissions" />
                      </>
                    }
                  />
                </FormGroup>
                {searchEnabled && (
                  <Paper className="paper-option-panel">
                    <h3>Page Notes</h3>
                    <Typography paragraph={true}>
                      When the URL of the page you are visiting has been found
                      to match the <code>url</code> field in the frontmatter of
                      an existing note in your vault, suggest this template for
                      updating the existing note:
                    </Typography>
                    <Select
                      label="When in frontmatter"
                      value={searchMatchDirectTemplate}
                      fullWidth={true}
                      displayEmpty={true}
                      onChange={(event) =>
                        setSearchMatchDirectTemplate(event.target.value)
                      }
                    >
                      <MenuItem value="">
                        None (Do not suggest updating the existing note)
                      </MenuItem>
                      {presets.map((preset) => (
                        <MenuItem key={preset.name} value={preset.name}>
                          {preset.name}
                        </MenuItem>
                      ))}
                    </Select>
                    <h3>Mentions</h3>
                    <Typography paragraph={true}>
                      When the URL of the page you are visiting has been found
                      in the content of a note in your vault, suggest this
                      template for updating the existing note:
                    </Typography>
                    <Select
                      label="When mentioned"
                      value={searchMatchMentionTemplate}
                      fullWidth={true}
                      displayEmpty={true}
                      onChange={(event) =>
                        setSearchMatchMentionTemplate(event.target.value)
                      }
                    >
                      <MenuItem value="">
                        None (Do not suggest updating the existing note)
                      </MenuItem>
                      {presets.map((preset) => (
                        <MenuItem key={preset.name} value={preset.name}>
                          {preset.name}
                        </MenuItem>
                      ))}
                    </Select>
                  </Paper>
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
                          <TableCell></TableCell>
                          <TableCell>Name</TableCell>
                          <TableCell align="right">Options</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {presets.map((preset, idx) => (
                          <TableRow key={preset.name + idx}>
                            <TableCell>
                              {idx === 0 && (
                                <Star fontSize="small" titleAccess="Default" />
                              )}
                            </TableCell>
                            <TableCell component="th" scope="row">
                              {preset.name}
                            </TableCell>
                            <TableCell align="right">
                              {idx !== 0 && (
                                <IconButton
                                  title="Make Default"
                                  aria-label="make default"
                                  onClick={() => {
                                    setAsDefault(idx);
                                  }}
                                >
                                  <Promote />
                                </IconButton>
                              )}
                              <IconButton
                                title="Edit"
                                aria-label="edit"
                                onClick={() => {
                                  openEditingModal(idx);
                                }}
                              >
                                <EditIcon />
                              </IconButton>
                              <IconButton
                                title="Duplicate"
                                aria-label="duplicate"
                                onClick={() => {
                                  openEditingModal(null, idx);
                                }}
                              >
                                <Copy />
                              </IconButton>
                              {presets.length > 1 && (
                                <IconButton
                                  title="Delete"
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
                          <TableCell></TableCell>
                          <TableCell component="th" scope="row"></TableCell>
                          <TableCell align="right">
                            <IconButton
                              onClick={() => restoreDefaultTemplates()}
                            >
                              <RestoreIcon titleAccess="Restore default templates" />
                            </IconButton>
                            <IconButton onClick={() => openEditingModal(null)}>
                              <CreateIcon titleAccess="Create new template" />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                    </Table>
                  </TableContainer>
                </div>
              </div>
              <Paper className="protip">
                <Typography paragraph={true}>
                  <strong>Protip:</strong> Looking for ideas about how you can
                  use this plugin to improve your workflow; have a look at the{" "}
                  <a
                    href="https://github.com/coddingtonbear/obsidian-web/wiki"
                    target="_blank"
                  >
                    Wiki
                  </a>{" "}
                  for tips.
                </Typography>
              </Paper>
              <Snackbar
                open={Boolean(status)}
                autoHideDuration={5000}
                onClose={() => setStatus(undefined)}
              >
                <div>{status && <Alert value={status} />}</div>
              </Snackbar>
            </>
          )}
        </div>
      </Paper>
      <Modal
        open={editingPreset !== undefined}
        onClose={() => closeEditingModal()}
      >
        <Paper elevation={3} className="modal">
          <div className="option">
            <div className="option-value">
              <TextField
                label="Template Name"
                fullWidth={true}
                value={presetName}
                onChange={(event) => setPresetName(event.target.value)}
              />
            </div>
          </div>
          <Typography paragraph={true}>
            Enter your template information below. You may use the following
            template properties in the "Content" and "API URL" fields:
          </Typography>
          <ul>
            <li>
              <code>&#123;&#123;page.url&#125;&#125;</code>: The URL of your the
              page you are on.
            </li>
            <li>
              <code>&#123;&#123;page.title&#125;&#125;</code>: The title of the
              page you are on.
            </li>
            <li>
              <code>&#123;&#123;page.content&#125;&#125;</code>: The page
              content of the page you are currently on as Markdown text.
            </li>
            <li>
              <code>&#123;&#123;page.selectedText&#125;&#125;</code>: The text
              (if any) that is currently selected on the page you are on.
            </li>
          </ul>
          <Typography paragraph={true}>
            Additionally, you have access to the following helpers for
            formatting your notes:
          </Typography>
          <ul>
            <li>
              <code>&#123;&#123;date&#125;&#125;</code>: Displays a timestamp.
              By default this uses the format "yyyy-MM-dd HH:mm:ss", but you can
              configure the format used by providing a second parameter; for
              example:
              <code>&#123;&#123;date "EEEE, MMMM do"&#125;&#125;</code> would
              display a timestamp like "Friday, February 18th". See{" "}
              <a
                href="https://date-fns.org/v2.28.0/docs/format"
                target="_blank"
              >
                here
              </a>{" "}
              for a full list of formatting codes.
            </li>
            <li>
              <code>&#123;&#123;filename FIELD&#125;&#125;</code>: Strips any
              characters from <code>FIELD</code> that are not safe in a
              filename.
            </li>
            <li>
              <code>&#123;&#123;json FIELD&#125;&#125;</code>: Encodes value in{" "}
              <code>FIELD</code> as a JSON string.
            </li>
            <li>
              <code>&#123;&#123;quote FIELD&#125;&#125;</code>: Prefixes each
              line in <code>FIELD</code> with <code>&gt; </code> so as to cause
              it to be displayed as a quote in your notes.
            </li>
            <li>
              <code>&#123;&#123;uuid&#125;&#125;</code>: Returns a
              randomly-generated v4 UUID.
            </li>
          </ul>

          <Typography paragraph={true}>
            These templates use the{" "}
            <a href="https://handlebarsjs.com/guide/" target="_blank">
              Handlebars template language
            </a>
            ; so you also have access to any features provided by it.
          </Typography>
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
            <Button variant="outlined" onClick={() => closeEditingModal()}>
              Cancel
            </Button>
            <Button variant="contained" onClick={savePreset}>
              Save Changes
            </Button>
          </div>
          <Snackbar
            open={Boolean(modalStatus)}
            autoHideDuration={5000}
            onClose={() => setModalStatus(undefined)}
          >
            <div>{modalStatus && <Alert value={modalStatus} />}</div>
          </Snackbar>
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
