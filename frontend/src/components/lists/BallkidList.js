import React, { useState, useEffect } from "react";

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
import "./ballkid-list-by-name.css";

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

  const filtered = filterBallkids(ballkids, searchKeyword, filterGroup);

  return (
    <div className="page ballkid-list-page">
      <Banners />

      <Box className="ballkid-list-title-row">
        <Typography className="ballkid-list-title" variant="h4">
          List by Name
        </Typography>
        <Typography className="ballkid-list-count" variant="h6">
          ({filtered.length})
        </Typography>
        <HelpIcon
          page="List By Name"
          message={group === "chairperson" ? list : listNonchairperson}
        />
      </Box>

      <div className="ballkid-list-toolbar">
        <div className="ballkid-list-toolbar-search">
          <SearchAndFilter
            setSearchKeyword={setSearchKeyword}
            filterGroup={filterGroup}
            setFilterGroup={setFilterGroup}
            filters={group === "ballkid" ? filters : ["rookie", ...filters]}
          />
        </div>
        <div className="ballkid-list-toolbar-divider" />
        <div className="ballkid-list-toolbar-layout">
          <LayoutButtons layout={layout} setLayout={setLayout} />
        </div>
      </div>

      {ballkids.length === 0 ? (
        <div className="ballkid-list-empty">There are no ballkids to show.</div>
      ) : (
        <div
          className={
            layout === "grid" ? "ballkid-list-grid" : "ballkid-list-stack"
          }
        >
          {filtered.map((ballkid) => (
            <div className="ballkid-list-card-wrap" key={ballkid.id}>
              <BallkidCard
                ballkid={ballkid}
                renderAdditional={
                  <Typography variant="body2" color="text.secondary">
                    {ballkid.preferred_position}
                  </Typography>
                }
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}