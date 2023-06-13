import React, { useState, useEffect } from "react";
import { useDrag, useDrop } from "react-dnd";

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import Link from "@mui/material/Link";
import IconButton from "@mui/material/IconButton";
import Table from "@mui/material/Table";
import TableContainer from "@mui/material/TableContainer";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";

import Clear from "@mui/icons-material/Clear";
import Dangerous from "@mui/icons-material/Dangerous";
import ReportOff from "@mui/icons-material/ReportOff";

import {
  filterBallkids,
  getAuthHeader,
  Icons,
  SearchAndFilter,
} from "../Utils";
import { CUT_STATUSES, MARGINS } from "../Consts";

function DraggableBallkidAndIcon({ ballkid }) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: "ballkid",
    item: { ...ballkid },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  }));

  return (
    <div
      ref={drag}
      style={{
        opacity: isDragging ? 0.5 : 1,
      }}
    >
      <div className="sxs">
        <Link variant="body2" href={`ballkid/${ballkid.id}`}>
          {ballkid.first_name} {ballkid.last_name}
        </Link>
        &thinsp;
        <Icons ballkid={ballkid} margin={0} />
      </div>
    </div>
  );
}

function CutStatusSection({ section, active, setUpdated }) {
  const shouldCut = section.includes("Cut") ? true : false;
  const cutAllStr = section.includes("Cut") ? "Cut All" : "Keep All";
  const cutAllColor = section.includes("Cut") ? "error" : "success";
  const cutAllVariant = section.includes("Cut") ? "contained" : "outlined";

  const positions = ["Back", "Net"];

  const [{ isOver }, dropRef] = useDrop({
    accept: "ballkid",
    drop: (ballkid) =>
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
        .then(() => setUpdated(true)),
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  });

  return (
    <Grid item xs={12} sm={6} md={4} lg={3} xl={2} ref={dropRef}>
      <Card sx={{ mb: 2 }} elevation={isOver ? 10 : 1}>
        <CardContent>
          <div className="justify">
            <div className="sxs">
              <Typography variant="h6">{section}</Typography>
              <Typography variant="subtitle1">
                &ensp; (
                {
                  active.filter((ballkid) => ballkid.cut_status === section)
                    .length
                }
                )
              </Typography>
            </div>
            <Button
              size="small"
              color={cutAllColor}
              variant={cutAllVariant}
              onClick={(e) => {
                fetch("/api/cut-all", {
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
              <Typography variant="subtitle1">{position}s:</Typography>
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
  const [{ isOver }, dropRef] = useDrop({
    accept: "ballkid",
    drop: (ballkid) =>
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
        .then(() => setUpdated(true)),
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  });

  return (
    <div>
      <div className="sxs">
        <Typography variant="h5" sx={MARGINS}>
          Active Ballkids
        </Typography>
        <Typography variant="h6" sx={MARGINS}>
          &ensp; ({active.filter((ballkid) => ballkid.cut_status === "").length}
          )
        </Typography>
      </div>
      {active.length === 0 ? (
        <Typography>
          There are currently no active ballkids left to categorize.
        </Typography>
      ) : (
        <TableContainer
          component={Paper}
          ref={dropRef}
          elevation={isOver ? 10 : 1}
        >
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

function CutSection({ cut, setUpdated }) {
  return (
    <div>
      <div className="sxs">
        <Typography variant="h5" sx={MARGINS}>
          Cut Ballkids
        </Typography>
        <Typography variant="h6" sx={MARGINS}>
          &ensp; ({cut.length})
        </Typography>
      </div>
      {cut.length === 0 ? (
        <Typography>There are currently no cut ballkids.</Typography>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Preferred Position</TableCell>
                <TableCell align="right">Un-Cut?</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cut.map((ballkid) => (
                <TableRow key={ballkid.id}>
                  <TableCell component="th" scope="row">
                    {<DraggableBallkidAndIcon ballkid={ballkid} />}
                  </TableCell>
                  <TableCell>{ballkid.preferred_position}</TableCell>
                  <TableCell align="right">
                    <IconButton
                      variant="outlined"
                      label="Cut"
                      color="success"
                      size="small"
                      onClick={(e) => {
                        fetch("/api/update-ballkid", {
                          method: "PATCH",
                          headers: getAuthHeader(),
                          body: JSON.stringify({
                            first_name: ballkid.first_name,
                            last_name: ballkid.last_name,
                            is_cut: false,
                          }),
                        })
                          .then((response) => response.json())
                          .then(() => setUpdated(true));
                      }}
                    >
                      <ReportOff />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </div>
  );
}

export default function CutPage(props) {
  const [active, setActive] = useState([]);
  const [cut, setCut] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterGroup, setFilterGroup] = useState();
  const [updated, setUpdated] = useState(false);

  const sections = Object.keys(CUT_STATUSES).map((key) => CUT_STATUSES[key]);

  useEffect(() => {
    fetch("/api/all-sorted-list", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => {
        setActive(data.filter((ballkid) => !ballkid.is_cut));
        setCut(data.filter((ballkid) => ballkid.is_cut));
      })
      .then(() => setUpdated(false));
  }, [updated]);

  return (
    <div className="page">
      <Typography variant="h4" sx={{ mb: 1 }}>
        Cut Page
      </Typography>

      <Grid container spacing={2}>
        {sections.map((section) => (
          <CutStatusSection
            key={section}
            section={section}
            active={active}
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

      <CutSection
        cut={filterBallkids(cut, searchKeyword, filterGroup)}
        setUpdated={setUpdated}
      />
    </div>
  );
}
