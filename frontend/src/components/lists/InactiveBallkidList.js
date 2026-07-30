import React, { useState, useEffect } from "react";

import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import PersonRemoveOutlinedIcon from "@mui/icons-material/PersonRemoveOutlined";
import ArchiveOutlinedIcon from "@mui/icons-material/ArchiveOutlined";

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
import { inactive } from "../HelpMessages";
import "./ballkid-list-by-name.css";

function renderUnarchiveButton(ballkid, setUpdated) {
  return (
    <Button
      className="ballkid-list-action-btn"
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
      Un-archive
    </Button>
  );
}

function renderUncutButton(ballkid, setUpdated) {
  return (
    <Button
      className="ballkid-list-action-btn"
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
    <div className="ballkid-list-empty ballkid-list-section-content" style={{ textAlign: "left", marginBottom: "2rem" }}>
      There are currently no {section} ballkids.
    </div>
  ) : (
    <div
      className={
        layout === "grid"
          ? "ballkid-list-grid ballkid-list-section-content"
          : "ballkid-list-stack ballkid-list-section-content"
      }
      style={{ marginBottom: "2rem" }}
    >
      {ballkids.map((ballkid) => (
        <div className="ballkid-list-card-wrap" key={ballkid.id}>
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
        </div>
      ))}
    </div>
  );
}

export default function InactiveBallkidList(props) {
  const [archived, setArchived] = useState([]);
  const [cut, setCut] = useState([]);

  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterGroup, setFilterGroup] = useState();
  const [layout, setLayout] = useState(getLocalStorage("layout") ?? "list");
  const [updated, setUpdated] = useState(false);

  const group = getLocalStorage("group");
  const filters = ["captain", "chairperson", "back", "net"];

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
    <div className="page ballkid-list-page">
      <Banners />

      <Box
        className="ballkid-list-title-row"
        sx={{ mb: 2, display: "flex", alignItems: "center", gap: 1 }}
      >
        <Typography className="ballkid-list-title" variant="h4">
          Inactive
        </Typography>
        <HelpIcon page="Inactive" message={inactive} />
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

      <Box
        className="sxs ballkid-list-section-head"
        sx={{
          mt: 3,
          alignItems: "center",
          borderBottom: "1px solid",
          borderColor: "divider",
          pb: 1,
        }}
      >
        <PersonRemoveOutlinedIcon
          sx={{ fontSize: 20, mr: 1, "& path": { strokeWidth: 1.2 } }}
        />
        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: "1.1rem" }}>
          Cut Ballkids
        </Typography>
        &ensp;
        <Typography variant="body1" sx={{ opacity: 0.6, fontWeight: 500 }}>
          ({filterBallkids(cut, searchKeyword, filterGroup).length})
        </Typography>
      </Box>

      {renderBallkids(
        filterBallkids(cut, searchKeyword, filterGroup),
        "cut",
        layout,
        setUpdated
      )}

      <Box
        className="sxs ballkid-list-section-head"
        sx={{
          mt: 3,
          alignItems: "center",
          borderBottom: "1px solid",
          borderColor: "divider",
          pb: 1,
        }}
      >
        <ArchiveOutlinedIcon
          sx={{ fontSize: 20, mr: 1, "& path": { strokeWidth: 1.2 } }}
        />
        <Typography variant="h6" sx={{ fontWeight: 600, fontSize: "1.1rem" }}>
          Archived Ballkids
        </Typography>
        &ensp;
        <Typography variant="body1" sx={{ opacity: 0.6, fontWeight: 500 }}>
          ({filterBallkids(archived, searchKeyword, filterGroup).length})
        </Typography>
      </Box>

      {renderBallkids(
        filterBallkids(archived, searchKeyword, filterGroup),
        "archived",
        layout,
        setUpdated
      )}
    </div>
  );
}