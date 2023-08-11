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
  Banners,
} from "../Utils";
import { list, listNonchairperson } from "../HelpMessages";

export default function BallkidList(props) {
  const [ballkids, setBallkids] = useState([]);

  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterGroup, setFilterGroup] = useState();
  const [layout, setLayout] = useState(getLocalStorage("layout") ?? "list");

  const group = getLocalStorage("group");
  const filters = ["captain", "chairperson", "back", "net"];

  useEffect(() => {
    fetch("/api/list", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) =>
        setBallkids(data.filter((ballkid) => ballkid.is_cut === false))
      );
  }, []);

  return (
    <div className="page">
      <Banners />

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

        <LayoutButtons layout={layout} setLayout={setLayout} />
      </div>

      {ballkids.length === 0 ? (
        <Typography>There are no ballkids to show.</Typography>
      ) : (
        <Grid container spacing={layout === "grid" ? 2 : 1}>
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
                xs={layout === "grid" ? 6 : 12}
                sm={layout === "grid" ? 4 : 12}
                md={layout === "grid" ? 3 : 12}
                lg={layout === "grid" ? 2 : 12}
                xl={layout === "grid" ? 1 : 12}
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
