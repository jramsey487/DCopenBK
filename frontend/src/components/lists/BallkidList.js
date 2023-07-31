import React, { useState, useEffect } from "react";

import Grid from "@mui/material/Grid";
import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";

import {
  LayoutButtons,
  SearchAndFilter,
  filterBallkids,
  getAuthHeader,
  getLocalStorage,
  BallkidCard,
  HelpIcon,
  TournamentBanner,
} from "../Utils";
import { list, listNonchairperson } from "../HelpMessages";

export default function BallkidList(props) {
  const [ballkids, setBallkids] = useState([]);

  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterGroup, setFilterGroup] = useState();
  const [gridLayout, setGridLayout] = useState(
    getLocalStorage("gridLayout") ?? false
  );

  const group = getLocalStorage("group");
  const filters = ["captain", "chairperson", "back", "net"];

  useEffect(() => {
    fetch("/api/list", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => setBallkids(data));
  }, []);

  return (
    <div className="page">
      <TournamentBanner />

      <div className="justify">
        <Box className="sxs" sx={{ mb: 1 }}>
          <Typography variant="h4">List by Name</Typography>
          &ensp;
          <Typography variant="h6">
            ({filterBallkids(ballkids, searchKeyword, filterGroup).length})
          </Typography>
          &thinsp;
          <HelpIcon
            page="List By Name"
            message={group === "chairperson" ? list : listNonchairperson}
          />
        </Box>

        <LayoutButtons gridLayout={gridLayout} setGridLayout={setGridLayout} />
      </div>

      {ballkids.length === 0 ? (
        <Typography>There are no ballkids to show.</Typography>
      ) : (
        <Grid container spacing={gridLayout ? 2 : 1}>
          <SearchAndFilter
            setSearchKeyword={setSearchKeyword}
            filterGroup={filterGroup}
            setFilterGroup={setFilterGroup}
            filters={group === "ballkid" ? filters : ["rookie", ...filters]}
          />

          {filterBallkids(ballkids, searchKeyword, filterGroup).map(
            (ballkid) => (
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
                    <Typography variant="body2" color="text.secondary">
                      {ballkid.preferred_position}
                    </Typography>
                  }
                />
              </Grid>
            )
          )}
        </Grid>
      )}
    </div>
  );
}
