import React, { useEffect, useMemo, useState } from "react";
import ReactDOM from "react-dom";

import compareVersions from "compare-versions";
import { detect } from "detect-browser";
import Joyride, {
  CallBackProps as JoyrideCallbackProps,
  STATUS as JOYRIDE_STATUS,
  Status as JoyrideStatusType,
} from "react-joyride";

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
import BugReport from "@mui/icons-material/BugReport";

import {
  CurrentMaxOnboardingVersion,
  DefaultContentTemplate,
  DefaultHeaders,
  DefaultMethod,
  DefaultSearchMatchTemplate,
  DefaultSyncSettings,
  DefaultUrlTemplate,
  LocalSettingsVersion,
  MinVersion,
  SyncSettingsVersion,
} from "./constants";
import {
  ExtensionSyncSettings,
  UrlOutputPreset,
  AlertStatus,
  ExtensionLocalSettings,
  StatusResponse,
  OutputPreset,
  ConfiguredTemplate,
  LogEntry,
  AutoOpenOption,
  OnboardingStep,
} from "./types";
import {
  getLocalSettings,
  getSyncSettings,
  checkHasHostPermission,
  requestHostPermission,
  checkKeyboardShortcut,
  getBackgroundErrorLog,
  compileTemplateCallback,
  compileTemplateCallbackController,
} from "./utils";
import { _obsidianRequest } from "./utils/private_requests";
import Alert from "./components/Alert";
import { PurpleTheme } from "./theme";
import TemplateSetupModal from "./components/TemplateSetupModal";
import BugReportModal from "./components/BugReportModal";
import UnsupportedEnvironmentWarning from "./components/UnsupportedEnvironmentWarning";
import { FormControl, MenuItem, Select } from "@mui/material";
import WikiLink from "./components/WikiLink";

export interface Props {
  sandbox: HTMLIFrameElement | null;
}

