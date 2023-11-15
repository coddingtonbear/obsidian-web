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
import ImportSettings from "@mui/icons-material/FileUpload";
import ExportSettings from "@mui/icons-material/FileDownload";

import {
  DefaultContentTemplate,
  DefaultHeaders,
  DefaultMethod,
  DefaultSearchMatchTemplate,
  DefaultSyncSettings,
  DefaultUrlTemplate,
  MinVersion,
} from "./constants";
import {
  ExtensionSyncSettings,
  UrlOutputPreset,
  AlertStatus,
  ExtensionLocalSettings,
  StatusResponse,
  OutputPreset,
  ConfiguredTemplate,
} from "./types";
import {
  getLocalSettings,
  getSyncSettings,
  _obsidianRequest,
  checkHasHostPermission,
  requestHostPermission,
  checkKeyboardShortcut,
} from "./utils";
import Alert from "./components/Alert";
import { PurpleTheme } from "./theme";
import TemplateSetupModal from "./components/TemplateSetupModal";

export interface Props {
  sandbox: HTMLIFrameElement | null;
}

const Options: React.FunctionComponent<Props> = ({ sandbox }) => {
  const minVersion = MinVersion;

  const [loaded, setLoaded] = useState<boolean>(false);
  const [status, setStatus] = useState<AlertStatus>();
  const [pluginVersion, setPluginVersion] = useState<string>();

  const [presetEditorShown, setPresetEditorShown] = useState<boolean>(false);
  const [presetEditorIncludesName, setPresetEditorIncludesName] =
    useState<boolean>(false);
  const [presetUnderEdit, setPresetUnderEdit] = useState<ConfiguredTemplate>();
  const [presetEditorSave, setPresetEditorSave] = useState<
    (preset: ConfiguredTemplate) => void
  >(() => () => null);

  const [keyboardShortcut, setKeyboardShortcut] = useState<string>("");

  const [host, setHost] = useState<string>("127.0.0.1");
  const [tempHost, setTempHost] = useState<string>("127.0.0.1");
  const [hasHostPermission, setHasHostPermission] = useState<boolean | null>(
    null
  );

  const [apiKey, setApiKey] = useState<string>("");
  const [apiKeyOk, setApiKeyOk] = useState<boolean>(false);
  const [apiKeyError, setApiKeyError] = useState<string>();

  const [searchEnabled, setSearchEnabled] = useState<boolean>(false);
  const [searchBackgroundEnabled, setSearchBackgroundEnabled] =
    useState<boolean>(false);
  const [searchMatchMentionEnabled, setSearchMatchMentionEnabled] =
    useState<boolean>(false);
  const [searchMatchMentionTemplate, setSearchMatchMentionTemplate] =
    useState<OutputPreset>(DefaultSearchMatchTemplate);
  const [searchMatchDirectEnabled, setSearchMatchDirectEnabled] =
    useState<boolean>(false);
  const [searchMatchDirectTemplate, setSearchMatchDirectTemplate] =
    useState<OutputPreset>(DefaultSearchMatchTemplate);

  const [insecureMode, setInsecureMode] = useState<boolean>(false);

  const [requestingHostPermissionFor, setRequestingHostPermissionFor] =
    useState<string>();

  const [presets, setPresets] = useState<UrlOutputPreset[]>([]);

  useEffect(() => {
    if (loaded) {
      // If we are *not* loaded, it means we're just in the process
      // of populating the form from stored settings.  If we are,
      // it means you've changed something.
      chrome.storage.local.set({
        host,
        apiKey,
      } as ExtensionLocalSettings);
      showSaveNotice();
    }
    async function handle() {
      setApiKeyOk(false);
      let usedInsecureMode = false;

      if (apiKey === "") {
        setApiKeyError(undefined);
      } else {
        let result: Response;
        try {
          result = await _obsidianRequest(
            host,
            apiKey,
            "/",
            { method: "get" },
            false
          );
        } catch (e) {
          try {
            result = await _obsidianRequest(
              host,
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
              }. This error occurs when Obsidian Web does not have permission to access this hostname, or when Obsidian Local REST API is running in secure-only mode and your browser does not trust its certificate.  Make sure you have granted permission for this host, and either enable insecure mode from Obsidian Local REST API's settings panel, or see the settings panel for instructions regarding where to acquire the certificate you need to configure your browser to trust.`
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
          insecureMode: usedInsecureMode,
        } as ExtensionLocalSettings);
        showSaveNotice();
      }
    }

    handle();
  }, [apiKey, host, hasHostPermission]);

  useEffect(() => {
    if (!loaded) {
      return;
    }
    async function handle() {
      const syncSettings: ExtensionSyncSettings = {
        version: "2.0",
        presets,
        searchMatch: {
          enabled: searchEnabled,
          backgroundEnabled: searchBackgroundEnabled,
          mentions: {
            suggestionEnabled: searchMatchMentionEnabled,
            template: searchMatchMentionTemplate,
          },
          direct: {
            suggestionEnabled: searchMatchDirectEnabled,
            template: searchMatchDirectTemplate,
          },
        },
      };
      await chrome.storage.sync.set(syncSettings);
      showSaveNotice();
    }

    handle();
  }, [
    presets,
    searchEnabled,
    searchBackgroundEnabled,
    searchMatchDirectEnabled,
    searchMatchDirectTemplate,
    searchMatchMentionEnabled,
    searchMatchMentionTemplate,
  ]);

  useEffect(() => {
    // Restores select box and checkbox state using the preferences
    // stored in chrome.storage.
    async function handle() {
      const syncSettings = await getSyncSettings(chrome.storage.sync);
      const localSettings = await getLocalSettings(chrome.storage.local);

      setHost(localSettings.host);
      setTempHost(localSettings.host);
      setApiKey(localSettings.apiKey);
      setPresets(syncSettings.presets);
      setSearchEnabled(syncSettings.searchMatch.enabled);
      setSearchBackgroundEnabled(syncSettings.searchMatch.backgroundEnabled);
      setSearchMatchDirectEnabled(
        syncSettings.searchMatch.direct.suggestionEnabled
      );
      setSearchMatchDirectTemplate(syncSettings.searchMatch.direct.template);
      setSearchMatchMentionEnabled(
        syncSettings.searchMatch.mentions.suggestionEnabled
      );
      setSearchMatchMentionTemplate(syncSettings.searchMatch.mentions.template);
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

  useEffect(() => {
    async function handle() {
      const shortcut = await checkKeyboardShortcut();
      setKeyboardShortcut(shortcut);
    }
    handle();
  }, []);

  useEffect(() => {
    checkHasHostPermission(host).then((result) => {
      setHasHostPermission(result);
    });
  }, [host]);

  const openEditingModal = async (
    idx: number | null,
    template?: number | undefined
  ) => {
    prepareForm(template ?? idx ?? null, template !== undefined);
  };

  const showPresetEditor = (
    data: ConfiguredTemplate,
    showName: boolean,
    onSave: (preset: ConfiguredTemplate) => void
  ): void => {
    setPresetEditorIncludesName(showName);
    setPresetUnderEdit(data);
    setPresetEditorSave(() => (preset: ConfiguredTemplate) => {
      onSave(preset);
      hidePresetEditor();
    });
    setPresetEditorShown(true);
  };

  const hidePresetEditor = (): void => {
    setPresetUnderEdit(undefined);
    setPresetEditorShown(false);
  };

  const prepareForm = (idx: number | null, fromTemplate?: boolean) => {
    if (idx !== null) {
      const preset = presets[idx];

      const underEdit: ConfiguredTemplate = {
        name: fromTemplate ? `Copy of ${preset.name}` : preset.name,
        urlTemplate: preset.urlTemplate,
        contentTemplate: preset.contentTemplate,
        headers: preset.headers,
        method: preset.method,
      };
      showPresetEditor(underEdit, true, (preset: ConfiguredTemplate) => {
        const newPresets = presets.slice();
        newPresets[idx] = {
          ...preset,
          name: preset.name ?? "Untitled",
          urlTemplate: preset.urlTemplate ?? "/",
        };
        setPresets(newPresets);
        hidePresetEditor();
      });
    } else {
      const underEdit: ConfiguredTemplate = {
        name: "Untitled Preset",
        urlTemplate: DefaultUrlTemplate,
        contentTemplate: DefaultContentTemplate,
        headers: DefaultHeaders,
        method: DefaultMethod,
      };
      showPresetEditor(underEdit, true, (newPreset: ConfiguredTemplate) => {
        setPresets([
          ...presets,
          {
            ...newPreset,
            name: newPreset.name ?? "Untitled",
            urlTemplate: newPreset.urlTemplate ?? "/",
          },
        ]);
        hidePresetEditor();
      });
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

  const onExportSettings = async () => {
    const sync = await getSyncSettings(chrome.storage.sync);
    const local = await getLocalSettings(chrome.storage.local);

    const blob = new Blob([JSON.stringify({ sync, local }, null, 2)], {
      type: "application/json",
    });

    const elem = window.document.createElement("a");
    elem.href = window.URL.createObjectURL(blob);
    elem.download = "obsidian-local-rest-api.settings.json";
    document.body.appendChild(elem);
    elem.click();
    document.body.removeChild(elem);
  };

  const onImportSettings = async () => {
    const input = window.document.createElement("input");
    input.type = "file";

    input.onchange = (e) => {
      if (!e || !e.target) {
        return;
      }

      const files = (e.target as HTMLInputElement).files;
      if (!files) {
        return;
      }

      const file = files[0];
      const reader = new FileReader();
      reader.readAsText(file, "UTF-8");

      reader.onload = async (readerEvent) => {
        if (!readerEvent.target) {
          return;
        }

        const content = readerEvent.target.result as string;
        const parsed = JSON.parse(content);

        if (
          !parsed ||
          !parsed.sync ||
          compareVersions(parsed.sync.version, "0.2") > 0 ||
          !parsed.local ||
          compareVersions(parsed.local.version, "0.2") > 0
        ) {
          alert(
            "Could not parse configuration file!  See console for details."
          );
          console.error("Could not parse configuration file!", parsed);
        } else {
          await chrome.storage.sync.clear();
          await chrome.storage.sync.set(parsed.sync);
          await chrome.storage.local.clear();
          await chrome.storage.local.set(parsed.local);
          alert("Settings imported successfully!");
          window.location.reload();
        }
      };
    };
    input.click();
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
          <div className="left">
            <img src="./icon48.png" />
          </div>
          <h1>Obsidian Web Settings</h1>
          <div className="right">
            <div>
              <IconButton
                title="Import Settings as JSON"
                aria-label="import settings as JSON"
                onClick={onImportSettings}
              >
                <ImportSettings fontSize="small" />
              </IconButton>
              <IconButton
                title="Export Settings as JSON"
                aria-label="export settings as JSON"
                onClick={onExportSettings}
              >
                <ExportSettings fontSize="small" />
              </IconButton>
            </div>
          </div>
        </div>
        <div className="option-panel">
          <Typography paragraph={true}>
            Obsidian Web integrates with Obsidian via the interface provided by
            the{" "}
            <a
              href="https://github.com/coddingtonbear/obsidian-local-rest-api"
              target="_blank"
            >
              Local REST API
            </a>{" "}
            plugin. Before beginning to use this, you will want to install and
            enable that plugin from within Obsidian.
          </Typography>
          <div className="option">
            <div className="option-value host">
              <TextField
                label="Hostname"
                className="auth-field"
                onBlur={() => {
                  setHost(tempHost);
                  checkHasHostPermission(tempHost).then((result) => {
                    setHasHostPermission(result);
                    if (!result) {
                      setRequestingHostPermissionFor(tempHost);
                    }
                  });
                }}
                onChange={(event) => setTempHost(event.target.value)}
                value={tempHost}
                helperText="Hostname on which Obsidian is running (usually 127.0.0.1)."
              />
              <div className="validation-icon">
                {!hasHostPermission && (
                  <Error
                    className="action-icon"
                    color="error"
                    fontSize="large"
                    titleAccess="Missing permissions.  Click to grant."
                    onClick={() => setRequestingHostPermissionFor(host)}
                  />
                )}
              </div>
            </div>
          </div>
          <div className="option">
            <div className="option-value api-key">
              <TextField
                label="API Key"
                className="auth-field"
                value={apiKey}
                helperText="You can find your API key in the 'Local REST API' section of your settings in Obsidian."
                onChange={(event) => setApiKey(event.target.value)}
              />
              <div className="validation-icon">
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
                    className="action-icon"
                    onClick={() => {
                      const tempApiKey = apiKey;
                      setApiKey("");
                      setTimeout(() => {
                        setApiKey(tempApiKey);
                      }, 1);
                    }}
                    titleAccess="Could not connect to the API. Click to retry."
                  />
                )}
              </div>
            </div>
            {apiKeyError && (
              <div className="option-value">
                <MaterialAlert severity="error">{apiKeyError}</MaterialAlert>
              </div>
            )}
            {pluginVersion && compareVersions(pluginVersion, minVersion) < 0 && (
              <>
                <div className="option-value">
                  <MaterialAlert severity="warning">
                    <strong>
                      Your install of Obsidian Local REST API is out-of-date and
                      missing some important capabilities.
                    </strong>{" "}
                    Some features may not work correctly as a result. Please go
                    to the "Community Plugins" section of your settings in
                    Obsidian to update the "Obsidian Local REST API" plugin to
                    the latest version.
                  </MaterialAlert>
                </div>
              </>
            )}
          </div>
          <div className="option">
            <h2>Keyboard Shortcut</h2>
            {keyboardShortcut ? (
              <Typography paragraph={true}>
                You can launch Obsidian Web by pressing{" "}
                <code>{keyboardShortcut}</code>. If you would like to select a
                different shortcut, you can do so via{" "}
                <a
                  href="#"
                  onClick={(event) => {
                    chrome.tabs.create({
                      url: "chrome://extensions/shortcuts",
                    });
                    event.preventDefault();
                  }}
                >
                  Chrome's shortcut settings
                </a>
                .
              </Typography>
            ) : (
              <Typography paragraph={true}>
                No keyboard shortcut is currently configured. If you would like
                to select a shortcut, you can do so via{" "}
                <a
                  href="#"
                  onClick={(event) => {
                    chrome.tabs.create({
                      url: "chrome://extensions/shortcuts",
                    });
                    event.preventDefault();
                  }}
                >
                  Chrome's shortcut settings
                </a>
                .
              </Typography>
            )}
          </div>
          <div className="option">
            <h2>Note Recall</h2>
            <Typography paragraph={true}>
              Have you been to this page before? Maybe you already have notes
              about it. Enabling this feature will let this extension search
              your notes when you click on the extension icon and, if you enable
              background searches, show a badge on the extension icon while you
              are browsing the web to let you know that you have notes about the
              page you are currently visiting.
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
                    Search for previous notes about this page when you open the
                    extension menu?
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
                    Search for previous notes about this page in the background?
                    <Chip size="small" label="Requires extra permissions" />
                  </>
                }
              />
            </FormGroup>
            {searchEnabled && (
              <Paper className="paper-option-panel">
                <h3>Page Notes</h3>
                <Typography paragraph={true}></Typography>
                <FormGroup>
                  <FormControlLabel
                    control={
                      <Switch
                        onChange={(evt) =>
                          setSearchMatchDirectEnabled(evt.target.checked)
                        }
                        disabled={!searchEnabled}
                        checked={searchMatchDirectEnabled}
                      />
                    }
                    label={
                      <>
                        When the URL of the page you are visiting has been found
                        to match the <code>url</code> field in the frontmatter
                        of an existing note in your vault, suggest a template
                        for updating the existing note?
                      </>
                    }
                  />
                  <Button
                    disabled={!searchMatchDirectEnabled}
                    onClick={() => {
                      showPresetEditor(
                        searchMatchDirectTemplate,
                        false,
                        (preset: ConfiguredTemplate) => {
                          setSearchMatchDirectTemplate(preset);
                        }
                      );
                    }}
                    variant="outlined"
                  >
                    Configure Template to use for Page Notes
                  </Button>
                </FormGroup>
                <h3>Mentions</h3>
                <FormGroup>
                  <FormControlLabel
                    control={
                      <Switch
                        onChange={(evt) =>
                          setSearchMatchMentionEnabled(evt.target.checked)
                        }
                        disabled={!searchEnabled}
                        checked={searchMatchMentionEnabled}
                      />
                    }
                    label={
                      <>
                        When the URL of the page you are visiting has been found
                        in the content of a note in your vault, suggest a
                        template for updating the existing note?
                      </>
                    }
                  />
                  <Button
                    disabled={!searchMatchMentionEnabled}
                    onClick={() => {
                      showPresetEditor(
                        searchMatchMentionTemplate,
                        false,
                        (preset: ConfiguredTemplate) => {
                          setSearchMatchMentionTemplate(preset);
                        }
                      );
                    }}
                    variant="outlined"
                  >
                    Configure Template to use for Mentions
                  </Button>
                </FormGroup>
              </Paper>
            )}
          </div>
          <div className="option">
            <h2>Templates</h2>
            <Typography paragraph={true}>
              You can configure multiple templates for use when inserting
              content into Obsidian. Each template describes how to convert
              information about the current tab into content for insertion into
              your notes.
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
                        <IconButton onClick={() => restoreDefaultTemplates()}>
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
              <strong>Protip:</strong> Looking for ideas about how you can use
              this plugin to improve your workflow; have a look at the{" "}
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
        </div>
      </Paper>
      <Modal
        open={requestingHostPermissionFor !== undefined}
        onClose={() => {
          setRequestingHostPermissionFor(undefined);
        }}
      >
        <Paper elevation={3} className="permission-modal">
          <div className="modal-content">
            <Typography paragraph={true}>
              Obsidian Web needs your permission before it can interact with
              Obsidian's API on '{requestingHostPermissionFor}'.
            </Typography>
          </div>
          <div className="submit">
            <Button
              variant="outlined"
              onClick={() => setRequestingHostPermissionFor(undefined)}
            >
              Cancel
            </Button>
            {requestingHostPermissionFor && (
              <Button
                variant="contained"
                onClick={() => {
                  requestHostPermission(requestingHostPermissionFor).then(
                    (result) => {
                      setHasHostPermission(result);
                      if (result) {
                        setRequestingHostPermissionFor(undefined);
                      }
                    }
                  );
                }}
              >
                Grant Permissions
              </Button>
            )}
          </div>
        </Paper>
      </Modal>
      {sandbox && presetUnderEdit && (
        <TemplateSetupModal
          open={presetEditorShown}
          sandbox={sandbox}
          isAdhocSelectedTemplate={presetEditorIncludesName}
          name={presetUnderEdit.name}
          method={presetUnderEdit.method}
          urlTemplate={presetUnderEdit.urlTemplate}
          headers={presetUnderEdit.headers}
          contentTemplate={presetUnderEdit?.contentTemplate}
          onSave={presetEditorSave}
          onClose={hidePresetEditor}
        />
      )}
    </ThemeProvider>
  );
};

ReactDOM.render(
  <React.StrictMode>
    <Options
      sandbox={
        document.getElementById("handlebars-sandbox") as HTMLIFrameElement
      }
    />
  </React.StrictMode>,
  document.getElementById("root")
);
