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
import Tooltip from "@mui/material/Tooltip";

import RemoveCircleOutline from "@mui/icons-material/RemoveCircleOutline";
import Dangerous from "@mui/icons-material/Dangerous";

import {
  filterBallkids,
  getAuthHeader,
  SearchAndFilter,
  ConfirmDialog,
  DraggableBallkidAndIcon,
  HelpIcon,
  Banners,
  Alerts,
} from "../Utils";
import { CUT_STATUSES, MARGINS, POSITIONS } from "../Consts";
import { cut } from "../HelpMessages";

export function CutStatusSection({ section, active, setUpdated }) {
  const [open, setOpen] = useState(false);

  const shouldCut = section.includes("Cut") ? true : false;
  const cutAllStr = section.includes("Cut") ? "Cut All" : "Keep All";
  const cutAllColor = section.includes("Cut") ? "error" : "success";
  const cutAllVariant = section.includes("Cut") ? "contained" : "outlined";

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

      <Card sx={{ mb: 2 }} elevation={isOver ? 10 : 1}>
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

          {POSITIONS.map((position) => (
            <div key={position}>
              <Divider sx={{ mt: 1, mb: 1 }} />
              <div className="sxs">
                <Typography variant="subtitle1">{position}s</Typography>
                <Typography variant="subtitle2" sx={{ ml: 1 }}>
                  (
                  {
                    active.filter((ballkid) =>
                      ballkid.preferred_position.startsWith(position)
                    ).length
                  }
                  )
                </Typography>
              </div>
              {renderBallkidsInSection(
                active.filter((ballkid) => ballkid.cut_status === section),
                section,
                position,
                setUpdated
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </Grid>
  );
}

export function renderBallkidsInSection(active, section, position, setUpdated) {
  return (
    <div>
      {active.map((ballkid) =>
        !ballkid.preferred_position.startsWith(position) ? (
          ""
        ) : (
          <div key={`ballkid${ballkid.id}`} className="justify">
            <DraggableBallkidAndIcon
              ballkid={ballkid}
              commentTypes={
                section === "Self-Cut" ? ["last_day"] : ["rank", "last_day"]
              }
              hoverCommentTypes={["experience", "rank", "last_day"]}
            />

            <div className="sxs">
              {section === "Self-Cut" ? (
                ""
              ) : (
                <Tooltip title="Uncategorize">
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
                          cut_status: "",
                        }),
                      })
                        .then((response) => response.json())
                        .then(() => setUpdated(true));
                    }}
                  >
                    <RemoveCircleOutline color="primary" />
                  </IconButton>
                </Tooltip>
              )}

              {!section.includes("Cut") ? (
                ""
              ) : (
                <Tooltip title="Cut">
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
                          is_cut: true,
                          self_cut: section === "Self-Cut",
                        }),
                      })
                        .then((response) => response.json())
                        .then(() => setUpdated(true));
                    }}
                  >
                    <Dangerous color="error" />
                  </IconButton>
                </Tooltip>
              )}
            </div>
          </div>
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
        &ensp;
        <Typography variant="h6" sx={MARGINS}>
          ({active.length})
        </Typography>
      </div>

      <SearchAndFilter
        setSearchKeyword={setSearchKeyword}
        filterGroup={filterGroup}
        setFilterGroup={setFilterGroup}
        filters={["rookie", "supervet", "captain", "back", "net"]}
      />

      {POSITIONS.map((position) => {
        const filtered = filterBallkids(
          active,
          searchKeyword,
          filterGroup
        ).filter((ballkid) => ballkid.preferred_position.startsWith(position));
        const half = Math.ceil(filtered.length / 2);

        return (
          <div key={position}>
            <div className="sxs">
              <Typography variant="h6" sx={MARGINS}>
                {position}s
              </Typography>
              <Typography variant="subtitle1" sx={{ ...MARGINS, ml: 1 }}>
                ({filtered.length})
              </Typography>
            </div>

            {active.length === 0 ? (
              <Typography>
                There are currently no active ballkids left to categorize.
              </Typography>
            ) : (
              <Grid container>
                {[filtered.slice(0, half), filtered.slice(half)].map((sliced) =>
                  sliced.length === 0 ? (
                    ""
                  ) : (
                    <Grid
                      container
                      item
                      key={sliced[0].id}
                      direction="column"
                      xs={12}
                      sm={12}
                      md={6}
                      lg={6}
                      xl={6}
                    >
                      {sliced.map((ballkid) => (
                        <Grid key={ballkid.id} item sx={{ px: 1 }}>
                          <DraggableBallkidAndIcon
                            ballkid={ballkid}
                            commentTypes={["rank", "last_day"]}
                            hoverCommentTypes={[
                              "experience",
                              "rank",
                              "calibrated_avg",
                              "last_day",
                            ]}
                          />
                        </Grid>
                      ))}
                    </Grid>
                  )
                )}
              </Grid>
            )}
          </div>
        );
      })}
    </Box>
  );
}

