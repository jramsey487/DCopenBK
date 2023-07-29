import React, { useState, useEffect } from "react";

import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";

import {
  LayoutButtons,
  getAuthHeader,
  getLocalStorage,
  SearchAndFilter,
  filterBallkids,
  ConfirmDialog,
  BallkidCard,
  HelpIcon,
} from "../Utils";
import { MARGINS } from "../Consts";
import { checkin } from "../HelpMessages";

function renderCheckinButton(firstName, lastName, isCheckedIn, setUpdated) {
  const checkinString = isCheckedIn ? "Check Out" : "Check In";
  const color = isCheckedIn ? "error" : "success";
  const newCheckinStatus = isCheckedIn ? false : true;

  return (
    <Button
      variant="outlined"
      color={color}
      size="small"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        fetch("/api/update-ballkid", {
          method: "PATCH",
          headers: getAuthHeader(),
          body: JSON.stringify({
            first_name: firstName,
            last_name: lastName,
            is_checked_in: newCheckinStatus,
          }),
        })
          .then((response) => response.json())
          .then(() => setUpdated(true));
      }}
    >
      {checkinString}
    </Button>
  );
}

function renderBallkids(ballkids, isCheckedIn, gridLayout, setUpdated) {
  return ballkids.length === 0 ? (
    <Typography variant="body1">
      {isCheckedIn
        ? "There are currently no ballkids checked in."
        : "There are currently no ballkids checked out."}
    </Typography>
  ) : (
    <Grid container spacing={gridLayout ? 2 : 1}>
      {ballkids.map((ballkid) => (
        <Grid
          item
          key={ballkid.id}
          xs={gridLayout ? 6 : 12}
          sm={gridLayout ? 4 : 12}
          md={gridLayout ? 3 : 12}
          lg={gridLayout ? 2 : 12}
          xl={gridLayout ? 1 : 12}
        >
          <BallkidCard
            ballkid={ballkid}
            renderAdditional={
              <Box textAlign="center" sx={{ mt: gridLayout ? 1 : 0 }}>
                {renderCheckinButton(
                  ballkid.first_name,
                  ballkid.last_name,
                  isCheckedIn,
                  setUpdated
                )}
              </Box>
            }
          />
        </Grid>
      ))}
    </Grid>
  );
}

function renderCheckoutAllButton(setOpen) {
  return (
    <Button variant="contained" color="error" onClick={() => setOpen(true)}>
      Check Out All
    </Button>
  );
}

export default function CheckinPage(props) {
  const [checkedIn, setCheckedIn] = useState([]);
  const [checkedOut, setCheckedOut] = useState([]);
  const [open, setOpen] = useState(false);

  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterGroup, setFilterGroup] = useState(
    getLocalStorage("filterGroup")
  );
  const [gridLayout, setGridLayout] = useState(
    getLocalStorage("gridLayout") ?? false
  );
  const [updated, setUpdated] = useState(false);

  useEffect(() => {
    fetch("/api/list", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => {
        setCheckedIn(data.filter((ballkid) => ballkid.is_checked_in === true));
        setCheckedOut(
          data.filter((ballkid) => ballkid.is_checked_in === false)
        );
      })
      .then(() => setUpdated(false));
  }, [updated]);

  return (
    <div className="page">
      <ConfirmDialog
        message={`You are about to check out all ${
          checkedIn.length
        } checked in ballkid${checkedIn.length > 1 ? "s" : ""}.`}
        url={"/api/checkout-all"}
        body={JSON.stringify({
          checkout_group: "all",
        })}
        open={open}
        setOpen={setOpen}
        setUpdated={setUpdated}
      />

      <div className="justify">
        <Box className="sxs" sx={{ mb: 1 }}>
          <Typography variant="h4">Check-in</Typography>
          &thinsp;
          <HelpIcon page="Check-in" message={checkin} />
        </Box>
        <LayoutButtons gridLayout={gridLayout} setGridLayout={setGridLayout} />
      </div>

      <SearchAndFilter
        setSearchKeyword={setSearchKeyword}
        filterGroup={filterGroup}
        setFilterGroup={setFilterGroup}
      />

      <Grid container justifyContent="space-between">
        <Grid item className="sxs">
          <Typography variant="h5" sx={MARGINS}>
            Checked In
          </Typography>
          &ensp;
          <Typography variant="h6" sx={MARGINS}>
            ({filterBallkids(checkedIn, searchKeyword, filterGroup).length})
          </Typography>
        </Grid>

        {checkedIn.length > 0 && (
          <Grid item sx={MARGINS}>
            {renderCheckoutAllButton(setOpen)}
          </Grid>
        )}
      </Grid>

      {renderBallkids(
        filterBallkids(checkedIn, searchKeyword, filterGroup),
        true,
        gridLayout,
        setUpdated
      )}

      <Grid item className="sxs">
        <Typography variant="h5" sx={MARGINS}>
          Checked Out
        </Typography>
        &ensp;
        <Typography variant="h6" sx={MARGINS}>
          ({filterBallkids(checkedOut, searchKeyword, filterGroup).length})
        </Typography>
      </Grid>

      {renderBallkids(
        filterBallkids(checkedOut, searchKeyword, filterGroup),
        false,
        gridLayout,
        setUpdated
      )}
    </div>
  );
}
