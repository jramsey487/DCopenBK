import React, { useState, useEffect } from "react";

import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";

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
  TournamentBanner,
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

function Comments({ ballkid, isCheckoutComments, gridLayout, setUpdated }) {
  const defaultComment = isCheckoutComments ? "End" : "";
  const ballkidComments = isCheckoutComments
    ? ballkid.checkout_comments
    : ballkid.schedule_comments;

  const [comments, setComments] = useState(ballkidComments ?? defaultComment);
  const [disabled, setDisabled] = useState(
    ballkidComments !== "" && ballkidComments !== null
  );

  const isMobile = useIsMobile();

  return isMobile ? (
    ""
  ) : ballkid.is_checked_in ? (
    !isCheckoutComments ? (
      ""
    ) : (
      <CommentsText
        comments={comments}
        commentType={"checkout"}
        gridLayout={gridLayout}
      />
    )
  ) : (
    <Box
      className="sxs"
      sx={{ mr: gridLayout ? 0 : 3, mt: gridLayout ? 1 : 0 }}
    >
      <Typography>
        {isCheckoutComments ? "Check-out Time:" : "Last Day: "}
      </Typography>
      &thinsp;
      <TextField
        variant="standard"
        disabled={disabled}
        sx={{ maxWidth: isCheckoutComments ? "40px" : "100px", mx: 0.5 }}
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

          const bodyDict = isCheckoutComments
            ? { checkout_comments: comments }
            : { schedule_comments: comments };

          fetch("/api/update-ballkid", {
            method: "PATCH",
            headers: getAuthHeader(),
            body: JSON.stringify({
              first_name: ballkid.first_name,
              last_name: ballkid.last_name,
              ...bodyDict,
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
              <Box
                className={gridLayout ? "" : "sxs"}
                textAlign="center"
                sx={{ mt: gridLayout ? 1 : 0 }}
              >
                {gridLayout ? (
                  <CheckinButton
                    ballkid={ballkid}
                    isCheckedIn={isCheckedIn}
                    setUpdated={setUpdated}
                  />
                ) : (
                  ""
                )}
                <Comments
                  ballkid={ballkid}
                  isCheckoutComments={false}
                  gridLayout={gridLayout}
                  setUpdated={setUpdated}
                />
                <Comments
                  ballkid={ballkid}
                  isCheckoutComments={true}
                  gridLayout={gridLayout}
                  setUpdated={setUpdated}
                />
                {gridLayout ? (
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
      <TournamentBanner />

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
