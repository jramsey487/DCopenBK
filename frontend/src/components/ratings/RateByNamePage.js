import React, { useState, useEffect } from "react";

import Typography from "@mui/material/Typography";
import Switch from "@mui/material/Switch";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";

import Edit from "@mui/icons-material/Edit";

import {
  LayoutButtons,
  getAuthHeader,
  RatingButton,
  getLocalStorage,
  useIsMobile,
  SearchAndFilter,
  filterBallkids,
  BallkidCard,
  setLocalStorage,
  HelpIcon,
  Banners,
} from "../Utils";
import { rateByName, rateByNameNonchairperson } from "../HelpMessages";

function getBallkidsToRender(
  ballkids,
  showUnrated,
  showTeam,
  myTeam,
  tournamentShowTeams
) {
  const pk = getLocalStorage("ballkid_id");

  // If teams are hidden and they are saying to show their team, then don't show anyone
  // regardless of captain or chairperson
  if (showTeam && !tournamentShowTeams) {
    return [];
  }

  // If ballkid is unassigned and they are saying to show their team, then don't show anyone
  if (myTeam === 0 && showTeam) {
    return [];
  }

  var ballkidsToRender = ballkids;
  ballkidsToRender = !showUnrated
    ? ballkidsToRender
    : ballkidsToRender.filter(
        (ballkid) => ballkid.num_my_ratings === 0 && ballkid.id !== pk
      );
  ballkidsToRender = !showTeam
    ? ballkidsToRender
    : ballkidsToRender.filter((ballkid) => ballkid.current_team === myTeam);

  return ballkidsToRender;
}

function renderSwitch(param, setParam, offStr, onStr, switchName) {
  return (
    <Grid item className="sxs" xs={12} md={6} lg={5} xl={4}>
      <Typography variant="body1">{offStr}</Typography>
      <Switch
        checked={param}
        onClick={(e) => {
          setParam(e.target.checked);
          setLocalStorage(switchName, e.target.checked);
        }}
      />
      <Typography variant="body1">{onStr}</Typography>
    </Grid>
  );
}

function BallkidsSection({ ballkids, layout, setUpdated }) {
  const isMobile = useIsMobile();
  const isChairperson = getLocalStorage("group") === "chairperson";

  return ballkids.length === 0 ? (
    <Typography variant="body1">There are no ballkids to rate.</Typography>
  ) : (
    <Grid container spacing={layout === "grid" ? 2 : 1}>
      {ballkids.map((ballkid) => (
        <Grid
          item
          key={ballkid.id}
          xs={layout === "grid" ? 6 : 12}
          sm={layout === "grid" ? 4 : 12}
          md={layout === "grid" ? 3 : 12}
          lg={layout === "grid" ? 2 : 12}
          xl={layout === "grid" ? 1 : 12}
        >
          <BallkidCard
            ballkid={ballkid}
            renderAdditional={
              <Box className={layout === "grid" ? "" : "sxs"}>
                {ballkid.have_draft && layout === "list" ? (
                  <Button
                    color="secondary"
                    variant="outlined"
                    size="small"
                    endIcon={<Edit />}
                    sx={{ mr: 3 }}
                  >
                    View Draft
                  </Button>
                ) : (
                  ""
                )}

                <Box textAlign="center" sx={{ mt: layout === "grid" ? 1 : 0 }}>
                  {ballkid.id === getLocalStorage("ballkid_id") ? (
                    ""
                  ) : (
                    <RatingButton
                      ballkid={ballkid}
                      setUpdated={setUpdated}
                      isMobile={isMobile}
                    />
                  )}

                  <Box>
                    {!isChairperson ? (
                      ""
                    ) : (
                      <Typography variant="subtitle2" sx={{ mt: 0.5 }}>
                        Total ratings:{" "}
                        <Box fontWeight="fontWeightRegular" display="inline">
                          {ballkid.num_ratings}
                        </Box>
                      </Typography>
                    )}
                    {ballkid.id === getLocalStorage("ballkid_id") ? (
                      ""
                    ) : (
                      <Typography variant="subtitle2" sx={{ mt: 0.5 }}>
                        My total ratings:{" "}
                        <Box fontWeight="fontWeightRegular" display="inline">
                          {ballkid.num_my_ratings}
                        </Box>
                      </Typography>
                    )}
                    {ballkid.have_draft && layout === "grid" ? (
                      <Button
                        color="secondary"
                        variant="outlined"
                        size="small"
                        endIcon={<Edit />}
                        sx={{ mt: 1 }}
                      >
                        View Draft
                      </Button>
                    ) : (
                      ""
                    )}
                  </Box>
                </Box>
              </Box>
            }
          />
        </Grid>
      ))}
    </Grid>
  );
}

