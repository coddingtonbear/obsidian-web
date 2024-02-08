import React from "react";
import MaterialAlert from "@mui/material/Alert";
import Link from "@mui/material/Link";
import IconButton from "@mui/material/IconButton";

import UseSuggestionIcon from "@mui/icons-material/ArrowCircleDown";

import {
  SearchJsonResponseItem,
  OutputPreset,
  SearchJsonResponseItemWithMetadata,
} from "../types";
import { openFileInObsidian } from "../utils";

export interface DirectProps {
  type: "direct";
  templateSuggestion: OutputPreset | undefined;
  mention: SearchJsonResponseItemWithMetadata;
  acceptSuggestion: (filename: string, template: OutputPreset) => void;
}

export interface MentionProps {
  type: "mention";
  templateSuggestion: OutputPreset | undefined;
  mention: SearchJsonResponseItem;
  acceptSuggestion: (filename: string, template: OutputPreset) => void;
}

export type Props = MentionProps | DirectProps;

const MentionNotice: React.FC<Props> = ({
  type,
  templateSuggestion,
  mention,
  acceptSuggestion,
}) => {
  return (
    <MaterialAlert
      severity={type === "direct" ? "warning" : "info"}
      className="mention-notice"
      key={mention.filename}
    >
      {templateSuggestion && (
        <IconButton
          onClick={() => acceptSuggestion(mention.filename, templateSuggestion)}
          className="mention-cta"
          aria-label="Use existing note"
          title="Use existing note"
        >
          <UseSuggestionIcon />
        </IconButton>
      )}
      {type === "direct" && <>This URL has a dedicated note: </>}
      {type === "mention" && <>This URL is mentioned in an existing note: </>}
      <Link
        title="Open in Obsidian"
        onClick={() => openFileInObsidian(mention.filename)}
      >
        {mention.filename}
      </Link>

      {type === "direct" && mention.meta.frontmatter["web-message"] && (
        <blockquote>
          {String(mention.meta.frontmatter["web-message"])}
        </blockquote>
      )}
    </MaterialAlert>
  );
};

export default MentionNotice;
