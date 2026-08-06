import React, { useState } from "react";

import IconButton from "@mui/material/IconButton";
import Tooltip from "@mui/material/Tooltip";
import Edit from "@mui/icons-material/Edit";
import Done from "@mui/icons-material/Done";
import Close from "@mui/icons-material/Close";
import DeleteOutline from "@mui/icons-material/DeleteOutline";

import { getAuthHeader, getToday } from "../Utils";

function notesByCourt(notes) {
  const map = {};
  (notes || []).forEach((note) => {
    if (note?.court) {
      map[note.court] = note;
    }
  });
  return map;
}

export function courtNotesToMap(notes) {
  return notesByCourt(notes);
}

export function fetchCourtNotes(date = getToday()) {
  const qs = date ? `?date=${encodeURIComponent(date)}` : "";
  return fetch(`/api/court-notes${qs}`, { headers: getAuthHeader() }).then(
    (response) => {
      if (!response.ok) {
        throw new Error("Failed to load court notes");
      }
      return response.json();
    }
  );
}

/**
 * Court note for Teams cards.
 * Captains/chairs: edit in place. Ballkids: read-only when a note exists.
 */
export function CourtNoteBlock({
  court,
  note,
  date = getToday(),
  onNotesChange,
  readOnly = false,
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(note?.message || "");
  const [saving, setSaving] = useState(false);

  if (!court) {
    return null;
  }

  const message = note?.message || "";

  const startEdit = () => {
    if (readOnly) return;
    setDraft(message);
    setEditing(true);
  };

  const cancelEdit = () => {
    setDraft(message);
    setEditing(false);
  };

  const save = (nextMessage) => {
    setSaving(true);
    fetch("/api/court-notes", {
      method: "PUT",
      headers: getAuthHeader(),
      body: JSON.stringify({
        court,
        date,
        message: nextMessage,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to save court note");
        }
        return response.json();
      })
      .then((data) => {
        setEditing(false);
        if (onNotesChange) {
          onNotesChange((prev) => {
            const next = { ...prev };
            if (!data.message) {
              delete next[court];
            } else {
              next[court] = data;
            }
            return next;
          });
        }
      })
      .finally(() => setSaving(false));
  };

  if (readOnly) {
    if (!message) {
      return null;
    }
    return (
      <div className="court-note court-note--readonly">
        <p className="court-note__message">{message}</p>
      </div>
    );
  }

  if (editing) {
    return (
      <div className="court-note court-note--editing">
        <label className="court-note__label" htmlFor={`court-note-${court}`}>
          Court note · {court}
        </label>
        <textarea
          id={`court-note-${court}`}
          className="court-note__input"
          value={draft}
          rows={2}
          placeholder="e.g. Wet surface — careful on changeovers"
          disabled={saving}
          onChange={(e) => setDraft(e.target.value)}
        />
        <div className="court-note__actions">
          <Tooltip title="Save">
            <span>
              <IconButton
                size="small"
                color="primary"
                disabled={saving || draft.trim() === message.trim()}
                onClick={() => save(draft.trim())}
              >
                <Done fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
          {message ? (
            <Tooltip title="Clear note">
              <span>
                <IconButton
                  size="small"
                  disabled={saving}
                  onClick={() => save("")}
                >
                  <DeleteOutline fontSize="small" />
                </IconButton>
              </span>
            </Tooltip>
          ) : null}
          <Tooltip title="Cancel">
            <span>
              <IconButton size="small" disabled={saving} onClick={cancelEdit}>
                <Close fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </div>
      </div>
    );
  }

  if (!message) {
    return (
      <button
        type="button"
        className="court-note court-note--empty"
        onClick={startEdit}
      >
        Add court note
      </button>
    );
  }

  return (
    <div className="court-note">
      <p className="court-note__message">{message}</p>
      <Tooltip title="Edit note">
        <IconButton
          size="small"
          className="court-note__edit"
          onClick={startEdit}
          aria-label="Edit court note"
        >
          <Edit fontSize="small" />
        </IconButton>
      </Tooltip>
    </div>
  );
}