export const OnboardingSteps: OnboardingStep[] = [
  {
    disableBeacon: true,
    target: "#api-key-settings-panel",
    content: (
      <>
        <h1>Thanks for trying Obsidian Web!</h1>
        <Typography paragraph={true}>
          To get started, you will need to give Obsidian Web some information
          from your Obsidian Local REST API plugin's settings so it can connect
          to your notes.
        </Typography>
      </>
    ),
  },
  {
    disableBeacon: true,
    target: "#templates-section",
    content: (
      <Typography paragraph={true}>
        After that, you can set up as many "Templates" as you would like. These
        templates are used for transforming the content shown on the page you
        are currently visiting into the content you would like to add to your
        notes.
      </Typography>
    ),
  },
  {
    disableBeacon: true,
    target: "#protip-section",
    content: (
      <Typography paragraph={true}>
        If you're curious about other ideas around how Obsidian Web can be used
        to improve your workflow, you might want to check out the wiki and
        discussions linked at the bottom of the page.
      </Typography>
    ),
  },
  {
    disableBeacon: true,
    onboardingVersion: "3.2",
    skipDuringInitialOnboarding: true,
    target: "#automatically-display-matches-section",
    content: (
      <Typography paragraph={true}>
        <b>New in 3.2: </b>
        You can now have a message shown when the URL you are currently visiting
        has associated notes.
      </Typography>
    ),
  },
  {
    disableBeacon: true,
    onboardingVersion: "3.2",
    skipDuringInitialOnboarding: true,
    target: "#hover-messages-toggle",
    content: (
      <Typography paragraph={true}>
        <b>New in 3.2: </b>
        You can now see when links you are hovering your mouse over have
        associated notes, too.
      </Typography>
    ),
  },
  {
    disableBeacon: true,
    onboardingVersion: "3.2",
    target: "#bug-report-button",
    content: (
      <>
        <Typography paragraph={true}>
          Have you found something that isn't working? Click on this button to
          see how you can report a bug.
        </Typography>
        <Typography paragraph={true}>
          Please keep in mind that the people working on this project are doing
          so as volunteers, and that those volunteers could just as easily be
          having a beer on a beach somewhere instead of making free tools like
          this. Being thorough in your report and polite goes a long way!
        </Typography>
      </>
    ),
  },
];

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
  const [hoverEnabled, setHoverEnabled] = useState<boolean>(false);
  const [searchMatchMentionEnabled, setSearchMatchMentionEnabled] =
    useState<boolean>(false);
  const [searchMatchMentionTemplate, setSearchMatchMentionTemplate] =
    useState<OutputPreset>(DefaultSearchMatchTemplate);
  const [searchMatchDirectEnabled, setSearchMatchDirectEnabled] =
    useState<boolean>(false);
  const [searchMatchDirectTemplate, setSearchMatchDirectTemplate] =
    useState<OutputPreset>(DefaultSearchMatchTemplate);
  const [searchMatchAutoOpen, setSearchMatchAutoOpen] =
    useState<AutoOpenOption>("never");

  const [insecureMode, setInsecureMode] = useState<boolean>(false);

  const [requestingHostPermissionFor, setRequestingHostPermissionFor] =
    useState<string>();

  const [presets, setPresets] = useState<UrlOutputPreset[]>([]);

  const [errorLog, setErrorLog] = useState<LogEntry[]>([]);
  const [showBugReportModal, setShowBugReportModal] = useState<boolean>(false);
  const [onboardedToVersion, setOnboardedToVersion] = useState<string>("");
  const [filteredOnboardingSteps, setFilteredOnboardingSteps] = useState<
    OnboardingStep[]
  >([]);

  const browser = useMemo(detect, []);

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
        version: SyncSettingsVersion,
        presets,
        searchMatch: {
          enabled: searchEnabled,
          backgroundEnabled: searchBackgroundEnabled,
          autoOpen: searchMatchAutoOpen,
          hoverEnabled: hoverEnabled,
          mentions: {
            suggestionEnabled: searchMatchMentionEnabled,
            template: searchMatchMentionTemplate,
          },
          direct: {
            suggestionEnabled: searchMatchDirectEnabled,
            template: searchMatchDirectTemplate,
          },
        },
        onboardedToVersion: onboardedToVersion,
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
    hoverEnabled,
    searchMatchAutoOpen,
    onboardedToVersion,
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
      setSearchMatchAutoOpen(syncSettings.searchMatch.autoOpen);
      setSearchMatchDirectEnabled(
        syncSettings.searchMatch.direct.suggestionEnabled
      );
      setSearchMatchDirectTemplate(syncSettings.searchMatch.direct.template);
      setSearchMatchMentionEnabled(
        syncSettings.searchMatch.mentions.suggestionEnabled
      );
      setSearchMatchMentionTemplate(syncSettings.searchMatch.mentions.template);
      setHoverEnabled(syncSettings.searchMatch.hoverEnabled);
      setOnboardedToVersion(syncSettings.onboardedToVersion);
      setLoaded(true);

      // If we do not have access to all origins, we do not have sufficient
      // permissions for the messaging capabilities since we need to
      // inject the pop-up code into the page to show the message
      chrome.permissions.contains(
        {
          permissions: ["scripting"],
          origins: ["http://*/*", "https://*/*"],
        },
        (result) => {
          if (!result) {
            setSearchMatchAutoOpen("never");
          }
        }
      );

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

            // And since direct messages require background search
            // to function, let's disable that, too, if background
            // searches are disabled.
            setSearchMatchAutoOpen("never");
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

  useEffect(() => {
    getBackgroundErrorLog().then((result) => {
      setErrorLog(result);
    });
  }, []);

  // Inter-feature dependencies
  useEffect(() => {
    if (!searchEnabled && loaded) {
      onToggleBackgroundSearch(false);
      onChangeHoverEnabled(false);
      setSearchMatchDirectEnabled(false);
      setSearchMatchMentionEnabled(false);
    }
  }, [searchEnabled]);

  useEffect(() => {
    if (!searchBackgroundEnabled && loaded) {
      onChangeAutoOpen("never");
    }
  }, [searchBackgroundEnabled]);

  useEffect(() => {
    if (loaded) {
      setFilteredOnboardingSteps(
        OnboardingSteps.filter((step) => {
          const meetsMinimumVersionRequirement =
            !onboardedToVersion ||
            compareVersions(
              step.onboardingVersion ?? "0.0",
              onboardedToVersion
            ) > 0;
          const shouldBeSkipped =
            (step.skipDuringInitialOnboarding ?? false) &&
            onboardedToVersion === "";

          return meetsMinimumVersionRequirement && !shouldBeSkipped;
        })
      );
    }
  }, [loaded, onboardedToVersion]);

  const onOnboardingAdvance = (props: JoyrideCallbackProps) => {
    const completedStatuses: JoyrideStatusType[] = [
      JOYRIDE_STATUS.FINISHED,
      JOYRIDE_STATUS.SKIPPED,
    ];

    if (completedStatuses.indexOf(props.status) !== -1) {
      setOnboardedToVersion(CurrentMaxOnboardingVersion);
    }
  };

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
        () => {
          setSearchBackgroundEnabled(targetStateEnabled);
        }
      );
    }
  };

  const onChangeHoverEnabled = (checked: boolean) => {
    if (!checked) {
      if (searchMatchAutoOpen === "never") {
        chrome.permissions.remove(
          {
            permissions: ["scripting"],
            origins: [`http://*/*`, "https://*/*"],
          },
          () => {
            setHoverEnabled(false);
          }
        );
      } else {
        setHoverEnabled(false);
      }
    } else {
      chrome.permissions.request(
        {
          permissions: ["scripting"],
          origins: [`http://*/*`, `https://*/*`],
        },
        (granted) => {
          if (granted) {
            setHoverEnabled(true);
          }
        }
      );
    }
  };

  const onChangeAutoOpen = (value: string) => {
    switch (value) {
      case "never":
        if (!hoverEnabled) {
          chrome.permissions.remove(
            {
              permissions: ["scripting"],
              origins: [`http://*/*`, "https://*/*"],
            },
            () => {
              setSearchMatchAutoOpen("never");
            }
          );
        } else {
          setSearchMatchAutoOpen("never");
        }
        break;
      default:
        chrome.permissions.request(
          {
            permissions: ["scripting"],
            origins: [`http://*/*`, `https://*/*`],
          },
          (granted) => {
            if (granted) {
              setSearchMatchAutoOpen(value as AutoOpenOption);
            }
          }
        );
        break;
    }
  };

  const onExportBugReportData = async (
    logs: boolean,
    configuration: boolean
  ) => {
    const now = new Date();
    const minDate = new Date(now.getTime() - 1000 * 60 * 15);
    const blob = new Blob(
      [
        JSON.stringify(
          {
            meta: {
              date: new Date().toISOString(),
              export: {
                logs,
                configuration,
              },
              version: chrome.runtime.getManifest().version,
              userAgent: window.navigator.userAgent,
            },
            logEntries: logs
              ? errorLog.filter((entry) => {
                  // Filter out entries that occurred more than 5mins ago
                  const date = new Date(entry.date);
                  if (date > minDate) {
                    return true;
                  }
                  return false;
                })
              : undefined,
            configuration: configuration
              ? {
                  host: {
                    apiKeyOk: apiKeyOk,
                    apiKeyError: apiKeyError,
                    hasHostPermission: hasHostPermission,
                    host: host,
                    insecureMode: insecureMode,
                  },
                  search: {
                    enabled: searchEnabled,
                    backgroundEnabled: searchBackgroundEnabled,
                    autoOpen: searchMatchAutoOpen,
                    hoverEnabled: hoverEnabled,
                    mention: {
                      enabled: searchMatchMentionEnabled,
                      template: searchMatchMentionTemplate,
                    },
                    direct: {
                      enabled: searchMatchDirectEnabled,
                      template: searchMatchDirectTemplate,
                    },
                  },
                  presets: presets,
                }
              : undefined,
          },
          null,
          2
        ),
      ],
      {
        type: "application/json",
      }
    );

    const elem = window.document.createElement("a");
    elem.href = window.URL.createObjectURL(blob);
    elem.download = "obsidian-local-rest-api.bug_report.json";
    document.body.appendChild(elem);
    elem.click();
    document.body.removeChild(elem);
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
          compareVersions(parsed.sync.version, SyncSettingsVersion) > 0 ||
          !parsed.local ||
          compareVersions(parsed.local.version, LocalSettingsVersion) > 0
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
      {filteredOnboardingSteps.length > 0 && (
        <Joyride
          steps={filteredOnboardingSteps}
          continuous={true}
          showSkipButton={true}
          run={true}
          scrollToFirstStep={true}
          callback={onOnboardingAdvance}
        />
      )}
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
              <IconButton
                id="bug-report-button"
                title="Are you having trouble? Report a bug."
                aria-label="report a bug"
                color="error"
                onClick={() => setShowBugReportModal(true)}
              >
                <BugReport fontSize="small" />
              </IconButton>
            </div>
          </div>
        </div>
        {browser && browser.name !== "chrome" && (
          <UnsupportedEnvironmentWarning />
        )}
        <div className="option-panel">
          <div id="api-key-settings-panel">
            <Typography paragraph={true}>
              Obsidian Web integrates with Obsidian via the interface provided
              by the{" "}
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
              {!hasHostPermission && (
                <div className="option-value">
                  <MaterialAlert severity="error">
                    This browser extension does not have permission for the host{" "}
                    <code>{tempHost}</code>.
                    <Button
                      onClick={() => setRequestingHostPermissionFor(host)}
                    >
                      Grant Permissions
                    </Button>
                  </MaterialAlert>
                </div>
              )}
              {pluginVersion && compareVersions(pluginVersion, minVersion) < 0 && (
                <>
                  <div className="option-value">
                    <MaterialAlert severity="warning">
                      <strong>
                        Your install of Obsidian Local REST API is out-of-date
                        and missing some important capabilities.
                      </strong>{" "}
                      Some features may not work correctly as a result. Please
                      go to the "Community Plugins" section of your settings in
                      Obsidian to update the "Obsidian Local REST API" plugin to
                      the latest version.
                    </MaterialAlert>
                  </div>
                </>
              )}
            </div>
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
              your notes for references to the URL you are visiting.
            </Typography>
            <FormGroup>
              <FormControlLabel
                control={
                  <Switch
                    onChange={(evt) => {
                      setSearchEnabled(evt.target.checked);
                    }}
                    checked={searchEnabled}
                  />
                }
                label={
                  <>
                    <b>
                      Search for previous notes about this page when you
                      activate the extension?
                    </b>{" "}
                    If enabled,{" "}
                    <WikiLink target="Page Notes">Page Notes</WikiLink> for the
                    URL you are currently visiting, and pages on which you've
                    mentioned the URL you are visiting will be shown to you in
                    the dialog when you activate the extension.
                  </>
                }
              />
            </FormGroup>
            <FormGroup>
              <FormControlLabel
                id="hover-messages-toggle"
                control={
                  <Switch
                    onChange={(evt) => onChangeHoverEnabled(evt.target.checked)}
                    disabled={!searchEnabled}
                    checked={hoverEnabled}
                  />
                }
                label={
                  <>
                    <b>
                      Search for previous notes about linked pages when you
                      hover over links?{" "}
                      <WikiLink target="Hover Messages">(docs)</WikiLink>
                    </b>{" "}
                    If enabled, a tooltip will be displayed when hovering over
                    links targeting pages you have created{" "}
                    <WikiLink target="Page Notes">Page Notes</WikiLink> for or
                    have mentioned in a note. The displayed message can be
                    customized using <code>web-message</code> and other
                    frontmatter fields.
                    <Chip size="small" label="Requires extra permissions" />
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
                    <b>
                      Search for previous notes about this page in the
                      background?{" "}
                      <WikiLink target="Extension Badge Messages">
                        (docs)
                      </WikiLink>
                    </b>{" "}
                    If enabled,{" "}
                    <WikiLink target="Page Notes">Page Notes</WikiLink> for the
                    URL you are currently visiting, and pages on which you've
                    mentioned the URL you are visiting will be searched for as
                    you browse. If a matching note is found, a badge will be
                    shown on the extension icon.
                    <Chip size="small" label="Requires extra permissions" />
                  </>
                }
              />
            </FormGroup>
            <Paper
              className="paper-option-panel"
              id="automatically-display-matches-section"
            >
              <h3>
                Automatically Display Matches{" "}
                <WikiLink target="Automatic Match Display">(docs)</WikiLink>
              </h3>
              <Typography paragraph={true}>
                Do you want to be shown a message when the URL you are visiting
                has a <WikiLink target="Page Notes">Page Note</WikiLink> or has
                been mentioned in a note? You can configure conditions in which
                the dialog will be opened automatically to let you know when you
                have been to this URL before. This feature requires that
                background searches be enabled.
                <Chip size="small" label="Requires extra permissions" />
              </Typography>
              <Typography paragraph={true}>
                <FormControl fullWidth={true}>
                  <Select
                    onChange={(evt) => onChangeAutoOpen(evt.target.value)}
                    value={searchMatchAutoOpen}
                    disabled={!searchBackgroundEnabled}
                  >
                    <MenuItem value="never">
                      Never open the dialog automatically
                    </MenuItem>
                    <MenuItem value="direct-message">
                      Open the dialog automatically when a Page Note was found
                      for the current URL, and a `web-message` was set.
                    </MenuItem>
                    <MenuItem value="direct">
                      Open the dialog automatically when a Page Note was found
                      for the current URL.
                    </MenuItem>
                    <MenuItem value="mention">
                      Open the dialog automatically when either a Page Note was
                      found for the current URL or the current URL was mentioned
                      in a note.
                    </MenuItem>
                  </Select>
                </FormControl>
              </Typography>
            </Paper>
            <Paper className="paper-option-panel">
              <h3>Template Suggestions</h3>
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
                      <b>
                        Suggest a template when a{" "}
                        <WikiLink target="Page Notes">Page Note</WikiLink> for
                        the current URL is found?
                      </b>{" "}
                      When the URL of the page you are visiting has been found
                      to have a{" "}
                      <WikiLink target="Page Notes">Page Note</WikiLink>,
                      suggest a template for updating the existing note? This
                      feature requires that you have enabled search features.
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
                      <b>
                        Suggest a template when a note mentioning this URL is
                        found?
                      </b>{" "}
                      When the URL of the page you are visiting has been found
                      in the content of a note in your vault, suggest a template
                      for updating the existing note? This feature requires that
                      you enable search features.
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
          </div>
          <div className="option" id="templates-section">
            <h2>
              Templates{" "}
              <WikiLink target="Understanding Templates">(docs)</WikiLink>
            </h2>
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
          <Paper className="protip" id="protip-section">
            <Typography paragraph={true}>
              <strong>Protip:</strong> Looking for ideas about how you can use
              this plugin to improve your workflow; have a look at the{" "}
              <a
                href="https://github.com/coddingtonbear/obsidian-web/wiki"
                target="_blank"
              >
                Wiki
              </a>{" "}
              and{" "}
              <a
                href="https://github.com/coddingtonbear/obsidian-web/discussions"
                target="_blank"
              >
                Discussions
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
      <BugReportModal
        open={showBugReportModal}
        onClose={() => setShowBugReportModal(false)}
        onExportBugReportData={onExportBugReportData}
      />
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

window.addEventListener("message", compileTemplateCallback, {
  signal: compileTemplateCallbackController.signal,
});
