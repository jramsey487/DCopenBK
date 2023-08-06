import React, { useState, useEffect } from "react";

import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Button from "@mui/material/Button";
import Table from "@mui/material/Table";
import TableContainer from "@mui/material/TableContainer";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import Box from "@mui/material/Box";

import {
  filterBallkids,
  getAuthHeader,
  SearchAndFilter,
  DraggableBallkidAndIcon,
  HelpIcon,
  Alerts,
  TournamentBanner,
} from "../Utils";
import {
  SelfCutCard,
  renderCopyButtons,
  CutStatusSection,
} from "./CutPageDesktop";
import { CUT_STATUSES, MARGINS } from "../Consts";
import { cut } from "../HelpMessages";

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
                      <DraggableBallkidAndIcon ballkid={ballkid} type="rank" />
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

export default function CutPageMobile() {
  const [active, setActive] = useState([]);
  const [emails, setEmails] = useState([]);

  const [updated, setUpdated] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterGroup, setFilterGroup] = useState();

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const sections = Object.keys(CUT_STATUSES).map((key) => CUT_STATUSES[key]);

  useEffect(() => {
    fetch("/api/sorted-list", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) =>
        setActive(
          data.filter((ballkid) => !ballkid.is_cut && !ballkid.is_chairperson)
        )
      );

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

        <SelfCutCard updated={updated} setUpdated={setUpdated} />
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