export function renderCopyButtons(active, emails, setSuccessMsg) {
  return (
    <Box>
      <Box sx={{ my: 0.2 }}>
        <Button
          size="small"
          variant="outlined"
          onClick={() => {
            const names = active
              .filter(
                (ballkid) =>
                  ballkid.cut_status === "Definitely Keep" ||
                  ballkid.cut_status === "Possibly Keep" ||
                  ballkid.cut_status === ""
              )
              .map((ballkid) => `${ballkid.first_name} ${ballkid.last_name}`)
              .join("\n");
            navigator.clipboard.writeText(names);
            setSuccessMsg("Successfully copied non-cut ballkid names!");
          }}
        >
          Copy all keep ballkid names
        </Button>
      </Box>

      <Box sx={{ my: 0.2 }} style={{ float: "right" }}>
        <Button
          size="small"
          variant="outlined"
          onClick={() => {
            navigator.clipboard.writeText(emails);
            setSuccessMsg(
              "Successfully copied all currently active, non-cut ballkid emails!"
            );
          }}
        >
          Copy all ballkid emails
        </Button>
      </Box>
    </Box>
  );
}

export function SelfCutCard({ updated, setUpdated }) {
  const [selfCut, setSelfCut] = useState([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    fetch("/api/self-cut-list", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setSelfCut(data));
  }, [updated]);

  return (
    <Grid item xs={12} sm={12} md={6} lg={6} xl={3}>
      <ConfirmDialog
        message={`You are about to cut all ${selfCut.length} ballkid${
          selfCut.length > 1 ? "s" : ""
        }. This will be publicly visible to all ballkids and captains.`}
        url={"/api/cut-all"}
        body={{
          should_cut: true,
          self_cut: true,
        }}
        open={open}
        setOpen={setOpen}
        setUpdated={setUpdated}
      />

      <Card sx={{ mb: 2 }} elevation={1}>
        <CardContent>
          <div className="justify">
            <div className="sxs">
              <Typography variant="h6">Self-Cut</Typography>
              &ensp;
              <Typography variant="subtitle1">({selfCut.length})</Typography>
            </div>

            <Button
              size="small"
              color="error"
              variant="contained"
              onClick={(e) => setOpen(true)}
            >
              Cut All
            </Button>
          </div>

          {POSITIONS.map((position) => (
            <div key={position}>
              <Divider sx={{ mt: 1, mb: 1 }} />
              <div className="sxs">
                <Typography variant="subtitle1">{position}s</Typography>
                <Typography variant="subtitle2" sx={{ ml: 1 }}>
                  (
                  {
                    selfCut.filter((ballkid) =>
                      ballkid.preferred_position.startsWith(position)
                    ).length
                  }
                  )
                </Typography>
              </div>
              {renderBallkidsInSection(
                selfCut,
                "Self-Cut",
                position,
                setUpdated
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </Grid>
  );
}

export default function CutPageDesktop(props) {
  const [active, setActive] = useState([]);
  const [emails, setEmails] = useState([]);
  const [updated, setUpdated] = useState(false);

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

    fetch("/api/emails-list", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setEmails(data["emails"]))
      .then(() => setUpdated(false));
  }, [updated]);

  return (
    <div className="page">
      <Banners />

      <Alerts
        successMsg={successMsg}
        errorMsg={errorMsg}
        setSuccessMsg={setSuccessMsg}
        setErrorMsg={setErrorMsg}
      />

      <Grid container className="justify-top">
        <Grid
          item
          sm={6}
          md={7}
          lg={7}
          xl={8}
          style={{ maxHeight: "85vh", overflow: "auto" }}
        >
          <Box className="justify-top">
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
                active={active.filter(
                  (ballkid) => ballkid.cut_status === section
                )}
                setUpdated={setUpdated}
              />
            ))}

            <SelfCutCard updated={updated} setUpdated={setUpdated} />
          </Grid>
        </Grid>

        <Grid
          item
          sm={6}
          md={5}
          lg={5}
          xl={4}
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
