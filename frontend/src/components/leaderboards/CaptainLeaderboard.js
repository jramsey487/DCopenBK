import React, { useState, useEffect, useCallback } from "react";

import Link from "@mui/material/Link";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Autocomplete from "@mui/material/Autocomplete";
import TextField from "@mui/material/TextField";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Typography from "@mui/material/Typography";

import { DataGrid } from "@mui/x-data-grid";

import {
  BallkidAndIcon,
  ConfirmDialog,
  getAuthHeader,
  getCurrentYear,
} from "../Utils";
import { ratingsCaptainLeaderboard } from "../HelpMessages";
import { CHART_COLORS } from "../Consts";
import { RaterParamsChart } from "../ballkid/RaterParamsChart";
import {
  LeaderboardShell,
  LeaderboardGridPanel,
  LeaderboardNote,
  LEADERBOARD_BALLKID_COL_WIDTH_WIDE,
} from "./LeaderboardsShared";

function RaterParamsSection() {
  const [params, setParams] = useState();
  const [selected, setSelected] = useState([]);

  useEffect(() => {
    fetch("/api/calibration-parameters", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setParams(data));
  }, []);

  if (params === undefined || params === null) {
    return null;
  }

  return (
    <div className="leaderboard-chart-section">
      <h2 className="leaderboard-chart-section__title">
        Rater Parameters Comparison
      </h2>

      <Autocomplete
        multiple
        filterSelectedOptions
        options={params.map((param) => ({ id: param.id, name: param.name }))}
        getOptionLabel={(option) => option.name}
        isOptionEqualToValue={(option, value) => option.name === value.name}
        renderInput={(inputParams) => (
          <TextField
            label="Select raters to compare"
            variant="outlined"
            size="small"
            {...inputParams}
          />
        )}
        onChange={(e, val) => setSelected(val.map((obj) => obj.name))}
      />

      <RaterParamsChart
        captainData={selected.map((name, index) => {
          const rater = params.filter((obj) => obj["name"] === name)[0];
          const scale = rater.rater_scale;
          const offset = rater.rater_offset;

          return {
            label: name,
            data: [
              { x: 0.5, y: scale * 0.5 + offset },
              { x: 5, y: scale * 5 + offset },
            ],
            borderColor: CHART_COLORS[index % CHART_COLORS.length],
            backgroundColor: `${CHART_COLORS[index % CHART_COLORS.length]}50`,
          };
        })}
      />
    </div>
  );
}

const EMAIL_STATUS_LABEL = {
  ready: "Ready to send",
  sent: "Sent",
  held_back: "Held back",
  no_email: "No email on file",
};

