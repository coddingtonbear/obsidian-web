import React from "react";

import MaterialAlert from "@mui/material/Alert";

const UnsupportedEnvironmentWarning: React.FC = ({}) => {
  return (
    <div className="option-value">
      <MaterialAlert severity="warning">
        <strong>
          You are running Obsidian Web in an unsupported environment!
        </strong>{" "}
        Obsidian Web is tested only on recent versions of Chrome, and no
        guarantees are made by the maintainers of this project that it might
        work on any other browser — even other Chrome derivatives. Some features
        may not work correctly as a result, but you can feel free to{" "}
        <a
          href="https://github.com/coddingtonbear/obsidian-web/discussions/new?category=exotic-browser-support"
          target="_blank"
        >
          start a new discussion
        </a>{" "}
        if you run into difficulty — members of the community may be able to
        help!
      </MaterialAlert>
    </div>
  );
};

export default UnsupportedEnvironmentWarning;
