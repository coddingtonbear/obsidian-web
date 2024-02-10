import React from "react";
import { UrlMentionContainer } from "../types";
import { Chip } from "@mui/material";
import Circle from "@mui/icons-material/Circle";

export interface Props {
  mousePosition: {
    x: number;
    y: number;
  };
  mentions: UrlMentionContainer;
}

const MouseOverChip: React.FunctionComponent<Props> = ({
  mousePosition,
  mentions,
}) => {
  const getMouseOverBadgeColor = (): string => {
    const definedBadgeColor = (mentions?.direct ?? []).filter(
      (value) => typeof value.meta.frontmatter["web-badge-color"] === "string"
    );

    if (definedBadgeColor.length > 0) {
      return ("#" +
        definedBadgeColor[0].meta.frontmatter["web-badge-color"]) as string;
    } else if (mentions?.direct.length ?? 0 > 0) {
      return "#A68B36";
    } else if (mentions?.mentions.length ?? 0 > 0) {
      return "#3D7D98";
    } else {
      return "#FFFFFF";
    }
  };

  const getMouseOverMentionCount = (): number => {
    return (mentions?.direct.length ?? 0) > 0
      ? mentions?.direct.length
      : mentions?.mentions.length;
  };

  const getMouseOverMessage = (): string | undefined => {
    const definedBadgeMessage = (mentions?.direct ?? []).filter(
      (value) => typeof value.meta.frontmatter["web-message"] === "string"
    );
    if (definedBadgeMessage.length > 0) {
      return definedBadgeMessage[0].meta.frontmatter["web-message"] as string;
    }

    return undefined;
  };

  const getMouseOverBadgeMessage = (): string | undefined => {
    const definedBadgeMessage = (mentions?.direct ?? []).filter(
      (value) => typeof value.meta.frontmatter["web-badge-message"] === "string"
    );
    if (definedBadgeMessage.length > 0) {
      return definedBadgeMessage[0].meta.frontmatter[
        "web-badge-message"
      ] as string;
    }

    return undefined;
  };
  return (
    <Chip
      label={
        <>
          {getMouseOverBadgeMessage() && <b>{getMouseOverBadgeMessage()}</b>}
          {getMouseOverMessage()}{" "}
          <i>
            ({getMouseOverMentionCount()} mention
            {getMouseOverMentionCount() !== 1 ? "s" : ""})
          </i>
        </>
      }
      color="primary"
      icon={<Circle style={{ color: getMouseOverBadgeColor() }} />}
      style={{
        position: "absolute",
        left: mousePosition.x + 10,
        top: mousePosition.y - 40,
      }}
    />
  );
};

export default MouseOverChip;
