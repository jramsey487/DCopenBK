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
import { cacheGet, cacheSet } from "../apiCache";
import "./ballkid-list-by-name.css";

const LIST_CACHE_KEY = "api:list";

function activeBallkids(data) {
  return (Array.isArray(data) ? data : []).filter(
    (ballkid) => ballkid.is_cut === false
  );
}

export default function BallkidList() {
  const cached = cacheGet(LIST_CACHE_KEY);
  const [ballkids, setBallkids] = useState(() =>
    cached != null ? activeBallkids(cached) : null
  );

  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterGroup, setFilterGroup] = useState();
  const [layout, setLayout] = useState(getLocalStorage("layout") ?? "list");

  const group = getLocalStorage("group");
  const filters = ["captain", "chairperson", "back", "net"];

  useEffect(() => {
    let cancelled = false;

    fetch("/api/list", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) => {
        cacheSet(LIST_CACHE_KEY, data);
        if (!cancelled) {
          setBallkids(activeBallkids(data));
        }
      })
      .catch(() => {
        if (!cancelled) {
          setBallkids((prev) => (prev == null ? [] : prev));
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const filtered =
    ballkids == null ? [] : filterBallkids(ballkids, searchKeyword, filterGroup);

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

      {ballkids == null ? (
        <div className="ballkid-list-empty">Loading ballkids…</div>
      ) : ballkids.length === 0 ? (
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
