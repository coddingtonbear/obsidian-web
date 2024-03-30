import React from "react";

import MaterialAlert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";

import { AlertStatus } from "../types";

interface Props {
  value: AlertStatus;
}

const Alert: React.FC<Props> = ({ value, children }) => {
  return (
    <MaterialAlert severity={value.severity} className="options-alert">
      <AlertTitle>{value.title}</AlertTitle>
      <p className="popup-text">{value.message}</p>
      {children}
    </MaterialAlert>
  );
};

export default Alert;