export default function RateByNamePage(props) {
  const [ballkids, setBallkids] = useState([]);
  const [myTeam, setMyTeam] = useState();
  const [tournamentShowTeams, setTournamentShowTeams] = useState(false);
  const [updated, setUpdated] = useState(false);

  const isChairperson = getLocalStorage("group") === "chairperson";

  const [showUnrated, setShowUnrated] = useState(
    getLocalStorage("showUnrated") ?? false
  );
  const [showTeam, setShowTeam] = useState(
    getLocalStorage("showTeam") ?? (isChairperson ? false : true)
  );
  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterGroup, setFilterGroup] = useState();
  const [layout, setLayout] = useState(getLocalStorage("layout") ?? "list");
  const pk = getLocalStorage("ballkid_id");

  useEffect(() => {
    fetch("/api/list/" + pk, {
      headers: getAuthHeader(),
    })
      .then((response) => response.json())
      .then((data) => {
        setBallkids(data.filter((ballkid) => ballkid.is_cut === false));
        setMyTeam(data.filter((ballkid) => ballkid.id === pk)[0]?.current_team);
      });
    fetch("/api/get-tournament", {
      method: "GET",
      headers: getAuthHeader(),
    })
      .then((response) => response.json())
      .then((data) => setTournamentShowTeams(data["show_teams"]))
      .then(() => setUpdated(false));
  }, [pk, updated]);

  return (
    <div className="page">
      <Banners />

      <div className="justify">
        <Box className="sxs" sx={{ mb: 1 }}>
          <Typography variant="h4">Rate by Name</Typography>
          &ensp;
          <Typography variant="h6">
            (
            {
              filterBallkids(
                getBallkidsToRender(
                  ballkids,
                  showUnrated,
                  showTeam,
                  myTeam,
                  tournamentShowTeams
                ),
                searchKeyword,
                filterGroup
              ).length
            }
            )
          </Typography>
          &thinsp;
          <HelpIcon
            page="Rate by Name"
            message={isChairperson ? rateByName : rateByNameNonchairperson}
          />
        </Box>
        <LayoutButtons layout={layout} setLayout={setLayout} />
      </div>

      <Grid container>
        {renderSwitch(
          showUnrated,
          setShowUnrated,
          "Show All Ballkids",
          "Show Ballkids to Rate",
          "showUnrated"
        )}

        {renderSwitch(
          showTeam,
          setShowTeam,
          "Show All Teams",
          "Show My Team Only",
          "showTeam"
        )}
      </Grid>

      <SearchAndFilter
        setSearchKeyword={setSearchKeyword}
        filterGroup={filterGroup}
        setFilterGroup={setFilterGroup}
      />
      <BallkidsSection
        ballkids={filterBallkids(
          getBallkidsToRender(
            ballkids,
            showUnrated,
            showTeam,
            myTeam,
            tournamentShowTeams
          ),
          searchKeyword,
          filterGroup
        )}
        layout={layout}
        setUpdated={setUpdated}
      />
    </div>
  );
}
