import React, { useState, useEffect } from "react";

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Table from "@mui/material/Table";
import TableContainer from "@mui/material/TableContainer";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";

import Clear from "@mui/icons-material/Clear";
import Dangerous from "@mui/icons-material/Dangerous";

import {
  filterBallkids,
  getAuthHeader,
  SearchAndFilter,
  ConfirmDialog,
  DraggableBallkidAndIcon,
  HelpIcon,
  Alerts,
  TournamentBanner,
} from "../Utils";
import { renderCopyButtons } from "./CutPageDesktop";
import { CUT_STATUSES, MARGINS } from "../Consts";
import { cut } from "../HelpMessages";

function CutStatusSection({ section, active, setUpdated }) {
  const [open, setOpen] = useState(false);

  const shouldCut = section.includes("Cut") ? true : false;
  const cutAllStr = section.includes("Cut") ? "Cut All" : "Keep All";
  const cutAllColor = section.includes("Cut") ? "error" : "success";
  const cutAllVariant = section.includes("Cut") ? "contained" : "outlined";

  const positions = ["Back", "Net"];

  return (
    <Grid item xs={12} sm={6} md={4} lg={3} xl={2}>
      <ConfirmDialog
        message={`You are about to cut all ${active.length} ballkid${
          active.length > 1 ? "s" : ""
        }. This will be publicly visible to all ballkids and captains.`}
        url={"/api/cut-all"}
        body={{
          cut_status: section,
          should_cut: true,
        }}
        open={open}
        setOpen={setOpen}
        setUpdated={setUpdated}
      />

      <Card sx={{ mb: 1 }} elevation={1}>
        <CardContent>
          <div className="justify">
            <div className="sxs">
              <Typography variant="h6">{section}</Typography>
              &ensp;
              <Typography variant="subtitle1">({active.length})</Typography>
            </div>
            <Button
              size="small"
              color={cutAllColor}
              variant={cutAllVariant}
              onClick={(e) => {
                shouldCut
                  ? setOpen(true)
                  : fetch("/api/cut-all", {
                      method: "PATCH",
                      headers: getAuthHeader(),
                      body: JSON.stringify({
                        cut_status: section,
                        should_cut: shouldCut,
                      }),
                    })
                      .then((response) => response.json())
                      .then(() => setUpdated(true));
              }}
            >
              {cutAllStr}
            </Button>
          </div>

          {positions.map((position) => (
            <div key={position}>
              <Divider sx={{ mt: 1, mb: 1 }} />
              <div className="sxs">
                <Typography variant="subtitle1">{position}s</Typography>
                <Typography variant="subtitle2" sx={{ ml: 1 }}>
                  (
                  {
                    active.filter((ballkid) => ballkid.position === position)
                      .length
                  }
                  )
                </Typography>
              </div>
              {renderBallkidsInSection(active, section, position, setUpdated)}
            </div>
          ))}
        </CardContent>
      </Card>
    </Grid>
  );
}

function renderBallkidsInSection(active, section, position, setUpdated) {
  return (
    <div>
      {active.map((ballkid) =>
        ballkid.cut_status === section && ballkid.position === position ? (
          <div key={`ballkid${ballkid.id}`} className="justify">
            {<DraggableBallkidAndIcon ballkid={ballkid} />}
            <div className="sxs">
              {!section.includes("Cut") ? (
                ""
              ) : (
                <IconButton
                  variant="outlined"
                  label="Cut"
                  color="error"
                  size="small"
                  onClick={(e) => {
                    fetch("/api/update-ballkid", {
                      method: "PATCH",
                      headers: getAuthHeader(),
                      body: JSON.stringify({
                        first_name: ballkid.first_name,
                        last_name: ballkid.last_name,
                        is_cut: true,
                      }),
                    })
                      .then((response) => response.json())
                      .then(() => setUpdated(true));
                  }}
                >
                  <Dangerous />
                </IconButton>
              )}
              <IconButton
                size="small"
                onClick={(e) => {
                  fetch("/api/update-ballkid", {
                    method: "PATCH",
                    headers: getAuthHeader(),
                    body: JSON.stringify({
                      first_name: ballkid.first_name,
                      last_name: ballkid.last_name,
                      cut_status: "",
                    }),
                  })
                    .then((response) => response.json())
                    .then(() => setUpdated(true));
                }}
              >
                <Clear />
              </IconButton>
            </div>
          </div>
        ) : (
          ""
        )
      )}
    </div>
  );
}

