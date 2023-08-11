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
  BallkidCard,
  HelpIcon,
  Banners,
} from "../Utils";
import { MARGINS } from "../Consts";
import { inactive } from "../HelpMessages";

function renderUnarchiveButton(ballkid, setUpdated) {
  return (
    <Button
      variant="outlined"
      color="success"
      size="small"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        fetch("/api/update-ballkid", {
          method: "PATCH",
          headers: getAuthHeader(),
          body: JSON.stringify({
            first_name: ballkid.first_name,
            last_name: ballkid.last_name,
            is_active: true,
          }),
        })
          .then((response) => response.json())
          .then(() => setUpdated(true));
      }}
    >
      Un-Archive
    </Button>
  );
}

function renderUncutButton(ballkid, setUpdated) {
  return (
    <Button
      variant="outlined"
      label="Cut"
      color="success"
      size="small"
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
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
      Un-cut
    </Button>
  );
}

function renderBallkids(ballkids, section, layout, setUpdated) {
  return ballkids.length === 0 ? (
    <Typography variant="body1">
      There are currently no {section} ballkids.
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
              <Box textAlign="center" sx={{ mt: layout === "grid" ? 1 : 0 }}>
                {section === "cut"
                  ? renderUncutButton(ballkid, setUpdated)
                  : renderUnarchiveButton(ballkid, setUpdated)}
              </Box>
            }
          />
        </Grid>
      ))}
    </Grid>
  );
}

export default function InactiveBallkidList(props) {
  const [archived, setArchived] = useState([]);
  const [cut, setCut] = useState([]);

  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterGroup, setFilterGroup] = useState();
  const [layout, setLayout] = useState(getLocalStorage("layout") ?? "list");
  const [updated, setUpdated] = useState(false);

  useEffect(() => {
    fetch("/api/inactive-list", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => {
        setArchived(data.filter((ballkid) => ballkid.is_active === false));
        setCut(
          data.filter(
            (ballkid) => ballkid.is_active === true && ballkid.is_cut === true
          )
        );
      })
      .then(() => setUpdated(false));
  }, [updated]);

  return (
    <div className="page">
      <Banners />

      <div className="justify">
        <Box className="sxs" sx={{ mb: 1 }}>
          <Typography variant="h4">Inactive</Typography>
          &thinsp;
          <HelpIcon page="Inactive" message={inactive} />
        </Box>

        <LayoutButtons layout={layout} setLayout={setLayout} />
      </div>

      <SearchAndFilter
        setSearchKeyword={setSearchKeyword}
        filterGroup={filterGroup}
        setFilterGroup={setFilterGroup}
      />

      <Grid item className="sxs">
        <Typography variant="h5" sx={MARGINS}>
          Cut Ballkids
        </Typography>
        &ensp;
        <Typography variant="h6" sx={MARGINS}>
          ({filterBallkids(cut, searchKeyword, filterGroup).length})
        </Typography>
      </Grid>

      {renderBallkids(
        filterBallkids(cut, searchKeyword, filterGroup),
        "cut",
        layout,
        setUpdated
      )}

      <Grid item className="sxs">
        <Typography variant="h5" sx={MARGINS}>
          Archived Ballkids
        </Typography>
        &ensp;
        <Typography variant="h6" sx={MARGINS}>
          ({filterBallkids(archived, searchKeyword, filterGroup).length})
        </Typography>
      </Grid>

      {renderBallkids(
        filterBallkids(archived, searchKeyword, filterGroup),
        "archived",
        layout,
        setUpdated
      )}
    </div>
  );
}
