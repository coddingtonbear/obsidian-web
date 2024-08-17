import * as React from "react";

import Modal from "@mui/material/Modal";
import Paper from "@mui/material/Paper";
import Typography from "@mui/material/Typography";
import { Button } from "@mui/material";

export interface Props {
  open: boolean;
  onClose: () => void;
}

const DiscoveryModal: React.FunctionComponent<Props> = ({ open, onClose }) => {
  return (
    <Modal open={open} onClose={onClose}>
      <Paper elevation={3} className="modal small">
        <div className="modal-content">
          <h1>Help Shape the Future of Obsidian Web!</h1>

          <Typography paragraph={true}>
            Do you want to have a say in what features are added to Obsidian Web
            in the future? This is your chance to influence the future! I'd love
            to chat about how you use Obsidian Web, what challenges you face
            with it, and what enhancements could make your experience even
            better.
          </Typography>

          <Typography paragraph={true}>
            I'm sure all of us use at least one product that has a feature that
            -- although it <em>technically</em> works -- it's either completely
            useless for solving your problem, or it's so difficult to use that
            it might as well have not been written. I want to avoid that on
            Obsidian Web as much as I can, but to do that I need to have
            conversations with as many people as possible...including you, if
            you'll let me.
          </Typography>

          <Typography paragraph={true}>
            Just to be clear: I'm not trying to sell you anything! I don't even
            have something to sell you if I wanted to! I just want to hear your
            thoughts!
          </Typography>

          <div className="submit">
            <Button
              variant="contained"
              onClick={() => {
                window.open(
                  "https://calendar.app.google/vh4ZJFkmWWzL1kbt9",
                  "_blank"
                );
                onClose();
              }}
            >
              Schedule a 15-minute One-on-one Conversation
            </Button>
          </div>
        </div>
      </Paper>
    </Modal>
  );
};

export default DiscoveryModal;