function renderAssignCutButton(ballkid, section, setUpdated) {
  var color;
  switch (section) {
    case "Definitely Keep":
      color = "success";
      break;
    case "Possibly Keep":
      color = "primary";
      break;
    case "Possibly Cut":
      color = "warning";
      break;
    case "Definitely Cut":
      color = "error";
      break;
    default:
      console.log("Unrecognized cut status: " + section);
  }

  return (
    <Button
      key={section}
      sx={{ m: 0.2 }}
      size="small"
      color={color}
      variant="outlined"
      onClick={(e) => {
        fetch("/api/update-ballkid", {
          method: "PATCH",
          headers: getAuthHeader(),
          body: JSON.stringify({
            first_name: ballkid.first_name,
            last_name: ballkid.last_name,
            cut_status: section,
          }),
        })
          .then((response) => response.json())
          .then(() => setUpdated(true));
      }}
    >
      {section}
    </Button>
  );
}

function ActiveSection({ active, sections, setUpdated }) {
  return (
    <div>
      <div className="sxs">
        <Typography variant="h5" sx={MARGINS}>
          Active Ballkids
        </Typography>
        &ensp;
        <Typography variant="h6" sx={MARGINS}>
          ({active.filter((ballkid) => ballkid.cut_status === "").length})
        </Typography>
      </div>
      {active.length === 0 ? (
        <Typography>
          There are currently no active ballkids left to categorize.
        </Typography>
      ) : (
        <TableContainer component={Paper} elevation={1}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Preferred Position</TableCell>
                <TableCell align="right">Mark As</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {active.map((ballkid) =>
                ballkid.cut_status !== "" ? (
                  ""
                ) : (
                  <TableRow key={ballkid.id}>
                    <TableCell component="th" scope="row">
                      {<DraggableBallkidAndIcon ballkid={ballkid} />}
                    </TableCell>
                    <TableCell>{ballkid.preferred_position}</TableCell>
                    <TableCell align="right">
                      {sections.map((section) =>
                        renderAssignCutButton(ballkid, section, setUpdated)
                      )}
                    </TableCell>
                  </TableRow>
                )
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </div>
  );
}

export default function CutPageMobile(props) {
  const [active, setActive] = useState([]);
  const [emails, setEmails] = useState([]);

  const [updated, setUpdated] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterGroup, setFilterGroup] = useState();

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const sections = Object.keys(CUT_STATUSES).map((key) => CUT_STATUSES[key]);

  useEffect(() => {
    fetch("/api/all-sorted-list", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setActive(data.filter((ballkid) => !ballkid.is_cut)));

    fetch("/api/all-emails", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setEmails(data["emails"]))
      .then(() => setUpdated(false));
  }, [updated]);

  return (
    <div className="page">
      <TournamentBanner />

      <Alerts
        successMsg={successMsg}
        errorMsg={errorMsg}
        setSuccessMsg={setSuccessMsg}
        setErrorMsg={setErrorMsg}
      />

      <Box className="justify">
        <Box className="sxs" sx={{ mb: 1 }}>
          <Typography variant="h4">Cut Page</Typography>
          &thinsp;
          <HelpIcon page="Cut" message={cut} />
        </Box>
        {renderCopyButtons(active, emails, setSuccessMsg)}
      </Box>

      <Grid container spacing={2}>
        {sections.map((section) => (
          <CutStatusSection
            key={section}
            section={section}
            active={active.filter((ballkid) => ballkid.cut_status === section)}
            setUpdated={setUpdated}
          />
        ))}
      </Grid>

      <SearchAndFilter
        setSearchKeyword={setSearchKeyword}
        filterGroup={filterGroup}
        setFilterGroup={setFilterGroup}
      />

      <ActiveSection
        active={filterBallkids(active, searchKeyword, filterGroup)}
        sections={sections}
        setUpdated={setUpdated}
      />
    </div>
  );
}
