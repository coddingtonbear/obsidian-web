import React from "react";
import MaterialAlert from "@mui/material/Alert";
import Link from "@mui/material/Link";
import IconButton from "@mui/material/IconButton";

import UpgradeIcon from "@mui/icons-material/Upgrade";

import { OutputPreset, SearchJsonResponseItem } from "../types";
import { openFileInObsidian } from "../utils";

export interface Props {
  apiKey: string;
  insecureMode: boolean;
  type: "mention" | "direct";
  templateSuggestion: string | undefined;
  mention: SearchJsonResponseItem;
  presets: OutputPreset[];
  acceptSuggestion: (filename: string, template: string) => void;
}

const MentionNotice: React.FC<Props> = ({
  type,
  templateSuggestion,
  apiKey,
  insecureMode,
  presets,
  mention,
  acceptSuggestion,
}) => {
  const preset = presets.find((val) => val.name === templateSuggestion);

  return (
    <MaterialAlert
      severity={type === "direct" ? "warning" : "info"}
      className="mention-notice"
      key={mention.filename}
    >
      {preset && (
        <IconButton
          onClick={() => acceptSuggestion(mention.filename, preset.name)}
          className="mention-cta"
          aria-label="Use existing note"
          title="Use existing note"
        >
          <UpgradeIcon />
        </IconButton>
      )}
      {type === "direct" && <>This URL has a dedicated note: </>}
      {type === "mention" && <>This URL is mentioned in an existing note: </>}
      <Link
        title="Open in Obsidian"
        onClick={() =>
          openFileInObsidian(apiKey, insecureMode, mention.filename)
        }
      >
        {mention.filename}
      </Link>
      .
    </MaterialAlert>
  );
};

export default MentionNotice;
