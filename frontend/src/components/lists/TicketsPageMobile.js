import React, { useState, useEffect } from "react";

import Typography from "@mui/material/Typography";
import Button from "@mui/material/Button";
import Table from "@mui/material/Table";
import TableContainer from "@mui/material/TableContainer";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";

import {
  getAuthHeader,
  SearchAndFilter,
  filterBallkids,
  ConfirmDialog,
  DraggableBallkidAndIcon,
  Banners,
} from "../Utils";
import { MARGINS } from "../Consts";
import { Teams, Header } from "../teams/TeamsPageChairpersonUtils";

function renderAssignButton(
  ballkid,
  buttonString,
  team,
  setUpdated,
  isFinalsPage = false
) {
  return (
    <Button
      key={team}
      sx={{ m: 0.2, minWidth: 0 }}
      size="small"
      variant="outlined"
      onClick={(e) => {
        const teamAssignDict = isFinalsPage
          ? { finals_team: team }
          : { current_team: team };

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
      }}
    >
      {buttonString}
    </Button>
  );
}

export function UnassignedMobile({
  unassigned,
  teams,
  setUpdated,
  isFinalsPage = false,
}) {
  const [open, setOpen] = useState(false);

  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterGroup, setFilterGroup] = useState();

  return (
    <div>
      <ConfirmDialog
        message={`You are about to check out all ${
          unassigned.length
        } unassigned ballkid${unassigned.length > 1 ? "s" : ""}.`}
        url={"/api/checkout-all"}
        body={{
          checkout_group: "unassigned",
        }}
        open={open}
        setOpen={setOpen}
        setUpdated={setUpdated}
      />

      <div className="justify">
        <div className="sxs">
          <Typography variant="h5" sx={MARGINS}>
            Unassigned
          </Typography>
          &ensp;
          <Typography variant="h6" sx={MARGINS}>
            ({filterBallkids(unassigned, searchKeyword, filterGroup).length})
          </Typography>
        </div>
      </div>

      {unassigned.length === 0 ? (
        <Typography variant="body1">
          There are currently no {isFinalsPage ? "" : "checked in "}ballkids who
          are unassigned.
        </Typography>
      ) : (
        <div>
          <SearchAndFilter
            setSearchKeyword={setSearchKeyword}
            filterGroup={filterGroup}
            setFilterGroup={setFilterGroup}
            filters={
              isFinalsPage
                ? ["rookie", "supervet", "captain", "back", "net"]
                : [
                    "rookie",
                    "supervet",
                    "captain",
                    "chairperson",
                    "back",
                    "net",
                  ]
            }
          />

          <TableContainer component={Paper} elevation={1}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Name</TableCell>
                  <TableCell>Preferred Position</TableCell>
                  <TableCell align="right">Assign To Team</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filterBallkids(unassigned, searchKeyword, filterGroup).map(
                  (ballkid) => (
                    <TableRow key={ballkid.id}>
                      <TableCell component="th" scope="row">
                        <DraggableBallkidAndIcon
                          ballkid={ballkid}
                          type={isFinalsPage ? "rank" : "checkout-teams"}
                        />
                      </TableCell>
                      <TableCell>{ballkid.preferred_position}</TableCell>
                      <TableCell align="right">
                        {teams.map((team) =>
                          renderAssignButton(
                            ballkid,
                            team,
                            team,
                            setUpdated,
                            isFinalsPage
                          )
                        )}
                        {isFinalsPage
                          ? ""
                          : renderAssignButton(
                              ballkid,
                              "New Team",
                              teams.length + 1,
                              setUpdated
                            )}
                      </TableCell>
                    </TableRow>
                  )
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </div>
      )}
    </div>
  );
}

export default function TicketsPageMobile(props) {
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
      <Banners />

      <Header />
      <Teams
        assigned={assigned}
        teams={teams}
        nextShifts={nextShifts}
        setUpdated={setUpdated}
      />
      <UnassignedMobile
        unassigned={unassigned}
        teams={teams}
        setUpdated={setUpdated}
      />
    </div>
  );
}
