import React from "react";

const WikiLinks = {
  "Page Notes":
    "https://github.com/coddingtonbear/obsidian-web/wiki/Page-Notes",
  "Automatic Match Display":
    "https://github.com/coddingtonbear/obsidian-web/wiki/Automatic-Match-Display",
  "Hover Messages":
    "https://github.com/coddingtonbear/obsidian-web/wiki/Hover-Messages",
  "Understanding Templates":
    "https://github.com/coddingtonbear/obsidian-web/wiki/Understanding-Templates",
  "Extension Badge Messages":
    "https://github.com/coddingtonbear/obsidian-web/wiki/Extension-Badge-Messages",
};

interface Props {
  target: keyof typeof WikiLinks;
}

const WikiLink: React.FC<Props> = ({ target, children }) => {
  return (
    <a href={WikiLinks[target]} target="_blank">
      {children}
    </a>
  );
};

export default WikiLink;
