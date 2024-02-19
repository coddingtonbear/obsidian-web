import * as React from "react";

import { DateTime } from "luxon";
import Modal from "@mui/material/Modal";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import { OutputPresetFieldDefinition } from "../types";
import { Checkbox, FormControlLabel, MenuItem, Select } from "@mui/material";
import { DatePicker, DateTimePicker, TimePicker } from "@mui/x-date-pickers";

export interface Props {
  open: boolean;
  fields: OutputPresetFieldDefinition[];
  fieldIdx: number | null;
  onSave: (idx: number | null, field: OutputPresetFieldDefinition) => void;
  onClose: () => void;
}

const FormFieldModal: React.FunctionComponent<Props> = ({
  open,
  fields,
  fieldIdx,
  onSave,
  onClose,
}) => {
  const [name, setName] = React.useState<string>("");
  const [type, setType] =
    React.useState<OutputPresetFieldDefinition["type"]>("text");
  const [defaultValue, setDefaultValue] = React.useState<string>("");

  React.useEffect(() => {
    if (fieldIdx !== null) {
      setName(fields[fieldIdx].name);
      setType(fields[fieldIdx].type);
      setDefaultValue(fields[fieldIdx].defaultValue);
    } else {
      setName("");
      setType("text");
      setDefaultValue("");
    }
  }, [fieldIdx]);

  const onAttemptSave = () => {
    const newField: OutputPresetFieldDefinition = {
      name,
      type,
      defaultValue,
    };

    onSave(fieldIdx, newField);
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Paper elevation={3} className="modal">
        <div className="option">
          <div className="option-value">
            <TextField
              label="Template Name"
              fullWidth={true}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
        </div>
        <div className="option">
          <div className="option-value">
            <Select
              onChange={(evt) => {
                setType(
                  evt.target.value as OutputPresetFieldDefinition["type"]
                );
              }}
              value={type}
            >
              <MenuItem value="text">Text</MenuItem>
              <MenuItem value="checkbox">Checkbox</MenuItem>
              <MenuItem value="date">Date</MenuItem>
              <MenuItem value="time">Time</MenuItem>
              <MenuItem value="datetime">Date and Time</MenuItem>
            </Select>
          </div>
        </div>
        <div className="option">
          <div className="option-value">
            {type === "text" && (
              <TextField
                label="Default"
                value={
                  defaultValue ? DateTime.fromISO(defaultValue) : undefined
                }
                onChange={(evt) => {
                  setDefaultValue(evt.target.value);
                }}
              />
            )}
            {type === "checkbox" && (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={Boolean(defaultValue)}
                    onChange={(evt) => {
                      setDefaultValue(evt.target.checked ? "yes" : "");
                    }}
                  />
                }
                label="Default to Checked?"
              />
            )}
            {type === "date" && (
              <DatePicker
                label="Default"
                value={
                  defaultValue
                    ? DateTime.fromFormat(defaultValue, "yyyy-LL-dd")
                    : undefined
                }
                onChange={(value) => {
                  if (value) {
                    setDefaultValue(value.toFormat("yyyy-LL-dd"));
                  } else {
                    setDefaultValue("");
                  }
                }}
                format="yyyy-LL-dd"
              />
            )}
            {type === "time" && (
              <TimePicker
                label="Default"
                value={
                  defaultValue
                    ? DateTime.fromFormat(defaultValue, "HH:mm")
                    : undefined
                }
                onChange={(value) => {
                  if (value) {
                    setDefaultValue(value.toFormat("HH:mm"));
                  } else {
                    setDefaultValue("");
                  }
                }}
                format="HH:mm"
              />
            )}
            {type === "datetime" && (
              <DateTimePicker
                label="Default"
                value={
                  defaultValue
                    ? DateTime.fromFormat(defaultValue, "yyyy-LL-ddTHH:mm")
                    : undefined
                }
                onChange={(value) => {
                  if (value) {
                    setDefaultValue(value.toFormat("yyyy-LL-ddTHH:mm"));
                  } else {
                    setDefaultValue("");
                  }
                }}
                format="yyyy-LL-ddTHH:mm"
              />
            )}
          </div>
        </div>
        <div className="submit">
          <Button variant="outlined" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="contained" onClick={onAttemptSave}>
            Save Changes
          </Button>
        </div>
      </Paper>
    </Modal>
  );
};

export default FormFieldModal;
