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
        <DialogContentText
          className="confirm-dialog-message"
          component="div"
        >
          <div className="confirm-dialog-message-body">{message}</div>
          <p className="confirm-dialog-proceed">Do you wish to proceed?</p>
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
                  return;
                }
                return response.json().then(
                  (data) => {
                    const detail = data?.detail;
                    setErrorMsg(
                      typeof detail === "string" && detail
                        ? detail
                        : "Something went wrong. Please try again."
                    );
                    setLoading(false);
                  },
                  () => {
                    setErrorMsg("Something went wrong. Please try again.");
                    setLoading(false);
                  }
                );
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

export function MakeLiveDialog({
  open,
  setOpen,
  setUpdated,
  roundLabel,
  emailCount,
  emailsEnabled = true,
  url,
  body,
}) {
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [succeeded, setSucceeded] = useState(false);
  const [acked, setAcked] = useState(false);
  const closeTimeoutRef = useRef(null);
  const pendingRefreshRef = useRef(false);
  const count = Number(emailCount) || 0;
  const peopleLabel = `${count} ballkid${count === 1 ? "" : "s"}`;
  const willEmail = Boolean(emailsEnabled);

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
    setAcked(!willEmail);
    pendingRefreshRef.current = false;
  }, [open, willEmail]);

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
    setAcked(false);
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
        className: "confirm-dialog-paper confirm-dialog-paper--make-live",
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

        <Typography className="confirm-dialog-title">
          {willEmail ? `Email ${peopleLabel} & make live` : "Make live"}
        </Typography>
        <DialogContentText
          className="confirm-dialog-message"
          component="div"
        >
          <div className="confirm-dialog-message-body">
            Making <strong>{roundLabel}</strong> live will show this ticket
            form to ballkids right away.
            {willEmail ? (
              <span className="confirm-dialog-highlight">
                This emails {peopleLabel} that ticket requests are open.
              </span>
            ) : (
              <span className="confirm-dialog-highlight">
                Ticket emails are currently off - no email will be sent.
              </span>
            )}
          </div>
          {willEmail ? (
            <label className="confirm-dialog-ack">
              <input
                type="checkbox"
                checked={acked}
                disabled={succeeded || loading}
                onChange={(e) => setAcked(e.target.checked)}
              />
              <span>
                I understand this emails all ballkids with tickets remaining.
              </span>
            </label>
          ) : null}
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
          color="success"
          disabled={succeeded || !acked}
          startIcon={succeeded ? <Check /> : undefined}
          onClick={() => {
            if (succeeded || loading || !acked) return;
            setLoading(true);
            setErrorMsg("");
            fetch(url, {
              method: "PATCH",
              headers: getAuthHeader(),
              body: JSON.stringify(body),
            })
              .then((response) => {
                if (response.ok) {
                  finishSuccess();
                  return;
                }
                return response.json().then(
                  (data) => {
                    const detail = data?.detail;
                    setErrorMsg(
                      typeof detail === "string" && detail
                        ? detail
                        : "Something went wrong. Please try again."
                    );
                    setLoading(false);
                  },
                  () => {
                    setErrorMsg("Something went wrong. Please try again.");
                    setLoading(false);
                  }
                );
              })
              .catch(() => {
                setErrorMsg("Something went wrong. Please try again.");
                setLoading(false);
              });
          }}
        >
          {succeeded
            ? "Done"
            : willEmail
              ? "Email & make live"
              : "Make live"}
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}

export function HelpIcon({ page, message }) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        scroll="paper"
        maxWidth={false}
        PaperProps={{ className: "help-dialog-paper" }}
      >
        <DialogTitle className="help-dialog-title">{page} Help</DialogTitle>
        <DialogContent className="help-dialog-content">{message}</DialogContent>
      </Dialog>

      <Tooltip title="Help">
        <IconButton color="disabled" onClick={() => setOpen(true)}>
          <Help />
        </IconButton>
      </Tooltip>
    </div>
  );
}
