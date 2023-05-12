import React, { useState, useEffect } from "react";

import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardMedia from "@mui/material/CardMedia";
import CardActionArea from "@mui/material/CardActionArea";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";

import AspectRatio from "@mui/joy/AspectRatio";

import {
  Icons,
  LayoutButtons,
  getAuthHeader,
  getLocalStorage,
  SearchAndFilter,
  filterBallkids,
} from "../Utils";
import { MARGINS } from "../Consts";

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
          <Card>
            <CardActionArea href={`ballkid/${ballkid.id}`}>
              {!gridLayout ? (
                ""
              ) : (
                <AspectRatio ratio="1/1">
                  <CardMedia component="img" image={ballkid.image} />
                </AspectRatio>
              )}
              <CardContent>
                <div className={gridLayout ? "" : "justify"}>
                  <div className={gridLayout ? "justify" : "sxs"}>
                    <Typography
                      variant="subtitle1"
                      sx={{ fontWeight: "medium" }}
                    >
                      {ballkid.first_name} {ballkid.last_name}
                    </Typography>
                    &thinsp;
                    <Icons ballkid={ballkid} margin={0} />
                  </div>
                  <Box textAlign="center" sx={{ mt: gridLayout ? 1 : 0 }}>
                    {renderCheckinButton(
                      ballkid.first_name,
                      ballkid.last_name,
                      isCheckedIn,
                      setUpdated
                    )}
                  </Box>
                </div>
              </CardContent>
            </CardActionArea>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}

function renderCheckoutAllButton(setUpdated) {
  return (
    <Button
      variant="contained"
      color="error"
      onClick={() => {
        fetch("/api/checkout-all", {
          method: "PATCH",
          headers: getAuthHeader(),
        })
          .then((response) => response.json())
          .then(() => setUpdated(true));
      }}
    >
      Check Out All
    </Button>
  );
}

export default function CheckinPage(props) {
  const [checkedIn, setCheckedIn] = useState([]);
  const [checkedOut, setCheckedOut] = useState([]);
  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterGroup, setFilterGroup] = useState();

  const [gridLayout, setGridLayout] = useState(
    getLocalStorage("gridLayout") ?? true
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
      <div className="justify">
        <Typography variant="h4" sx={{ mb: 1 }}>
          Check-in
        </Typography>
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
          <Typography variant="h6" sx={MARGINS}>
            &ensp; (
            {filterBallkids(checkedIn, searchKeyword, filterGroup).length})
          </Typography>
        </Grid>
        {checkedIn.length > 0 && (
          <Grid item sx={MARGINS}>
            {renderCheckoutAllButton(setUpdated)}
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
        <Typography variant="h6" sx={MARGINS}>
          &ensp; (
          {filterBallkids(checkedOut, searchKeyword, filterGroup).length})
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
