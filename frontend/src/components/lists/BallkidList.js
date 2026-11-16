import React, { useMemo, useState } from "react";

import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";

import {
  LayoutButtons,
  SearchAndFilter,
  filterBallkids,
  getLocalStorage,
  BallkidCard,
  HelpIcon,
  Banners,
} from "../Utils";
import { useApi } from "../api";
import { list, listNonchairperson } from "../HelpMessages";
import "./ballkid-list-by-name.css";

function activeBallkids(data) {
  return (Array.isArray(data) ? data : []).filter(
    (ballkid) => ballkid.is_cut === false
  );
}

export default function BallkidList() {
  const { data, error, loading, refetch } = useApi("/api/list", { ttl: 60000 });
  const ballkids = useMemo(
    () => (data === undefined ? null : activeBallkids(data)),
    [data]
  );

  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterGroup, setFilterGroup] = useState();
  const [layout, setLayout] = useState(getLocalStorage("layout") ?? "list");

  const group = getLocalStorage("group");
  const filters = ["captain", "chairperson", "back", "net"];

  const filtered =
    ballkids == null ? [] : filterBallkids(ballkids, searchKeyword, filterGroup);

  let body;
  if (loading) {
    body = <div className="ballkid-list-empty">Loading ballkids…</div>;
  } else if (error && ballkids == null) {
    body = (
      <div className="ballkid-list-empty">
        {error.message}{" "}
        <Button size="small" onClick={refetch}>
          Retry
        </Button>
      </div>
    );
  } else if (!ballkids || ballkids.length === 0) {
    body = <div className="ballkid-list-empty">There are no ballkids to show.</div>;
  } else {
    body = (
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
    );
  }

  return (
    <div className="page ballkid-list-page">
      <Banners />

      <Box
        className="ballkid-list-title-row"
        sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}
      >
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
        <Box sx={{ ml: "auto" }}>
          <LayoutButtons layout={layout} setLayout={setLayout} />
        </Box>
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
      </div>

      {body}
    </div>
  );
}