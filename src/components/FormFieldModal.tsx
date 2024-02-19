import * as React from "react";

import { DateTime } from "luxon";
import Modal from "@mui/material/Modal";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import { OutputPresetFieldDefinition } from "../types";
import {
  Checkbox,
  FormControlLabel,
  MenuItem,
  Select,
  Stack,
} from "@mui/material";
import { DatePicker, DateTimePicker, TimePicker } from "@mui/x-date-pickers";
import { DefaultOutputPresetFieldDefinitionOptions } from "../constants";

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
  const [fieldOptions, setFieldOptions] = React.useState<Record<string, any>>(
    {}
  );

  React.useEffect(() => {
    if (fieldIdx !== null) {
      setName(fields[fieldIdx].name);
      setType(fields[fieldIdx].type);
      setDefaultValue(fields[fieldIdx].defaultValue);
      setFieldOptions(fields[fieldIdx].options ?? {});
    } else {
      setName("");
      setType("text");
      setDefaultValue("");
      setFieldOptions({});
    }
  }, [fieldIdx, fields]);

  React.useEffect(() => {
    setFieldOptions(DefaultOutputPresetFieldDefinitionOptions[type]);
  }, [type]);

  const onAttemptSave = () => {
    const newField: OutputPresetFieldDefinition = {
      name,
      type,
      defaultValue,
      options: fieldOptions,
    };

    onSave(fieldIdx, newField);
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Paper elevation={3} className="modal">
        <Stack direction="column" spacing={2}>
          <Stack direction="row" justifyContent="space-between">
            <TextField
              label="Field Name"
              fullWidth={true}
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
            <Select
              label="Type"
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
          </Stack>
          {type === "text" && (
            <TextField
              label="Default"
              value={defaultValue ? DateTime.fromISO(defaultValue) : undefined}
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
            <>
              <TextField
                label="Format"
                value={fieldOptions.format ?? ""}
                onChange={(evt) => {
                  setFieldOptions((options) => {
                    const newOptions = {
                      ...options,
                      format: evt.target.value,
                    };
                    return newOptions;
                  });
                }}
                helperText={
                  <>
                    See{" "}
                    <a href="https://moment.github.io/luxon/#/parsing?id=table-of-tokens">
                      Luxon's documentation
                    </a>{" "}
                    for available tokens.
                  </>
                }
              />
              <DatePicker
                label="Default"
                value={
                  defaultValue
                    ? DateTime.fromFormat(
                        defaultValue,
                        fieldOptions.format ?? ""
                      )
                    : undefined
                }
                onChange={(value) => {
                  if (value) {
                    setDefaultValue(value.toFormat(fieldOptions.format ?? ""));
                  } else {
                    setDefaultValue("");
                  }
                }}
                format={fieldOptions.format ?? ""}
              />
            </>
          )}
          {type === "time" && (
            <>
              <TextField
                label="Format"
                value={fieldOptions.format ?? ""}
                onChange={(evt) => {
                  setFieldOptions((options) => {
                    const newOptions = {
                      ...options,
                      format: evt.target.value,
                    };
                    return newOptions;
                  });
                }}
                helperText={
                  <>
                    See{" "}
                    <a href="https://moment.github.io/luxon/#/parsing?id=table-of-tokens">
                      Luxon's documentation
                    </a>{" "}
                    for available tokens.
                  </>
                }
              />
              <TimePicker
                label="Default"
                value={
                  defaultValue
                    ? DateTime.fromFormat(
                        defaultValue,
                        fieldOptions.format ?? ""
                      )
                    : undefined
                }
                onChange={(value) => {
                  if (value) {
                    setDefaultValue(value.toFormat(fieldOptions.format ?? ""));
                  } else {
                    setDefaultValue("");
                  }
                }}
                format={fieldOptions.format ?? ""}
              />
            </>
          )}
          {type === "datetime" && (
            <>
              <TextField
                label="Format"
                value={fieldOptions.format ?? ""}
                onChange={(evt) => {
                  setFieldOptions((options) => {
                    const newOptions = {
                      ...options,
                      format: evt.target.value,
                    };
                    return newOptions;
                  });
                }}
                helperText={
                  <>
                    See{" "}
                    <a href="https://moment.github.io/luxon/#/parsing?id=table-of-tokens">
                      Luxon's documentation
                    </a>{" "}
                    for available tokens.
                  </>
                }
              />
              <DateTimePicker
                label="Default"
                value={
                  defaultValue
                    ? DateTime.fromFormat(
                        defaultValue,
                        fieldOptions.format ?? ""
                      )
                    : undefined
                }
                onChange={(value) => {
                  if (value) {
                    setDefaultValue(value.toFormat(fieldOptions.format ?? ""));
                  } else {
                    setDefaultValue("");
                  }
                }}
                format={fieldOptions.format ?? ""}
              />
            </>
          )}
          <Stack direction="row" className="submit" justifyContent="flex-end">
            <Button variant="outlined" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="contained" onClick={onAttemptSave}>
              Save Changes
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Modal>
  );
};

export default FormFieldModal;
