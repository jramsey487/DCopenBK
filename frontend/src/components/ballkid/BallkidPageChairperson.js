import React, { useEffect, useRef, useState } from "react";
import { useParams, Link as RouterLink } from "react-router-dom";

import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import IconButton from "@mui/material/IconButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import TextField from "@mui/material/TextField";
import Alert from "@mui/material/Alert";
import Table from "@mui/material/Table";
import TableContainer from "@mui/material/TableContainer";
import TableRow from "@mui/material/TableRow";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import CircularProgress from "@mui/material/CircularProgress";
import Tooltip from "@mui/material/Tooltip";

import LoadingButton from "@mui/lab/LoadingButton/LoadingButton";

import AspectRatio from "@mui/joy/AspectRatio";

import MoreVert from "@mui/icons-material/MoreVert";
import Dangerous from "@mui/icons-material/Dangerous";
import ArrowCircleUp from "@mui/icons-material/ArrowCircleUp";
import ArrowCircleDown from "@mui/icons-material/ArrowCircleDown";
import RateReview from "@mui/icons-material/RateReview";
import Archive from "@mui/icons-material/Archive";
import Unarchive from "@mui/icons-material/Unarchive";
import ReportOff from "@mui/icons-material/ReportOff";
import Shortcut from "@mui/icons-material/Shortcut";
import RemoveCircle from "@mui/icons-material/RemoveCircle";
import AddCircle from "@mui/icons-material/AddCircle";
import Done from "@mui/icons-material/Done";
import Close from "@mui/icons-material/Close";
import Edit from "@mui/icons-material/Edit";

import RatingDialog from "../ratings/RatingDialog";
import { CheckinHistoryChart } from "./CheckinHistoryChart";
import { CaptainHistoryChart } from "./CaptainHistoryChart";
import { CourtHistoryChart } from "./CourtHistoryChart";
import { RaterParamsChart } from "./RaterParamsChart";
import { BallkidParamsChart } from "./BallkidParamsChart";

import {
  Icons,
  getAuthHeader,
  getLocalStorage,
  useIsMobile,
  getTimeFloat,
  getDurationStr,
  Alerts,
  toPercent,
  getTimeStr,
  Banners,
} from "../Utils";
import {
  NUM_RATERS_WARNING_THRESHOLD,
  NUM_RATINGS_WARNING_THRESHOLD,
  MARGINS,
  CHART_COLORS,
  CHECKOUT_OPTIONS,
  LAST_DAY_OPTIONS,
} from "../Consts";

function renderHeader(ballkid, setUpdated, isMobile) {
  const overflowMenu =
    ballkid.is_cut === "true" || !ballkid.is_active ? (
      <InactiveOverflowMenu ballkid={ballkid} setUpdated={setUpdated} />
    ) : (
      <ActiveOverflowMenu ballkid={ballkid} setUpdated={setUpdated} />
    );

  const headerStatus = ballkid.is_cut ? (
    <Typography variant="h5" color="error">
      Cut
    </Typography>
  ) : !ballkid.is_active ? (
    <Typography variant="h5" color="error">
      Inactive
    </Typography>
  ) : (
    <CheckinSection
      ballkid={ballkid}
      setUpdated={setUpdated}
      isMobile={isMobile}
    />
  );

  return (
    <div className={isMobile ? "" : "justify"}>
      <div className="sxs">
        <Typography variant="h4">
          {ballkid.first_name} {ballkid.last_name}
        </Typography>
        &ensp;
        <Icons ballkid={ballkid} margin={0} />
        &ensp;
        {overflowMenu}
      </div>
      {headerStatus}
    </div>
  );
}

function CheckinSection({ ballkid, setUpdated, isMobile }) {
  const [loading, setLoading] = useState(false);

  return (
    <Box
      textAlign="center"
      className={isMobile ? "justify" : ""}
      sx={{ my: isMobile ? 1 : 0 }}
    >
      <Typography
        variant="h6"
        color={ballkid.is_checked_in ? "success.main" : "error"}
      >
        {ballkid.is_checked_in ? "Checked In" : "Checked Out"}
      </Typography>
      <LoadingButton
        variant="outlined"
        loading={loading}
        color={ballkid.is_checked_in ? "error" : "success"}
        onClick={(e) => {
          setLoading(true);
          fetch("/api/update-ballkid", {
            method: "PATCH",
            headers: getAuthHeader(),
            body: JSON.stringify({
              first_name: ballkid.first_name,
              last_name: ballkid.last_name,
              is_checked_in: ballkid.is_checked_in ? false : true,
            }),
          })
            .then((response) => response.json())
            .then(() => {
              setUpdated(true);
              setLoading(false);
            });
        }}
      >
        {ballkid.is_checked_in ? "Check Out" : "Check In"}
      </LoadingButton>
    </Box>
  );
}