function formatSentAt(iso) {
  if (!iso) {
    return "";
  }
  return new Date(iso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * Chairperson-only: email each captain/chairperson the crew feedback about
 * them. Anyone already emailed this year is skipped, so it's safe to click
 * again.
 */
function FeedbackEmailsSection() {
  const year = getCurrentYear();
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [waiting, setWaiting] = useState(false);

  const load = useCallback(() => {
    fetch(`/api/captain-feedback-emails/${year}`, { headers: getAuthHeader() })
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((payload) => {
        setData(payload);
        setError("");
        if (!payload.sending && payload.ready === 0) {
          setWaiting(false);
        }
      })
      .catch(() => setError("Could not load the feedback email list."));
  }, [year]);

  useEffect(() => {
    load();
  }, [load]);

  // Keep refreshing while emails are going out in the background.
  const polling = Boolean(data?.sending) || waiting;
  useEffect(() => {
    if (!polling) {
      return undefined;
    }
    const interval = setInterval(load, 3000);
    const giveUp = setTimeout(() => setWaiting(false), 90000);
    return () => {
      clearInterval(interval);
      clearTimeout(giveUp);
    };
  }, [polling, load]);

  if (error) {
    return (
      <div className="leaderboard-chart-section">
        <Typography color="error" variant="body2">
          {error}
        </Typography>
      </div>
    );
  }

  if (data === null) {
    return null;
  }

  if (data.rows.length === 0) {
    return (
      <div className="leaderboard-chart-section">
        <h2 className="leaderboard-chart-section__title">
          Email crew feedback to captains
        </h2>
        <LeaderboardNote>
          No crew feedback has been submitted for {year} yet.
        </LeaderboardNote>
      </div>
    );
  }

  const busy = data.sending || waiting;

  return (
    <div className="leaderboard-chart-section">
      <h2 className="leaderboard-chart-section__title">
        Email crew feedback to captains
      </h2>

      <LeaderboardNote>
        Each captain and chairperson gets one email with the feedback written
        about them. Names are only included where the rater chose to share
        theirs. People with fewer than {data.min_required} pieces of feedback
        are held back so their raters can&apos;t be worked out. Anyone already
        emailed is never emailed twice.
      </LeaderboardNote>

      <Box sx={{ display: "flex", alignItems: "center", gap: 2, flexWrap: "wrap" }}>
        <Button
          variant="contained"
          size="small"
          disabled={data.ready === 0 || busy}
          onClick={() => setConfirmOpen(true)}
        >
          {busy
            ? "Sending…"
            : `Email feedback to ${data.ready} ${
                data.ready === 1 ? "person" : "people"
              }`}
        </Button>
        <Typography variant="body2" color="text.secondary">
          {data.sent} sent · {data.ready} ready · {data.held_back} held back ·{" "}
          {data.no_email} without an email
        </Typography>
      </Box>

      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Name</TableCell>
              <TableCell align="right"># Feedback</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Sent</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.rows.map((row) => (
              <TableRow key={row.captain}>
                <TableCell>{row.name}</TableCell>
                <TableCell align="right">{row.feedback_count}</TableCell>
                <TableCell>
                  {EMAIL_STATUS_LABEL[row.status] || row.status}
                  {row.status === "held_back"
                    ? ` (needs ${data.min_required})`
                    : ""}
                </TableCell>
                <TableCell>{formatSentAt(row.sent_at)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <ConfirmDialog
        message={`You are about to email crew feedback to ${data.ready} captain${
          data.ready === 1 ? "" : "s"
        }/chairpeople. Emails can't be unsent.`}
        url={`/api/captain-feedback-emails/${year}`}
        body={{}}
        method="POST"
        open={confirmOpen}
        setOpen={setConfirmOpen}
        setUpdated={() => {
          setWaiting(true);
          load();
        }}
      />
    </div>
  );
}

export default function CaptainLeaderboard() {
  const [ballkids, setBallkids] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/get-captain-leaderboard", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setBallkids(data))
      .then(() => setLoading(false));
  }, []);

  const columns = [
    {
      field: "rank",
      headerName: "",
      width: 48,
      sortable: true,
      renderCell: (index) => index.api.getRowIndex(index.row.id) + 1,
    },
    {
      field: "name",
      headerName: "Captain / Chairperson",
      width: LEADERBOARD_BALLKID_COL_WIDTH_WIDE,
      renderCell: (rowData) => (
        <Box className="leaderboard-name-cell">
          <BallkidAndIcon ballkid={rowData.row.ballkid} />
        </Box>
      ),
    },
    {
      field: "numRatings",
      headerName: "# of Ratings",
      width: 110,
      valueGetter: (rowData) => rowData.row.ballkid.num_ratings,
    },
    {
      field: "avgRating",
      headerName: "Average",
      width: 100,
      valueGetter: (rowData) => rowData.row.ballkid.raw_avg,
      valueFormatter: (obj) => (!obj.value ? "" : Number(obj.value.toFixed(3))),
    },
    {
      field: "stdevRating",
      headerName: "Std. Dev.",
      width: 100,
      valueGetter: (rowData) => rowData.row.ballkid.raw_stdev,
      valueFormatter: (obj) => (!obj.value ? "" : Number(obj.value.toFixed(3))),
    },
    {
      field: "scale",
      headerName: "Cal. Scale",
      width: 110,
      valueGetter: (rowData) => rowData.row.ballkid.scale,
      valueFormatter: (obj) => (!obj.value ? "" : Number(obj.value.toFixed(3))),
    },
    {
      field: "offset",
      headerName: "Cal. Offset",
      width: 110,
      valueGetter: (rowData) => rowData.row.ballkid.offset,
      valueFormatter: (obj) => (!obj.value ? "" : Number(obj.value.toFixed(3))),
    },
    {
      field: "distanceToIdeal",
      headerName: "Distance To Ideal",
      width: 140,
      valueGetter: (rowData) => rowData.row.ballkid.distance_to_ideal,
      valueFormatter: (obj) => (!obj.value ? "" : Number(obj.value.toFixed(3))),
    },
  ];

  const rows = ballkids.map((ballkid) => ({
    id: ballkid.id,
    ballkid: ballkid,
  }));

  return (
    <LeaderboardShell
      title="Ratings — Captain"
      helpPage="Ratings Leaderboard - Captain"
      helpMessage={ratingsCaptainLeaderboard}
      footer={
        <LeaderboardNote>
          Average and standard deviation are for ratings submitted (not
          received) by this captain/chairperson. Calibration scale and offset
          use the method described{" "}
          <Link
            target="_blank"
            rel="noopener noreferrer"
            href="https://github.com/jtiosue/rcal/blob/master/report/review_calibration.pdf"
          >
            here
          </Link>
          .
        </LeaderboardNote>
      }
    >
      <LeaderboardGridPanel loading={loading}>
        {!loading ? (
          <div className="ratings-grid-frame">
            <DataGrid
              columns={columns}
              rows={rows}
              density="compact"
              disableSelectionOnClick
            />
          </div>
        ) : null}
      </LeaderboardGridPanel>

      {!loading ? <RaterParamsSection /> : null}

      <FeedbackEmailsSection />
    </LeaderboardShell>
  );
}
