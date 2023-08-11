import React, { useState, useEffect } from "react";

import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import MenuItem from "@mui/material/MenuItem";

import LoadingButton from "@mui/lab/LoadingButton/LoadingButton";

import Done from "@mui/icons-material/Done";

import {
  LayoutButtons,
  getAuthHeader,
  getLocalStorage,
  SearchAndFilter,
  filterBallkids,
  ConfirmDialog,
  BallkidCard,
  HelpIcon,
  useIsMobile,
  Banners,
  CommentsText,
} from "../Utils";
import { MARGINS } from "../Consts";
import { checkin } from "../HelpMessages";
import { IconButton, TextField } from "@mui/material";

function CheckinButton({ ballkid, isCheckedIn, setUpdated }) {
  const checkinString = isCheckedIn ? "Check Out" : "Check In";
  const color = isCheckedIn ? "error" : "success";
  const newCheckinStatus = isCheckedIn ? false : true;

  const [loading, setLoading] = useState(false);

  return (
    <LoadingButton
      variant="outlined"
      loading={loading}
      color={color}
      size="small"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        setLoading(true);
        e.stopPropagation();
        e.preventDefault();
        fetch("/api/update-ballkid", {
          method: "PATCH",
          headers: getAuthHeader(),
          body: JSON.stringify({
            first_name: ballkid.first_name,
            last_name: ballkid.last_name,
            is_checked_in: newCheckinStatus,
          }),
        })
          .then((response) => response.json())
          .then(() => {
            setUpdated(true);
            setLoading(false);
          });
      }}
    >
      {checkinString}
    </LoadingButton>
  );
}

function CheckoutComments({ ballkid, layout, setUpdated }) {
  const [comments, setComments] = useState(ballkid.checkout_comments ?? "End");
  const [disabled, setDisabled] = useState(
    ballkid.checkout_comments !== "" && ballkid.checkout_comments !== null
  );

  return useIsMobile() ? (
    ""
  ) : ballkid.is_checked_in ? (
    <CommentsText
      comments={ballkid.checkout_comments}
      commentType="checkout"
      layout={layout}
    />
  ) : (
    <Box
      className="sxs"
      sx={{ mr: layout === "grid" ? 0 : 3, mt: layout === "grid" ? 1 : 0 }}
    >
      <Typography>Check-out Time:</Typography>
      &thinsp;
      <TextField
        variant="standard"
        disabled={disabled}
        sx={{ maxWidth: "40px", mx: 0.5 }}
        value={comments}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
        onChange={(e) => setComments(e.target.value)}
        onDoubleClick={() => setDisabled(false)}
      />
      <IconButton
        variant="outlined"
        size="small"
        color="primary"
        disabled={disabled}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          setDisabled(true);
          e.stopPropagation();
          e.preventDefault();

          fetch("/api/update-ballkid", {
            method: "PATCH",
            headers: getAuthHeader(),
            body: JSON.stringify({
              first_name: ballkid.first_name,
              last_name: ballkid.last_name,
              checkout_comments: comments,
            }),
          })
            .then((response) => response.json())
            .then(() => setUpdated(true));
        }}
      >
        <Done />
      </IconButton>
    </Box>
  );
}

function LastDayComments({ ballkid, layout, setUpdated }) {
  const [comments, setComments] = useState(ballkid.last_day ?? "End");
  const [disabled, setDisabled] = useState(
    ballkid.last_day !== "" && ballkid.last_day !== null
  );

  return useIsMobile() || ballkid.is_checked_in ? (
    ""
  ) : (
    <Box
      className="sxs"
      sx={{ mr: layout === "grid" ? 0 : 3, mt: layout === "grid" ? 1 : 0 }}
    >
      <Typography>Last Day:</Typography>
      &thinsp;
      <TextField
        select
        value={comments}
        disabled={disabled}
        variant="standard"
        sx={{ mx: 0.5 }}
        style={{ minWidth: 125 }}
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
        }}
        onChange={(e) => setComments(e.target.value)}
        onDoubleClick={() => setDisabled(false)}
      >
        {[
          "End",
          "Sunday",
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
          "Saturday",
        ].map((value) => (
          <MenuItem key={value} value={value}>
            {value}
          </MenuItem>
        ))}
      </TextField>
      <IconButton
        variant="outlined"
        size="small"
        color="primary"
        disabled={disabled}
        onMouseDown={(e) => e.stopPropagation()}
        onClick={(e) => {
          setDisabled(true);
          e.stopPropagation();
          e.preventDefault();

          fetch("/api/update-ballkid", {
            method: "PATCH",
            headers: getAuthHeader(),
            body: JSON.stringify({
              first_name: ballkid.first_name,
              last_name: ballkid.last_name,
              last_day: comments,
            }),
          })
            .then((response) => response.json())
            .then(() => setUpdated(true));
        }}
      >
        <Done />
      </IconButton>
    </Box>
  );
}

function renderBallkids(ballkids, isCheckedIn, layout, setUpdated) {
  return ballkids.length === 0 ? (
    <Typography variant="body1">
      {isCheckedIn
        ? "There are currently no ballkids checked in."
        : "There are currently no ballkids checked out."}
    </Typography>
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
              <Box
                className={layout === "grid" ? "" : "sxs"}
                textAlign="center"
                sx={{ mt: layout === "grid" ? 1 : 0 }}
              >
                {layout === "grid" ? (
                  <CheckinButton
                    ballkid={ballkid}
                    isCheckedIn={isCheckedIn}
                    setUpdated={setUpdated}
                  />
                ) : (
                  ""
                )}
                <LastDayComments
                  ballkid={ballkid}
                  layout={layout}
                  setUpdated={setUpdated}
                />
                <CheckoutComments
                  ballkid={ballkid}
                  layout={layout}
                  setUpdated={setUpdated}
                />
                {layout === "grid" ? (
                  ""
                ) : (
                  <CheckinButton
                    ballkid={ballkid}
                    isCheckedIn={isCheckedIn}
                    setUpdated={setUpdated}
                  />
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
  const [filterGroup, setFilterGroup] = useState();
  const [layout, setLayout] = useState(getLocalStorage("layout") ?? "list");
  const [updated, setUpdated] = useState(false);

  useEffect(() => {
    fetch("/api/list", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => {
        setCheckedIn(
          data.filter(
            (ballkid) =>
              ballkid.is_checked_in === true && ballkid.is_cut === false
          )
        );
        setCheckedOut(
          data.filter(
            (ballkid) =>
              ballkid.is_checked_in === false && ballkid.is_cut === false
          )
        );
      })
      .then(() => setUpdated(false));
  }, [updated]);

  return (
    <div className="page">
      <Banners />

      <ConfirmDialog
        message={`You are about to check out all ${
          checkedIn.length
        } checked in ballkid${checkedIn.length > 1 ? "s" : ""}.`}
        url={"/api/checkout-all"}
        body={{
          checkout_group: "all",
        }}
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
        <LayoutButtons layout={layout} setLayout={setLayout} />
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
        layout,
        setUpdated
      )}

      <Grid item className="sxs" sx={MARGINS}>
        <Typography variant="h5">Checked Out</Typography>
        &ensp;
        <Typography variant="h6">
          ({filterBallkids(checkedOut, searchKeyword, filterGroup).length})
        </Typography>
      </Grid>

      {renderBallkids(
        filterBallkids(checkedOut, searchKeyword, filterGroup),
        false,
        layout,
        setUpdated
      )}
    </div>
  );
}
