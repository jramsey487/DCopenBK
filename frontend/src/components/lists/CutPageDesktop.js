import React, { useState, useEffect } from "react";
import { useDrop } from "react-dnd";

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import Button from "@mui/material/Button";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Paper from "@mui/material/Paper";
import Dialog from "@mui/material/Dialog";
import DialogTitle from "@mui/material/DialogTitle";
import DialogContent from "@mui/material/DialogContent";
import DialogActions from "@mui/material/DialogActions";
import DialogContentText from "@mui/material/DialogContentText";

import Clear from "@mui/icons-material/Clear";
import Dangerous from "@mui/icons-material/Dangerous";

import {
  filterBallkids,
  getAuthHeader,
  SearchAndFilter,
  Alerts,
  DraggableBallkidAndIcon,
} from "../Utils";
import { CUT_STATUSES, MARGINS } from "../Consts";

function CutStatusSection({ section, active, setUpdated }) {
  const [open, setOpen] = useState(false);

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
    <Grid item xs={12} sm={12} md={6} lg={6} xl={3} ref={dropRef}>
      <ConfirmDialog
        section={section}
        message={`You are about to cut all ${active.length} ballkid${
          active.length > 1 ? "s" : ""
        }. This will be publicly visible to all ballkids and captains.`}
        open={open}
        setOpen={setOpen}
        setUpdated={setUpdated}
      />

      <Card sx={{ mb: 2 }} elevation={isOver ? 10 : 1}>
        <CardContent>
          <div className="justify">
            <div className="sxs">
              <Typography variant="h6">{section}</Typography>
              <Typography variant="subtitle1">
                &ensp; ({active.length})
              </Typography>
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

function ActiveSection({ active, setUpdated }) {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterGroup, setFilterGroup] = useState();

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
    <Box
      component={Paper}
      ref={dropRef}
      elevation={isOver ? 10 : 1}
      sx={{ pl: { xs: 0, sm: 3 }, ml: { xs: 0, sm: 3 }, pb: 2 }}
    >
      <div className="sxs">
        <Typography variant="h5" sx={MARGINS}>
          Active Ballkids
        </Typography>
        <Typography variant="h6" sx={MARGINS}>
          &ensp; ({filterBallkids(active, searchKeyword, filterGroup).length})
        </Typography>
      </div>

      <SearchAndFilter
        setSearchKeyword={setSearchKeyword}
        filterGroup={filterGroup}
        setFilterGroup={setFilterGroup}
      />

      {active.length === 0 ? (
        <Typography>
          There are currently no active ballkids left to categorize.
        </Typography>
      ) : (
        <Grid container>
          {filterBallkids(active, searchKeyword, filterGroup).map((ballkid) => (
            <Grid
              key={ballkid.id}
              item
              xs={12}
              sm={6}
              md={6}
              lg={6}
              xl={4}
              sx={{ px: 1 }}
            >
              {<DraggableBallkidAndIcon ballkid={ballkid} />}
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}

function ConfirmDialog({ section, message, open, setOpen, setUpdated }) {
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  return (
    <Dialog open={open} onClose={() => setOpen(false)}>
      <DialogTitle>Confirm Cuts</DialogTitle>
      <DialogContent>
        <Alerts
          successMsg={successMsg}
          errorMsg={errorMsg}
          setSuccessMsg={setSuccessMsg}
          setErrorMsg={setErrorMsg}
        />

        <DialogContentText>{message} Do you wish to proceed?</DialogContentText>
      </DialogContent>

      <DialogActions>
        <Button onClick={() => setOpen(false)}>Cancel</Button>
        <Button
          variant="contained"
          color="error"
          onClick={() =>
            fetch("/api/cut-all", {
              method: "PATCH",
              headers: getAuthHeader(),
              body: JSON.stringify({
                cut_status: section,
                should_cut: true,
              }),
            }).then((response) => {
              if (response.ok) {
                setSuccessMsg("Ballkids cut!");
                setTimeout(() => {
                  setOpen(false);
                  setSuccessMsg("");
                  setUpdated(true);
                }, 2000);
              } else {
                setErrorMsg("Error cutting ballkids.");
              }
            })
          }
        >
          Confirm
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default function CutPageDesktop(props) {
  const [active, setActive] = useState([]);
  const [updated, setUpdated] = useState(false);

  const sections = Object.keys(CUT_STATUSES).map((key) => CUT_STATUSES[key]);

  useEffect(() => {
    fetch("/api/all-sorted-list", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setActive(data.filter((ballkid) => !ballkid.is_cut)))
      .then(() => setUpdated(false));
  }, [updated]);

  return (
    <div className="page">
      <Grid container className="justify-top">
        <Grid
          item
          sm={6}
          md={7}
          lg={8}
          xl={9}
          style={{ maxHeight: "85vh", overflow: "auto" }}
        >
          <Typography variant="h4" sx={{ mb: 1 }}>
            Cut Page
          </Typography>
          <Grid container spacing={2}>
            {sections.map((section) => (
              <CutStatusSection
                key={section}
                section={section}
                active={active.filter(
                  (ballkid) => ballkid.cut_status === section
                )}
                setUpdated={setUpdated}
              />
            ))}
          </Grid>
        </Grid>

        <Grid
          item
          sm={6}
          md={5}
          lg={4}
          xl={3}
          style={{ maxHeight: "85vh", overflow: "auto" }}
        >
          <ActiveSection
            active={active.filter((ballkid) => ballkid.cut_status === "")}
            setUpdated={setUpdated}
          />
        </Grid>
      </Grid>
    </div>
  );
}
