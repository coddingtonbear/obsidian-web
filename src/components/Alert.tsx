import React from "react";

import MaterialAlert from "@mui/material/Alert";
import AlertTitle from "@mui/material/AlertTitle";

import { AlertStatus } from "../types";

interface Props {
  value: AlertStatus;
  onClick?: () => {};
}

const Alert: React.FC<Props> = ({ value, onClick }) => {
  return (
    <MaterialAlert severity={value.severity} className="options-alert">
      <AlertTitle>{value.title}</AlertTitle>
      {value.message}
    </MaterialAlert>
  );
};

export default Alert;
