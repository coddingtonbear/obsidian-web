import * as React from "react";

import RequestParameters from "./RequestParameters";
import Modal from "@mui/material/Modal";
import Paper from "@mui/material/Paper";
import TextField from "@mui/material/TextField";
import IconButton from "@mui/material/IconButton";
import Button from "@mui/material/Button";
import CreateIcon from "@mui/icons-material/AddCircle";
import EditIcon from "@mui/icons-material/Edit";
import { ConfiguredTemplate, OutputPresetFieldDefinition } from "../types";
import { DefaultPreviewContext } from "../constants";
import {
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from "@mui/material";
import WikiLink from "./WikiLink";
import FormFieldModal from "./FormFieldModal";

export interface Props {
  open: boolean;
  sandbox: HTMLIFrameElement;
  isAdhocSelectedTemplate?: boolean;
  fields?: OutputPresetFieldDefinition[];
  name?: string;
  method?: ConfiguredTemplate["method"];
  urlTemplate?: string;
  headers?: Record<string, string>;
  contentTemplate?: string;
  onSave: (preset: ConfiguredTemplate) => void;
  onClose: () => void;
}

const TemplateSetupModal: React.FunctionComponent<Props> = ({
  open,
  sandbox,
  isAdhocSelectedTemplate = true,
  fields,
  name: originalName,
  method: originalMethod = "post",
  urlTemplate: originalUrlTemplate,
  headers: originalHeaders,
  contentTemplate: originalContentTemplate,
  onSave,
  onClose,
}) => {
  const [name, setName] = React.useState<string>(originalName ?? "");
  const [contentTemplate, setContentTemplate] = React.useState<string>(
    originalContentTemplate ?? ""
  );
  const [urlTemplate, setUrlTemplate] = React.useState<string>(
    originalUrlTemplate ?? ""
  );
  const [headers, setHeaders] = React.useState<Record<string, string>>(
    originalHeaders ?? {}
  );
  const [method, setMethod] =
    React.useState<ConfiguredTemplate["method"]>(originalMethod);
  const [formFields, setFormFields] = React.useState<
    OutputPresetFieldDefinition[]
  >(fields ?? []);

  const [showEditingFormFieldModal, setShowEditingFormFieldModal] =
    React.useState<boolean>(false);
  const [editingFormFieldIdx, setEditingFormFieldIdx] = React.useState<
    number | null
  >(null);

  const [saveError, setSaveError] = React.useState<boolean>(false);

  const onAttemptSave = () => {
    const preset: ConfiguredTemplate = {
      name: name ? name : undefined,
      urlTemplate: urlTemplate,
      contentTemplate: contentTemplate,
      headers: headers,
      method: method,
      fields: formFields,
    };

    onSave(preset);
  };

  return (
    <Modal open={open} onClose={onClose}>
      <>
        <Paper elevation={3} className="modal">
          {isAdhocSelectedTemplate && (
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
          )}
          <Alert severity="info">
            <>
              {isAdhocSelectedTemplate ? (
                <>
                  You can use{" "}
                  <a href="https://handlebarsjs.com/guide/" target="_blank">
                    Handlebars
                  </a>{" "}
                  templating in your API URL and Content fields below.
                </>
              ) : (
                <>
                  You can use{" "}
                  <a href="https://handlebarsjs.com/guide/" target="_blank">
                    Handlebars
                  </a>{" "}
                  templating in your Content field below.
                </>
              )}{" "}
              See{" "}
              <WikiLink target="Understanding Templates">
                Obsidian Web's template documentation
              </WikiLink>{" "}
              to get an understanding of how to write your template and what
              context variables and helpers are available.
            </>
            {isAdhocSelectedTemplate && (
              <>
                <br />
                <br />
                If you're not sure about what to enter for API URL below, see{" "}
                <a
                  href="https://coddingtonbear.github.io/obsidian-local-rest-api/"
                  target="_blank"
                >
                  Obsidian Local REST API's live documentation
                </a>{" "}
                for insight into what URLs are provided for selecting the
                document you would like to modify.
              </>
            )}
          </Alert>
          <div>
            <TableContainer component={Paper}>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Field Name</TableCell>
                    <TableCell>Template Variable</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Default Value</TableCell>
                    <TableCell align="right">Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {formFields.map((formField, idx) => (
                    <TableRow key={formField.name + idx}>
                      <TableCell>{formField.name}</TableCell>
                      <TableCell>
                        <code>
                          {"{{"}form.{formField.name}
                          {"}}"}
                        </code>
                      </TableCell>
                      <TableCell>{formField.type}</TableCell>
                      <TableCell>{formField.defaultValue}</TableCell>
                      <TableCell>
                        <IconButton
                          onClick={() => {
                            setShowEditingFormFieldModal(true);
                            setEditingFormFieldIdx(idx);
                          }}
                        >
                          <EditIcon titleAccess="Edit field definition" />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow key="new">
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    <TableCell></TableCell>
                    <TableCell align="right">
                      <IconButton
                        onClick={() => {
                          setShowEditingFormFieldModal(true);
                          setEditingFormFieldIdx(null);
                        }}
                      >
                        <CreateIcon titleAccess="Create new template" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </div>
          <RequestParameters
            allowUrlConfiguration={isAdhocSelectedTemplate}
            method={method}
            sandbox={sandbox}
            previewContext={DefaultPreviewContext}
            url={urlTemplate}
            headers={headers}
            content={contentTemplate}
            onChangeMethod={setMethod}
            onChangeUrl={setUrlTemplate}
            onChangeHeaders={setHeaders}
            onChangeContent={setContentTemplate}
            onChangeIsValid={(valid) => setSaveError(!valid)}
          />
          <div className="submit">
            <Button variant="outlined" onClick={onClose}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={onAttemptSave}
              disabled={saveError}
            >
              Save Changes
            </Button>
          </div>
        </Paper>
        <FormFieldModal
          open={showEditingFormFieldModal}
          fields={formFields}
          fieldIdx={editingFormFieldIdx}
          onSave={(idx: number | null, field: OutputPresetFieldDefinition) => {
            setFormFields((formFields) => {
              const newFormFields = [...formFields];
              newFormFields[idx ?? newFormFields.length] = field;

              return newFormFields;
            });

            setShowEditingFormFieldModal(false);
            setEditingFormFieldIdx(null);
          }}
          onClose={() => {
            setShowEditingFormFieldModal(false);
            setEditingFormFieldIdx(null);
          }}
        />
      </>
    </Modal>
  );
};

export default TemplateSetupModal;