function renderPreferredPosition(ballkid, setUpdated, isMobile) {
  const positions = new Set(["Back", "Net", "Back/Net", "Net/Back"]);
  positions.delete(ballkid.preferred_position);

  return (
    <div className={isMobile ? "" : "justify"}>
      <Typography variant="body1">
        Preferred position: {ballkid.preferred_position}
      </Typography>
      <div className="sxs">
        <Typography variant="body1" sx={{ ml: isMobile ? 2 : 0 }}>
          Change to: &emsp;
        </Typography>
        {[...positions].map((newPosition) => (
          <Button
            key={newPosition}
            size="small"
            sx={{ m: 0.2 }}
            variant="outlined"
            onClick={(e) => {
              fetch("/api/update-ballkid", {
                method: "PATCH",
                headers: getAuthHeader(),
                body: JSON.stringify({
                  first_name: ballkid.first_name,
                  last_name: ballkid.last_name,
                  preferred_position: newPosition,
                }),
              })
                .then((response) => response.json())
                .then(() => setUpdated(true));
            }}
          >
            {newPosition}
          </Button>
        ))}
      </div>
    </div>
  );
}

function renderPosition(ballkid, setUpdated, isMobile) {
  const newPosition = ballkid.position === "Back" ? "Net" : "Back";

  return (
    <div className={isMobile ? "" : "justify"}>
      <Typography variant="body1">Position: {ballkid.position}</Typography>
      {ballkid.current_team === 0 ? (
        ""
      ) : (
        <div className="sxs">
          <Typography variant="body1" sx={{ ml: isMobile ? 2 : 0 }}>
            Change to: &emsp;
          </Typography>
          <Button
            size="small"
            sx={{ m: 0.2 }}
            variant="outlined"
            onClick={(e) => {
              fetch("/api/update-ballkid", {
                method: "PATCH",
                headers: getAuthHeader(),
                body: JSON.stringify({
                  first_name: ballkid.first_name,
                  last_name: ballkid.last_name,
                  position: newPosition,
                }),
              })
                .then((response) => response.json())
                .then(() => setUpdated(true));
            }}
          >
            {newPosition}
          </Button>
        </div>
      )}
    </div>
  );
}

function renderTeamButton(ballkid, buttonString, teamNum, setUpdated) {
  return (
    <Button
      key={teamNum}
      sx={{ m: 0.2, minWidth: 0 }}
      size="small"
      variant="outlined"
      onClick={(e) => {
        fetch("/api/update-ballkid", {
          method: "PATCH",
          headers: getAuthHeader(),
          body: JSON.stringify({
            first_name: ballkid.first_name,
            last_name: ballkid.last_name,
            current_team: teamNum,
          }),
        })
          .then((response) => response.json())
          .then(() => setUpdated(true));
      }}
    >
      {buttonString}
    </Button>
  );
}

function renderTeam(ballkid, teams, setUpdated, isMobile) {
  return (
    <div className={isMobile ? "" : "justify"}>
      <Typography variant="body1" sx={{ pr: 1 }}>
        Current Team:{" "}
        {ballkid.current_team === 0 ? "Unassigned" : ballkid.current_team}
      </Typography>
      {!ballkid.is_checked_in ? (
        ""
      ) : (
        <Box className="sxs" sx={{ maxWidth: "100%" }}>
          <Typography variant="body1" sx={{ ml: isMobile ? 2 : 0, pr: 1 }}>
            Change to:
          </Typography>

          <Box>
            {teams.map((team) =>
              team === ballkid.current_team
                ? ""
                : renderTeamButton(ballkid, team, team, setUpdated)
            )}
            {renderTeamButton(
              ballkid,
              "New Team",
              teams.length + 1,
              setUpdated
            )}
            {ballkid.current_team === 0
              ? ""
              : renderTeamButton(ballkid, "Unassign", 0, setUpdated)}
          </Box>
        </Box>
      )}
    </div>
  );
}

