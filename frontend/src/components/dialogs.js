import React, { useState, useEffect, useRef } from "react";

import Alert from "@mui/material/Alert";
import Collapse from "@mui/material/Collapse";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import DialogContentText from "@mui/material/DialogContentText";
import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Check from "@mui/icons-material/Check";
import Help from "@mui/icons-material/Help";
import LoadingButton from "@mui/lab/LoadingButton/LoadingButton";

import { getAuthHeader } from "./authStorage";
import "./confirm-dialog.css";

export function Alerts({ successMsg, errorMsg, setSuccessMsg, setErrorMsg }) {
  const showSuccess = Boolean(successMsg);
  const showError = Boolean(errorMsg);

  return (
    <Collapse in={showSuccess || showError}>
      {showSuccess ? (
        <Alert
          severity="success"
          onClose={() => {
            setSuccessMsg("");
          }}
        >
          {successMsg}
        </Alert>
      ) : showError ? (
        <Alert
          severity="error"
          onClose={() => {
            setErrorMsg("");
          }}
        >
          {errorMsg}
        </Alert>
      ) : null}
    </Collapse>
  );
}

export function ConfirmDialog({
  message,
  url,
  body,
  open,
  setOpen,
  setUpdated,
  method = "PATCH",
}) {
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const closeTimeoutRef = useRef(null);
  const pendingRefreshRef = useRef(false);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }
    setErrorMsg("");
    setLoading(false);
    setSucceeded(false);
    pendingRefreshRef.current = false;
  }, [open]);

  const handleClose = () => {
    if (succeeded || loading) return;
    setOpen(false);
    setErrorMsg("");
  };

  const handleExited = () => {
    if (pendingRefreshRef.current) {
      pendingRefreshRef.current = false;
      setUpdated?.(true);
    }
    setSucceeded(false);
    setErrorMsg("");
    setLoading(false);
  };

  const finishSuccess = () => {
    setLoading(false);
    setErrorMsg("");
    setSucceeded(true);
    closeTimeoutRef.current = setTimeout(() => {
      pendingRefreshRef.current = true;
      setOpen(false);
    }, 900);
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      TransitionProps={{ onExited: handleExited }}
      PaperProps={{
        className: "confirm-dialog-paper",
      }}
    >
      <div className="confirm-dialog-accent" aria-hidden="true" />
      <DialogContent className="confirm-dialog-content">
        <Alerts
          successMsg=""
          errorMsg={errorMsg}
          setSuccessMsg={() => {}}
          setErrorMsg={setErrorMsg}
        />

        <Typography className="confirm-dialog-title">Confirm</Typography>
        <DialogContentText className="confirm-dialog-message">
          {message} Do you wish to proceed?
        </DialogContentText>
      </DialogContent>

      <DialogActions className="confirm-dialog-actions">
        <Button
          className="confirm-dialog-cancel"
          variant="outlined"
          onClick={handleClose}
          disabled={succeeded || loading}
        >
          Cancel
        </Button>
        <LoadingButton
          className={
            succeeded
              ? "confirm-dialog-action-btn confirm-dialog-action-btn--success"
              : "confirm-dialog-action-btn"
          }
          loading={loading}
          variant="contained"
          color="error"
          disabled={succeeded}
          startIcon={succeeded ? <Check /> : undefined}
          onClick={() => {
            if (succeeded || loading) return;
            setLoading(true);
            setErrorMsg("");
            fetch(url, {
              method: method,
              headers: getAuthHeader(),
              body: JSON.stringify(body),
            })
              .then((response) => {
                if (response.ok) {
                  finishSuccess();
                } else {
                  setErrorMsg("Something went wrong. Please try again.");
                  setLoading(false);
                }
              })
              .catch(() => {
                setErrorMsg("Something went wrong. Please try again.");
                setLoading(false);
              });
          }}
        >
          {succeeded ? "Done" : "Confirm"}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

export function HelpIcon({ page, message }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Dialog open={open} onClose={() => setOpen(false)}>
        <DialogTitle>{page} Help</DialogTitle>
        <DialogContent>{message}</DialogContent>
      </Dialog>

      <Tooltip title="Help">
        <IconButton color="disabled" onClick={() => setOpen(true)}>
          <Help />
        </IconButton>
      </Tooltip>
    </div>
  );
}
