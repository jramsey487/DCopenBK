import React, { useEffect, useState } from "react";
import {
  Autocomplete,
  Box,
  Button,
  Chip,
  List,
  ListItem,
  ListItemText,
  Paper,
  TextField,
  Typography,
} from "@mui/material";

import { getAuthHeader } from "../Utils";

// Admin-only: lets a chairperson manually link ballkids (e.g. from an
// applicant's "traveling with" answer) so TeamsGenerator places them on the
// same team -- and therefore the same working shift -- when teams are
// auto-created.
export default function ShiftGroupsPage() {
  const [groups, setGroups] = useState([]);
  const [ballkids, setBallkids] = useState([]);
  const [selected, setSelected] = useState([]);
  const [name, setName] = useState("");
  const [error, setError] = useState("");

  const loadGroups = () => {
    fetch("/api/shift-groups", { headers: getAuthHeader() })
      .then((res) => res.json())
      .then((data) => setGroups(data));
  };

  useEffect(() => {
    loadGroups();
    fetch("/api/list", { headers: getAuthHeader() })
      .then((res) => res.json())
      .then((data) => setBallkids(Array.isArray(data) ? data : []));
  }, []);

  const createGroup = async () => {
    setError("");
    const response = await fetch("/api/shift-groups", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...getAuthHeader(),
      },
      body: JSON.stringify({
        name,
        ballkids: selected.map((b) => b.id),
      }),
    });
    if (!response.ok) {
      const data = await response.json();
      setError(data.ballkids?.[0] || data.non_field_errors?.[0] || "Could not create group.");
      return;
    }
    setName("");
    setSelected([]);
    loadGroups();
  };

  const deleteGroup = async (id) => {
    await fetch(`/api/shift-groups/${id}`, {
      method: "DELETE",
      headers: getAuthHeader(),
    });
    loadGroups();
  };

  return (
    <Paper sx={{ p: 3, maxWidth: 700, mx: "auto", mt: 2 }}>
      <Typography variant="h6" gutterBottom>
        Shift Groups
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Ballkids in the same group are placed on the same team when you
        auto-create teams -- it doesn't matter which team, only that
        everyone in the group ends up on it together, since a team's
        schedule (court + hours) is shared by everyone on it.
      </Typography>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mb: 4 }}>
        <TextField
          label="Group name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          size="small"
        />
        <Autocomplete
          multiple
          options={ballkids}
          getOptionLabel={(b) => `${b.first_name} ${b.last_name}`}
          value={selected}
          onChange={(_, value) => setSelected(value)}
          renderInput={(params) => (
            <TextField {...params} label="Ballkids in this group" size="small" />
          )}
        />
        {error ? (
          <Typography color="error" variant="body2">
            {error}
          </Typography>
        ) : null}
        <Button
          variant="contained"
          disabled={selected.length < 2}
          onClick={createGroup}
          sx={{ alignSelf: "flex-start" }}
        >
          Create Group
        </Button>
      </Box>

      <Typography variant="subtitle1" gutterBottom>
        Existing groups
      </Typography>
      <List>
        {groups.map((group) => (
          <ListItem
            key={group.id}
            secondaryAction={
              <Button size="small" color="error" onClick={() => deleteGroup(group.id)}>
                Delete
              </Button>
            }
          >
            <ListItemText
              primary={group.name || `Group #${group.id}`}
              secondary={
                <Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5, mt: 0.5 }}>
                  {group.ballkid_names.map((n) => (
                    <Chip key={n} label={n} size="small" />
                  ))}
                </Box>
              }
            />
          </ListItem>
        ))}
        {groups.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No shift groups yet.
          </Typography>
        ) : null}
      </List>
    </Paper>
  );
}