export function renderBallkidFinalsHistory(finals) {
  return (
    <Grid item xs={12} md={6.5}>
      <Typography variant="h6" sx={MARGINS}>
        Previous Years' Finals:
      </Typography>
      {finals.length === 0 ? (
        <Typography>No finals history to show.</Typography>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell align="center">Match Type</TableCell>
                <TableCell align="center">Count (Since 2013)</TableCell>
                <TableCell align="center">Year(s)</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {finals.map((final) => (
                <TableRow key={final.id}>
                  <TableCell align="center">{final.match_type}</TableCell>

                  <TableCell align="center">{final.count}</TableCell>
                  <TableCell align="center">{final.years.join(", ")}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Grid>
  );
}

export function renderBallkidCutHistory(cuts) {
  return (
    <Grid item xs={12} md={6.5}>
      <Typography variant="h6" sx={MARGINS}>
        Previous Years' Cuts:
      </Typography>
      {cuts.length === 0 ? (
        <Typography>No cut history to show.</Typography>
      ) : (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell align="center">Year</TableCell>
                <TableCell align="center">Furthest Day</TableCell>
                <TableCell align="center">Self-Cut?</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cuts.map((cut) => (
                <TableRow key={cut.id}>
                  <TableCell align="center">{cut.year}</TableCell>
                  <TableCell align="center">{cut.furthest_day}</TableCell>
                  <TableCell align="center">
                    {cut.self_cut ? "Yes" : "No"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Grid>
  );
}

function renderRatingsCaptainSection(ballkid, ballkidGroup, params) {
  const pk = getLocalStorage("ballkid_id");

  return (
    <Grid item xs={12} lg={6} sx={{ mx: 1 }}>
      <Button
        size="small"
        variant="outlined"
        component={RouterLink}
        to={`/ratings?rater=${ballkid.id}`}
        endIcon={<Shortcut />}
        sx={{ my: 1 }}
      >
        View all {params.num_rater_ratings} rating(s) by{" "}
        {pk === ballkid.id ? "me" : `this ${ballkidGroup}`}
      </Button>

      <Typography variant="body1">
        Reviewer average: {Number(params.rater_raw_avg).toFixed(3)}
      </Typography>
      <Typography variant="body1">
        Reviewer standard deviation: {Number(params.rater_raw_stdev).toFixed(3)}
      </Typography>

      {params.rater_scale == null ? (
        ""
      ) : (
        <div>
          <Typography variant="body1">
            Reviewer scale: {Number(params.rater_scale).toFixed(3)}
          </Typography>
          <Typography variant="body1">
            Reviewer offset: {Number(params.rater_offset).toFixed(3)}
          </Typography>

          <RaterParamsChart
            captainData={[
              {
                label: "Captain",

                data: [
                  { x: 0.5, y: params.rater_scale * 0.5 + params.rater_offset },
                  { x: 5, y: params.rater_scale * 5 + params.rater_offset },
                ],
                borderColor: CHART_COLORS[11],
                backgroundColor: `${CHART_COLORS[11]}50`,
              },
            ]}
            sx={{ mb: 2 }}
          />
        </div>
      )}
    </Grid>
  );
}

function renderRatingsBallkidSection(ballkid, params) {
  return (
    <Grid item xs={12} lg={5.5} sx={{ mx: 1 }}>
      <Button
        size="small"
        variant="outlined"
        component={RouterLink}
        to={`/ratings?ratee=${ballkid.id}`}
        endIcon={<Shortcut />}
        sx={{ my: 1, mr: 1 }}
      >
        View all {params.num_ratee_ratings} rating(s) for this ballkid
      </Button>
      <Button
        size="small"
        variant="outlined"
        component={RouterLink}
        to={`/my-ratings?ratee=${ballkid.id}`}
        endIcon={<Shortcut />}
        sx={{ my: 1 }}
      >
        View my {ballkid.num_my_ratings} rating(s) for this ballkid
      </Button>

      {params.ratee_improvement == null ? (
        ""
      ) : (
        <div>
          {params.num_ratee_ratings >= NUM_RATINGS_WARNING_THRESHOLD &&
          params.num_raters >= NUM_RATERS_WARNING_THRESHOLD ? (
            ""
          ) : (
            <Alert severity="warning" sx={{ my: 1 }}>
              Note: This ballkid only had {params.num_raters} rater(s) and
              received a total of {params.num_ratee_ratings} rating(s).
            </Alert>
          )}

          <Typography variant="body1">
            Ballkid improvement: {Number(params.ratee_improvement).toFixed(3)}
          </Typography>
          <Typography variant="body1">
            Ballkid offset: {Number(params.ratee_offset).toFixed(3)}
          </Typography>

          <BallkidParamsChart
            offset={params.ratee_offset}
            improvement={params.ratee_improvement}
            sx={{ mb: 2 }}
          />
        </div>
      )}
    </Grid>
  );
}

function RatingSection({ ballkid }) {
  const [params, setParams] = useState({});

  const ballkidGroup = ballkid.is_chairperson
    ? "chairperson"
    : ballkid.is_captain
    ? "captain"
    : "ballkid";

  useEffect(() => {
    fetch(`/api/calibration-parameters/${ballkid.id}`, {
      headers: getAuthHeader(),
    })
      .then((response) => response.json())
      .then((data) => setParams(data));
  }, [ballkid.id]);

  return (
    <Grid container>
      <Grid item xs={12}>
        <Typography variant="h6">Ratings:</Typography>
      </Grid>
      {ballkidGroup === "ballkid"
        ? ""
        : renderRatingsCaptainSection(ballkid, ballkidGroup, params)}

      {ballkidGroup === "chairperson"
        ? ""
        : renderRatingsBallkidSection(ballkid, params)}
    </Grid>
  );
}

function InactiveOverflowMenu(props) {
  const ballkid = props.ballkid;
  const [anchorEl, setAnchorEl] = useState(null);

  return (
    <div>
      <IconButton
        onClick={(e) => {
          setAnchorEl(e.currentTarget);
        }}
      >
        <MoreVert />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => {
          setAnchorEl(null);
        }}
      >
        {ballkid.is_cut === "true" ? (
          <MenuItem
            onClick={(e) => {
              setAnchorEl(null);
              fetch("/api/update-ballkid", {
                method: "PATCH",
                headers: getAuthHeader(),
                body: JSON.stringify({
                  first_name: ballkid.first_name,
                  last_name: ballkid.last_name,
                  is_cut: "false",
                }),
              })
                .then((response) => response.json())
                .then(() => props.setUpdated(true));
            }}
          >
            <ListItemIcon>
              <ReportOff />
            </ListItemIcon>
            <ListItemText>Un-cut</ListItemText>
          </MenuItem>
        ) : (
          <MenuItem
            onClick={(e) => {
              setAnchorEl(null);
              fetch("/api/update-ballkid", {
                method: "PATCH",
                headers: getAuthHeader(),
                body: JSON.stringify({
                  first_name: ballkid.first_name,
                  last_name: ballkid.last_name,
                  is_active: true,
                }),
              })
                .then((response) => response.json())
                .then(() => props.setUpdated(true));
            }}
          >
            <ListItemIcon>
              <Unarchive />
            </ListItemIcon>
            <ListItemText>Un-archive</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </div>
  );
}

function ActiveOverflowMenu(props) {
  const ballkid = props.ballkid;
  const [anchorEl, setAnchorEl] = useState(null);
  const [open, setOpen] = useState(false);

  return (
    <div>
      <RatingDialog
        open={open}
        setOpen={setOpen}
        ballkid={props.ballkid}
        setUpdated={props.setUpdated}
      />

      <IconButton
        onClick={(e) => {
          setAnchorEl(e.currentTarget);
        }}
      >
        <MoreVert />
      </IconButton>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => {
          setAnchorEl(null);
        }}
      >
        {ballkid.id === getLocalStorage("ballkid_id") ? (
          ""
        ) : (
          <MenuItem
            onClick={(e) => {
              setAnchorEl(null);
              setOpen(true);
            }}
          >
            <ListItemIcon>
              <RateReview />
            </ListItemIcon>
            <ListItemText>Give Rating</ListItemText>
          </MenuItem>
        )}

        <MenuItem
          onClick={(e) => {
            setAnchorEl(null);
            fetch("/api/update-ballkid", {
              method: "PATCH",
              headers: getAuthHeader(),
              body: JSON.stringify({
                first_name: ballkid.first_name,
                last_name: ballkid.last_name,
                is_cut: "true",
              }),
            })
              .then((response) => response.json())
              .then(() => props.setUpdated(true));
          }}
        >
          <ListItemIcon>
            <Dangerous />
          </ListItemIcon>
          <ListItemText>Cut</ListItemText>
        </MenuItem>
        <MenuItem
          onClick={(e) => {
            setAnchorEl(null);
            fetch("/api/update-ballkid", {
              method: "PATCH",
              headers: getAuthHeader(),
              body: JSON.stringify({
                first_name: ballkid.first_name,
                last_name: ballkid.last_name,
                is_active: false,
              }),
            })
              .then((response) => response.json())
              .then(() => props.setUpdated(true));
          }}
        >
          <ListItemIcon>
            <Archive />
          </ListItemIcon>
          <ListItemText>Archive</ListItemText>
        </MenuItem>
        {ballkid.is_captain ? (
          <MenuItem
            onClick={() => {
              setAnchorEl(null);
              fetch("/api/update-ballkid", {
                method: "PATCH",
                headers: getAuthHeader(),
                body: JSON.stringify({
                  first_name: ballkid.first_name,
                  last_name: ballkid.last_name,
                  is_captain: false,
                }),
              })
                .then((response) => response.json())
                .then(() => props.setUpdated(true));
            }}
          >
            <ListItemIcon>
              <ArrowCircleDown />
            </ListItemIcon>
            <ListItemText>Demote from Captain</ListItemText>
          </MenuItem>
        ) : (
          <MenuItem
            onClick={() => {
              setAnchorEl(null);
              fetch("/api/update-ballkid", {
                method: "PATCH",
                headers: getAuthHeader(),
                body: JSON.stringify({
                  first_name: ballkid.first_name,
                  last_name: ballkid.last_name,
                  is_captain: true,
                }),
              })
                .then((response) => response.json())
                .then(() => props.setUpdated(true));
            }}
          >
            <ListItemIcon>
              <ArrowCircleUp />
            </ListItemIcon>
            <ListItemText>Promote to Captain</ListItemText>
          </MenuItem>
        )}
      </Menu>
    </div>
  );
}

function DropdownComments({
  ballkid,
  commentType,
  setSuccessMsg,
  setErrorMsg,
}) {
  const defaultComments =
    commentType === "checkout" ? ballkid.checkout_comments : ballkid.last_day;

  const [disabled, setDisabled] = useState(true);
  const [savedComments, setSavedComments] = useState(defaultComments ?? "");
  const [comments, setComments] = useState(defaultComments ?? "");

  return (
    <div className="sxs">
      <Typography variant="body1" sx={{ mr: 1 }}>
        {commentType === "checkout" ? "Today's Checkout Time:" : "Last Day:"}
      </Typography>
      <Box className="sxs">
        <TextField
          select
          disabled={disabled}
          value={comments}
          variant="standard"
          sx={{ mx: 0.5 }}
          style={{ minWidth: 125 }}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
          onChange={(e) => setComments(e.target.value)}
          onDoubleClick={() => setDisabled(false)}
        >
          {(commentType === "checkout"
            ? CHECKOUT_OPTIONS
            : LAST_DAY_OPTIONS
          ).map((value) => (
            <MenuItem key={value} value={value}>
              {value}
            </MenuItem>
          ))}
        </TextField>

        {disabled ? (
          <IconButton
            size="small"
            disabled={!disabled}
            onClick={() => setDisabled(false)}
            sx={{ mt: 0.5 }}
          >
            <Tooltip title="Edit">
              <Edit />
            </Tooltip>
          </IconButton>
        ) : (
          <Box>
            <IconButton
              size="small"
              sx={{ ml: 2 }}
              onClick={() => {
                const commentsBody =
                  commentType === "checkout"
                    ? { checkout_comments: comments }
                    : { last_day: comments };

                fetch("/api/update-ballkid", {
                  method: "PATCH",
                  headers: getAuthHeader(),
                  body: JSON.stringify({
                    first_name: ballkid.first_name,
                    last_name: ballkid.last_name,
                    ...commentsBody,
                  }),
                }).then((response) => {
                  if (response.ok) {
                    setSuccessMsg("Comments saved!");
                    setDisabled(true);
                    setSavedComments(comments);
                  } else {
                    setErrorMsg("Error saving comments.");
                  }
                });
              }}
            >
              <Tooltip title="Save">
                <Done />
              </Tooltip>
            </IconButton>
            <IconButton
              size="small"
              onClick={() => {
                setComments(savedComments);
                setDisabled(true);
              }}
            >
              <Tooltip title="Cancel">
                <Close />
              </Tooltip>
            </IconButton>
          </Box>
        )}
      </Box>
    </div>
  );
}

function Comments({ ballkid, setSuccessMsg, setErrorMsg }) {
  const [disabled, setDisabled] = useState(true);
  const [savedComments, setSavedComments] = useState(ballkid.comments ?? "");
  const [comments, setComments] = useState(ballkid.comments ?? "");

  const commentsInput = useRef(null);

  return (
    <div>
      <div className="sxs">
        {/* <Typography variant="body1" fontWeight="medium"> */}
        <Typography variant="body1">Other Chairperson Comments:</Typography>
        <IconButton
          size="small"
          disabled={!disabled}
          onClick={() => {
            setDisabled(false);
            setTimeout(() => commentsInput.current.focus(), 100);
          }}
          sx={{ mt: 0.5 }}
        >
          <Tooltip title="Edit">
            <Edit />
          </Tooltip>
        </IconButton>
      </div>

      {disabled ? (
        <Typography color="gray">{comments}</Typography>
      ) : (
        <div className="sxs">
          <TextField
            variant="standard"
            multiline
            value={comments}
            style={{ width: "100%" }}
            disabled={disabled}
            inputRef={commentsInput}
            onFocus={(e) =>
              e.currentTarget.setSelectionRange(
                e.currentTarget.value.length,
                e.currentTarget.value.length
              )
            }
            onChange={(e) => setComments(e.target.value)}
          />

          <IconButton
            size="small"
            sx={{ ml: 2 }}
            onClick={() =>
              fetch("/api/update-ballkid", {
                method: "PATCH",
                headers: getAuthHeader(),
                body: JSON.stringify({
                  first_name: ballkid.first_name,
                  last_name: ballkid.last_name,
                  comments: comments,
                }),
              }).then((response) => {
                if (response.ok) {
                  setSuccessMsg("Comments saved!");
                  setDisabled(true);
                  setSavedComments(comments);
                } else {
                  setErrorMsg("Error saving comments.");
                }
              })
            }
          >
            <Tooltip title="Save">
              <Done />
            </Tooltip>
          </IconButton>
          <IconButton
            size="small"
            onClick={() => {
              setComments(savedComments);
              setDisabled(true);
            }}
          >
            <Tooltip title="Cancel">
              <Close />
            </Tooltip>
          </IconButton>
        </div>
      )}
    </div>
  );
}

export function AggregateMetrics({ pk }) {
  const [metrics, setMetrics] = useState([]);
  const [averages, setAverages] = useState();
  const [checkinTimeMetrics, setCheckinTimeMetrics] = useState();
  const [loading, setLoading] = useState(true);

  const isChairperson = getLocalStorage("group") === "chairperson";

  useEffect(() => {
    fetch(`/api/get-checkin-court-analytics/${pk}`, {
      headers: getAuthHeader(),
    })
      .then((response) => response.json())
      .then((data) => setMetrics(data));

    fetch(`/api/get-average-checkin-time/${pk}`, {
      headers: getAuthHeader(),
    })
      .then((response) => response.json())
      .then((data) => setCheckinTimeMetrics(data));

    if (isChairperson) {
      fetch("/api/get-average-court-leaderboard", {
        headers: getAuthHeader(),
      })
        .then((response) => response.json())
        .then((data) => setAverages(data))
        .then(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [pk, isChairperson]);

  return loading ? (
    <CircularProgress className="center-div" size={30} />
  ) : (
    <Grid container>
      <Grid item xs={12} sm={11} md={9} lg={7} xl={5}>
        <TableContainer>
          <Table size="small">
            {!isChairperson ? (
              ""
            ) : (
              <TableHead>
                <TableRow>
                  <TableCell align="center"></TableCell>
                  <TableCell align="center">Ballkid</TableCell>
                  <TableCell align="center">Average</TableCell>
                </TableRow>
              </TableHead>
            )}

            <TableBody>
              <TableRow>
                <TableCell align="center" sx={{ fontWeight: "medium" }}>
                  Total Time Checked In
                </TableCell>
                <TableCell align="center">
                  {getDurationStr(getTimeFloat(metrics.checkin_duration))}
                </TableCell>
                {!isChairperson ? (
                  ""
                ) : (
                  <TableCell align="center">
                    {getDurationStr(parseFloat(averages.checkin_avg) / 3600)}
                  </TableCell>
                )}
              </TableRow>

              <TableRow>
                <TableCell align="center" sx={{ fontWeight: "medium" }}>
                  Total Days Checked In
                </TableCell>
                <TableCell align="center">{metrics.checkin_days}</TableCell>
                {!isChairperson ? (
                  ""
                ) : (
                  <TableCell align="center">
                    {Number(averages.days_avg).toFixed(1)}
                  </TableCell>
                )}
              </TableRow>

              <TableRow>
                <TableCell align="center" sx={{ fontWeight: "medium" }}>
                  Average Time Checked In Per Day
                </TableCell>

                <TableCell align="center">
                  {getDurationStr(
                    getTimeFloat(metrics.checkin_duration) /
                      metrics.checkin_days
                  )}
                </TableCell>
                {!isChairperson ? (
                  ""
                ) : (
                  <TableCell align="center">
                    {getDurationStr(
                      parseFloat(averages.checkin_avg) /
                        3600 /
                        averages.days_avg
                    )}
                  </TableCell>
                )}
              </TableRow>

              <TableRow>
                <TableCell align="center" sx={{ fontWeight: "medium" }}>
                  Average Check-in Time
                </TableCell>
                <TableCell align="center">
                  {getTimeStr(parseFloat(checkinTimeMetrics?.ballkid) / 3600)}
                </TableCell>
                {!isChairperson ? (
                  ""
                ) : (
                  <TableCell align="center">
                    {getTimeStr(parseFloat(checkinTimeMetrics?.average) / 3600)}
                  </TableCell>
                )}
              </TableRow>

              <TableRow>
                <TableCell align="center" sx={{ fontWeight: "medium" }}>
                  Average Check-out Time
                </TableCell>
                <TableCell align="center">
                  {getTimeStr(
                    parseFloat(checkinTimeMetrics?.ballkid) / 3600 +
                      getTimeFloat(metrics.checkin_duration) /
                        metrics.checkin_days
                  )}
                </TableCell>
                {!isChairperson ? (
                  ""
                ) : (
                  <TableCell align="center">
                    {getTimeStr(
                      parseFloat(checkinTimeMetrics?.average) / 3600 +
                        parseFloat(averages.checkin_avg) /
                          3600 /
                          averages.days_avg
                    )}
                  </TableCell>
                )}
              </TableRow>

              <TableRow>
                <TableCell align="center" sx={{ fontWeight: "medium" }}>
                  Total Time on Court
                </TableCell>
                <TableCell align="center">
                  {getDurationStr(getTimeFloat(metrics.court_duration))}
                </TableCell>
                {!isChairperson ? (
                  ""
                ) : (
                  <TableCell align="center">
                    {getDurationStr(parseFloat(averages.court_avg) / 3600)}
                  </TableCell>
                )}
              </TableRow>

              <TableRow>
                <TableCell align="center" sx={{ fontWeight: "medium" }}>
                  % Time on Court
                </TableCell>
                <TableCell align="center">
                  {getTimeFloat(metrics.checkin_duration) === 0
                    ? "0%"
                    : toPercent(
                        getTimeFloat(metrics.court_duration) /
                          getTimeFloat(metrics.checkin_duration)
                      )}
                </TableCell>
                {!isChairperson ? (
                  ""
                ) : (
                  <TableCell align="center">
                    {toPercent(
                      parseFloat(averages.court_avg) /
                        parseFloat(averages.checkin_avg)
                    )}
                  </TableCell>
                )}
              </TableRow>
            </TableBody>
          </Table>
        </TableContainer>
      </Grid>
    </Grid>
  );
}

export default function BallkidPageChairperson(props) {
  const [ballkid, setBallkid] = useState(null);
  const [updated, setUpdated] = useState(false);
  const [teams, setTeams] = useState([]);

  const [finals, setFinals] = useState([]);
  const [cuts, setCuts] = useState([]);

  const [successMsg, setSuccessMsg] = useState();
  const [errorMsg, setErrorMsg] = useState();

  const isMobile = useIsMobile();
  var { pk } = useParams();
  pk = parseInt(pk ?? getLocalStorage("ballkid_id"));

  useEffect(() => {
    fetch(`/api/get-ballkid/${pk}/${getLocalStorage("ballkid_id")}`, {
      headers: getAuthHeader(),
    })
      .then((response) => response.json())
      .then((data) => setBallkid(data));

    fetch("/api/calc-num-teams", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setTeams(data["teams"]));

    fetch(`/api/get-finals-history/${pk}`, { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setFinals(data));

    fetch(`/api/get-cut-history/${pk}`, { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setCuts(data))
      .then(() => setUpdated(false));
  }, [updated, pk]);

  return ballkid == null ? (
    ""
  ) : (
    <div className="page">
      <Banners />

      <Alerts
        successMsg={successMsg}
        errorMsg={errorMsg}
        setSuccessMsg={setSuccessMsg}
        setErrorMsg={setErrorMsg}
      />

      {renderHeader(ballkid, setUpdated, isMobile)}

      <Grid container>
        <Grid
          item
          xs={12}
          sm={4}
          md={3}
          lg={2}
          sx={{ pr: 2, pl: isMobile ? 2 : 0, mb: 1 }}
        >
          <AspectRatio ratio="1/1">
            <Box width="95%" component="img" src={"../" + ballkid.image} />
          </AspectRatio>
        </Grid>

        <Grid item xs={12} sm={8} md={9} lg={10}>
          <Typography variant="h6"> Info:</Typography>
          <Typography variant="body1"> Age: {ballkid.age} </Typography>
          <Typography variant="body1">
            Years experience: {ballkid.num_years_experience}
          </Typography>
          <Typography variant="body1">Phone number: {ballkid.phone}</Typography>
          <Typography variant="body1">
            Emergency contact name: {ballkid.emergency_name}
          </Typography>
          <Typography variant="body1">
            Emergency contact phone number: {ballkid.emergency_phone}
          </Typography>

          {renderPreferredPosition(ballkid, setUpdated, isMobile)}
          <br />

          {ballkid.is_cut || !ballkid.is_active ? (
            ""
          ) : (
            <div>
              <Typography variant="h6"> Current Info: </Typography>
              {renderPosition(ballkid, setUpdated, isMobile)}
              {renderTeam(ballkid, teams, setUpdated, isMobile)}
              <br />
            </div>
          )}

          {!ballkid.is_active ? (
            ""
          ) : (
            <div>
              <Typography variant="h6">Comments</Typography>
              <Box className="sxs">
                <Typography variant="body1"># of Tickets Used:</Typography>
                <Typography variant="body1" sx={{ mx: 1 }}>
                  {ballkid.num_tickets}
                </Typography>
                <IconButton
                  disabled={ballkid.num_tickets === 0}
                  size="small"
                  sx={{ p: 0.5 }}
                  onClick={(e) => {
                    fetch("/api/update-ballkid", {
                      method: "PATCH",
                      headers: getAuthHeader(),
                      body: JSON.stringify({
                        first_name: ballkid.first_name,
                        last_name: ballkid.last_name,
                        num_tickets: ballkid.num_tickets - 1,
                      }),
                    })
                      .then((response) => response.json())
                      .then(() => setUpdated(true));
                  }}
                >
                  <RemoveCircle />
                </IconButton>
                <IconButton
                  size="small"
                  sx={{ p: 0.5 }}
                  onClick={(e) => {
                    fetch("/api/update-ballkid", {
                      method: "PATCH",
                      headers: getAuthHeader(),
                      body: JSON.stringify({
                        first_name: ballkid.first_name,
                        last_name: ballkid.last_name,
                        num_tickets: ballkid.num_tickets + 1,
                      }),
                    })
                      .then((response) => response.json())
                      .then(() => setUpdated(true));
                  }}
                >
                  <AddCircle />
                </IconButton>
              </Box>
              <DropdownComments
                ballkid={ballkid}
                commentType="last_day"
                setSuccessMsg={setSuccessMsg}
                setErrorMsg={setErrorMsg}
              />
              <DropdownComments
                ballkid={ballkid}
                commentType="checkout"
                setSuccessMsg={setSuccessMsg}
                setErrorMsg={setErrorMsg}
              />
              <Comments
                ballkid={ballkid}
                setSuccessMsg={setSuccessMsg}
                setErrorMsg={setErrorMsg}
              />
            </div>
          )}
        </Grid>
      </Grid>
      <br />

      {!ballkid.is_active ? (
        ""
      ) : (
        <div>
          <RatingSection ballkid={ballkid} />

          <Typography variant="h6" sx={MARGINS}>
            Analytics:
          </Typography>

          <AggregateMetrics pk={pk} />

          <Grid container>
            <Grid item xs={12} lg={5.5} sx={{ m: 2 }}>
              <CheckinHistoryChart pk={pk} />
            </Grid>

            <Grid item xs={12} lg={5.5} sx={{ m: 2 }}>
              <CourtHistoryChart pk={pk} />
            </Grid>

            <Grid item xs={12} lg={5.5} sx={{ m: 2 }}>
              <CaptainHistoryChart pk={pk} />
            </Grid>

            {/* <MatchHistoryChart histories={matches} /> */}
          </Grid>
        </div>
      )}

      <Grid container>
        {renderBallkidFinalsHistory(finals)}
        {renderBallkidCutHistory(cuts)}
      </Grid>
    </div>
  );
}
