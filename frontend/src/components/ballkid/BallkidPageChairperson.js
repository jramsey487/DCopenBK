import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Typography,
  Grid,
  Button,
  Box,
  Menu,
  MenuItem,
  IconButton,
  ListItemIcon,
  ListItemText,
  TextField,
  TableContainer,
  TableRow,
  TableBody,
  TableCell,
  TableHead,
  Table,
  Link,
} from "@mui/material";
import {
  MoreVert,
  Dangerous,
  ArrowCircleUp,
  ArrowCircleDown,
  RateReview,
  Archive,
  Unarchive,
  ReportOff,
  Shortcut,
} from "@mui/icons-material";
import RatingDialog from "../ratings/RatingDialog";
import { Icons, getAuthHeader } from "../Utils";
import { CheckinHistoryChart } from "./CheckinHistoryChart";
import { CaptainHistoryChart } from "./CaptainHistoryChart";
import { CourtHistoryChart } from "./CourtHistoryChart";
import { RaterParamsChart } from "./RaterParamsChart";
import { BallkidParamsChart } from "./BallkidParamsChart";

function renderHeader(ballkid, setUpdated) {
  return (
    <div className="justify">
      <div className="sxs">
        <Typography variant="h4">
          {ballkid.first_name} {ballkid.last_name}
        </Typography>
        &ensp;
        <Icons ballkid={ballkid} margin={0} />
        &ensp;
        {(ballkid.is_cut === "true") | !ballkid.is_active ? (
          <InactiveOverflowMenu ballkid={ballkid} setUpdated={setUpdated} />
        ) : (
          <ActiveOverflowMenu ballkid={ballkid} setUpdated={setUpdated} />
        )}
      </div>
      {ballkid.is_cut === "true" ? (
        <Typography variant="h5" color="error">
          Cut
        </Typography>
      ) : !ballkid.is_active ? (
        <Typography variant="h5" color="error">
          Inactive
        </Typography>
      ) : (
        renderCheckin(ballkid, setUpdated)
      )}
    </div>
  );
}

function renderCheckin(ballkid, setUpdated) {
  return (
    <Box textAlign="center">
      <Typography
        variant="h6"
        color={ballkid.is_checked_in ? "success.main" : "error"}
      >
        {ballkid.is_checked_in ? "Checked In" : "Checked Out"}
      </Typography>
      <Button
        variant="outlined"
        color={ballkid.is_checked_in ? "error" : "success"}
        onClick={(e) => {
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
            .then(() => setUpdated(true));
        }}
      >
        {ballkid.is_checked_in ? "Check Out" : "Check In"}
      </Button>
    </Box>
  );
}

