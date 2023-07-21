import React, { useState, useEffect } from "react";
import { useDrop } from "react-dnd";

import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";

import {
  getAuthHeader,
  SearchAndFilter,
  filterBallkids,
  CheckoutConfirmDialog,
  DraggableBallkidAndIcon,
} from "../Utils";
import { MARGINS } from "../Consts";
import {
  Teams,
  Header,
  renderCheckoutUnassignedButton,
} from "./TeamsPageChairpersonUtils";

export function UnassignedDesktop({
  unassigned,
  setUpdated,
  isFinalsPage = false,
}) {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterGroup, setFilterGroup] = useState();
  const [open, setOpen] = useState(false);

  const positions = ["Net", "Back"];

  const [{ isOver }, dropRef] = useDrop({
    accept: "ballkid",
    drop: (ballkid) => {
      const teamAssignDict = isFinalsPage
        ? { finals_team: "" }
        : { current_team: 0 };

      fetch("/api/update-ballkid", {
        method: "PATCH",
        headers: getAuthHeader(),
        body: JSON.stringify({
          first_name: ballkid.first_name,
          last_name: ballkid.last_name,
          ...teamAssignDict,
        }),
      })
        .then((response) => response.json())
        .then(() => setUpdated(true));
    },
    collect: (monitor) => ({ isOver: monitor.isOver() }),
  });

  return (
    <Box
      component={Paper}
      ref={dropRef}
      elevation={isOver ? 10 : 1}
      sx={{ pl: { xs: 0, sm: 3 }, ml: { xs: 0, sm: 3 }, pb: 2 }}
    >
      <CheckoutConfirmDialog
        message={`You are about to check out all ${
          unassigned.length
        } unassigned ballkid${unassigned.length > 1 ? "s" : ""}.`}
        group="unassigned"
        open={open}
        setOpen={setOpen}
        setUpdated={setUpdated}
      />

      <div className="justify">
        <div className="sxs">
          <Typography variant="h5" sx={MARGINS}>
            Unassigned
          </Typography>
          <Typography variant="h6" sx={MARGINS}>
            &ensp; (
            {filterBallkids(unassigned, searchKeyword, filterGroup).length})
          </Typography>
        </div>

        {unassigned.length === 0 || isFinalsPage
          ? ""
          : renderCheckoutUnassignedButton(setOpen)}
      </div>

      <div>
        <SearchAndFilter
          setSearchKeyword={setSearchKeyword}
          filterGroup={filterGroup}
          setFilterGroup={setFilterGroup}
          filters={["captain", "supervet", "rookie", "chairperson"]}
        />
        {positions.map((position) => {
          const ballkids = filterBallkids(
            unassigned,
            searchKeyword,
            filterGroup
          ).filter((ballkid) => ballkid.position === position);
          const half = Math.ceil(ballkids.length / 2);

          return (
            <div key={position}>
              <div className="sxs">
                <Typography variant="h6" sx={MARGINS}>
                  {position}s
                </Typography>
                <Typography variant="subtitle1" sx={{ ...MARGINS, ml: 1 }}>
                  ({ballkids.length})
                </Typography>
              </div>

              {ballkids.length === 0 ? (
                <Typography variant="body1" sx={{ pb: 1 }}>
                  There are currently no {isFinalsPage ? "" : "checked in "}
                  {position.toLowerCase()}s who are unassigned.
                </Typography>
              ) : (
                <Grid container>
                  {[ballkids.slice(0, half), ballkids.slice(half)].map(
                    (sliced) => (
                      <Grid
                        container
                        item
                        direction="column"
                        xs={12}
                        sm={6}
                        md={6}
                        lg={6}
                        xl={4}
                      >
                        {sliced.map((ballkid) => (
                          <Grid key={ballkid.id} item sx={{ px: 1 }}>
                            {<DraggableBallkidAndIcon ballkid={ballkid} />}
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
      </div>
    </Box>
  );
}

export default function TeamsPageChairpersonDesktop(props) {
  const [assigned, setAssigned] = useState([]);
  const [unassigned, setUnassigned] = useState([]);
  const [nextShifts, setNextShifts] = useState([]);
  const [teams, setTeams] = useState([]);
  const [updated, setUpdated] = useState(false);

  useEffect(() => {
    fetch("/api/sorted-list", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => {
        setAssigned(
          data.filter(
            (ballkid) =>
              ballkid.is_checked_in === true && ballkid.current_team > 0
          )
        );
        setUnassigned(
          data.filter(
            (ballkid) =>
              ballkid.is_checked_in === true && ballkid.current_team === 0
          )
        );
      });

    fetch("/api/calc-num-teams", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setTeams(data["teams"]));

    fetch("/api/get-next-shifts", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setNextShifts(data))
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
          <Header />
          <Teams
            assigned={assigned}
            teams={teams}
            nextShifts={nextShifts}
            setUpdated={setUpdated}
          />
        </Grid>

        <Grid
          item
          sm={6}
          md={5}
          lg={4}
          xl={3}
          style={{ maxHeight: "85vh", overflow: "auto" }}
        >
          <UnassignedDesktop unassigned={unassigned} setUpdated={setUpdated} />
        </Grid>
      </Grid>
    </div>
  );
}