function renderPreferredPosition(ballkid, setUpdated) {
  const positions = new Set(["Back", "Net", "Back/Net", "Net/Back"]);
  positions.delete(ballkid.preferred_position);

  return (
    <div className="justify">
      <Typography variant="body1">
        Preferred position: {ballkid.preferred_position}
      </Typography>
      <div className="sxs">
        <Typography variant="body1">Change to: &emsp;</Typography>
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

function renderPosition(ballkid, setUpdated) {
  const newPosition = ballkid.position === "Back" ? "Net" : "Back";

  return (
    <div className="justify">
      <Typography variant="body1">Position: {ballkid.position}</Typography>
      {ballkid.current_team === 0 ? (
        ""
      ) : (
        <div className="sxs">
          <Typography variant="body1">Change to: &emsp;</Typography>
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
      sx={{ m: 0.2 }}
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

function renderTeam(ballkid, teams, setUpdated) {
  return (
    <div className="justify">
      <Typography variant="body1">
        Current Team:{" "}
        {ballkid.current_team === 0 ? "Unassigned" : ballkid.current_team}
      </Typography>
      {!ballkid.is_checked_in ? (
        ""
      ) : (
        <div className="sxs">
          <Typography variant="body1">Change to: &emsp;</Typography>
          {teams.map((team) =>
            team === ballkid.current_team
              ? ""
              : renderTeamButton(ballkid, team, team, setUpdated)
          )}
          {renderTeamButton(ballkid, "New Team", teams.length + 1, setUpdated)}
          {ballkid.current_team === 0
            ? ""
            : renderTeamButton(ballkid, "Unassign", 0, setUpdated)}
        </div>
      )}
    </div>
  );
}

function renderPreviousFinals(finals) {
  return (
    <Grid item sx={{ mt: 2 }}>
      {/* <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}> */}
      <Typography variant="h6">Previous Years' Finals:</Typography>
      {/* </AccordionSummary>
        <AccordionDetails> */}
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell align="center">Year</TableCell>
              <TableCell align="center">Match Type</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {finals.map((final) => (
              <TableRow key={final.id}>
                <TableCell align="center">{final.year}</TableCell>
                <TableCell align="center">{final.match_type}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {/* </AccordionDetails>
      </Accordion> */}
    </Grid>
  );
}

function RatingSection({ ballkid }) {
  const [params, setParams] = useState({});
  const [average, setAverage] = useState({});

  useEffect(() => {
    fetch("/api/calibration-parameters/" + ballkid.id, {
      headers: getAuthHeader(),
    })
      .then((response) => response.json())
      .then((data) => {
        setParams(data);
      });

    fetch("/api/average-calibration-parameters", {
      headers: getAuthHeader(),
    })
      .then((response) => response.json())
      .then((data) => setAverage(data));
  }, [ballkid.id]);

  return (
    <Grid container>
      <Grid item xs={12}>
        <Typography variant="h6">Ratings:</Typography>
      </Grid>
      {!ballkid.is_captain ? (
        ""
      ) : (
        <Grid item xs={12} md={7} lg={6} sx={{ mx: 1 }}>
          <Button
            size="small"
            variant="outlined"
            component={Link}
            href={`/ratings?rater=${ballkid.id}`}
            endIcon={<Shortcut />}
            sx={{ my: 1 }}
          >
            View ratings by this captain
          </Button>

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
                offset={params.rater_offset}
                scale={params.rater_scale}
                average_offset={average.rater_offset__avg}
                average_scale={average.rater_scale__avg}
                sx={{ mb: 2 }}
              />
            </div>
          )}
        </Grid>
      )}

      <Grid item xs={12} md={4.5} lg={5.5} sx={{ mx: 1 }}>
        <Button
          size="small"
          variant="outlined"
          component={Link}
          href={`/ratings?ratee=${ballkid.id}`}
          endIcon={<Shortcut />}
          sx={{ my: 1, mr: 1 }}
        >
          View ratings for this ballkid
        </Button>
        <Button
          size="small"
          variant="outlined"
          component={Link}
          href={`/my-ratings?ratee=${ballkid.id}`}
          endIcon={<Shortcut />}
          sx={{ my: 1 }}
        >
          View my ratings for this ballkid
        </Button>

        {params.ratee_improvement == null ? (
          ""
        ) : (
          <div>
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
      <RatingDialog open={open} setOpen={setOpen} ballkid={props.ballkid} />

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

function Comments(props) {
  const [disabled, setDisabled] = useState(true);

  return (
    <div>
      <Typography variant="h6"> Comments: </Typography>

      <TextField
        variant="standard"
        defaultValue={props.ballkid.comments}
        style={{ width: "100%" }}
        multiline
        disabled={disabled}
        onDoubleClick={() => setDisabled(false)}
        onKeyDown={(e) => {
          if ((e.key === "Enter") | (e.key === "Escape")) {
            fetch("/api/update-ballkid", {
              method: "PATCH",
              headers: getAuthHeader(),
              body: JSON.stringify({
                first_name: props.ballkid.first_name,
                last_name: props.ballkid.last_name,
                comments: e.target.value ? e.target.value : "",
              }),
            })
              .then((response) => response.json())
              .then(() => {
                setDisabled(true);
              });
          }
        }}
      />
    </div>
  );
}

export default function BallkidPageChairperson(props) {
  const [ballkid, setBallkid] = useState(null);
  const [updated, setUpdated] = useState(false);
  const [teams, setTeams] = useState([]);

  const [finals, setFinals] = useState([]);
  const [checkins, setCheckins] = useState([]);
  const [captains, setCaptains] = useState([]);
  const [courts, setCourts] = useState([]);

  const [totalTime, setTotalTime] = useState("");

  const { pk } = useParams();

  useEffect(() => {
    fetch("/api/get-ballkid/" + pk, { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setBallkid(data));

    fetch("/api/calc-num-teams", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setTeams(data["teams"]));

    fetch("/api/get-finals-history/" + pk, { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setFinals(data));

    fetch("/api/get-captains/" + pk, { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setCaptains(data));

    fetch("/api/get-courts/" + pk, { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setCourts(data));

    fetch("/api/get-checkins/" + pk, { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setCheckins(data));

    fetch("/api/get-checkin-duration/" + pk, { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setTotalTime(data["checkin_duration"]))
      .then(() => setUpdated(false));
  }, [updated, pk]);

  return ballkid == null ? (
    ""
  ) : (
    <div className="page">
      {renderHeader(ballkid, setUpdated)}

      <Grid container>
        <Grid item xs={4} md={3} lg={2}>
          <Box width="95%" component="img" src={"../" + ballkid.image} />
        </Grid>

        <Grid item xs={8} md={9} lg={10}>
          <Typography variant="h6"> Info:</Typography>
          <Typography variant="body1"> Age: {ballkid.age} </Typography>
          <Typography variant="body1">
            Years experience: {ballkid.num_years_experience}
          </Typography>
          {renderPreferredPosition(ballkid, setUpdated)}
          <br />

          {(ballkid.is_cut === "true") | !ballkid.is_active ? (
            ""
          ) : (
            <div>
              <Typography variant="h6"> Current Info: </Typography>
              {renderPosition(ballkid, setUpdated)}
              {renderTeam(ballkid, teams, setUpdated)}
              <br />
            </div>
          )}
          {!ballkid.is_active ? (
            ""
          ) : (
            <Comments ballkid={ballkid} setUpdated={setUpdated} />
          )}
        </Grid>
      </Grid>
      <br />

      <RatingSection ballkid={ballkid} />

      {!ballkid.is_active ? (
        ""
      ) : (
        <Grid container>
          <Grid item xs={12}>
            <br />
            <Typography variant="h6">Analytics:</Typography>
          </Grid>

          <Grid item xs={12} lg={5.5} sx={{ m: 2 }}>
            <CheckinHistoryChart histories={checkins} totalTime={totalTime} />
          </Grid>

          <Grid item xs={12} lg={5.5} sx={{ m: 2 }}>
            <CourtHistoryChart histories={courts} />
          </Grid>

          <Grid item xs={12} lg={5.5} sx={{ m: 2 }}>
            <CaptainHistoryChart histories={captains} />
          </Grid>
          {/* <MatchHistoryChart histories={matches} /> */}
        </Grid>
      )}

      <Grid container>{renderPreviousFinals(finals)}</Grid>
    </div>
  );
}
