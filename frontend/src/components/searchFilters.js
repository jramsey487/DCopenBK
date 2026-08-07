import React from "react";

import TextField from "@mui/material/TextField";
import Typography from "@mui/material/Typography";
import Tooltip from "@mui/material/Tooltip";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import GridView from "@mui/icons-material/GridView";
import List from "@mui/icons-material/List";

import { ICON_DICT, TOOLTIP_DICT, SUPERVET_THRESHOLD } from "./Consts";
import { setLocalStorage } from "./authStorage";
import "./search-and-filter.css";

function SearchBox({ setSearchKeyword }) {
  return (
    <TextField
      size="small"
      type="search"
      variant="outlined"
      fullWidth
      sx={{ py: 1 }}
      placeholder="Search by name..."
      onChange={(e) => setSearchKeyword(e.target.value)}
    />
  );
}

export function LayoutButtons({ layout, setLayout }) {
  return (
    <ToggleButtonGroup
      value={layout}
      size="small"
      exclusive
      onChange={(e, newVal) => {
        if (newVal !== null) {
          setLayout(newVal);
          setLocalStorage("layout", newVal);
        }
      }}
    >
      {["grid", "list"].map((layoutStr) => (
        <ToggleButton key={layoutStr} value={layoutStr}>
          <Tooltip title={layoutStr === "grid" ? "Grid View" : "List View"}>
            {layoutStr === "grid" ? <GridView /> : <List />}
          </Tooltip>
        </ToggleButton>
      ))}
    </ToggleButtonGroup>
  );
}

export function SearchAndFilter({
  setSearchKeyword,
  filterGroup,
  setFilterGroup,
  filters = ["rookie", "captain", "chairperson", "back", "net"],
  stacked = false,
}) {
  const filterControls = (
    <div className="sxs search-and-filter__filters">
      <Typography
        component="span"
        variant="body1"
        className="search-and-filter__label"
      >
        Filter to:
      </Typography>
      <ToggleButtonGroup
        value={filterGroup}
        size="small"
        exclusive
        onChange={(e, newVal) => setFilterGroup(newVal)}
        className="search-and-filter__toggle-group"
      >
        {filters.map((filterName) => (
          <ToggleButton
            key={filterName}
            value={filterName}
            style={{ border: 0 }}
          >
            <Tooltip title={TOOLTIP_DICT[filterName]}>
              {ICON_DICT[filterName]}
            </Tooltip>
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </div>
  );

  if (stacked) {
    return (
      <div className="search-and-filter search-and-filter--stacked">
        <SearchBox setSearchKeyword={setSearchKeyword} />
        {filterControls}
      </div>
    );
  }

  return (
    <div className="search-and-filter search-and-filter--inline">
      <div className="search-and-filter__search">
        <SearchBox setSearchKeyword={setSearchKeyword} />
      </div>
      {filterControls}
    </div>
  );
}

export function filterBallkids(ballkids, searchKeyword, filterGroup) {
  const keyword = (searchKeyword ?? "").toLowerCase();
  return ballkids.filter((ballkid) => {
    const nameMatch = `${ballkid.first_name} ${ballkid.last_name}`
      .toLowerCase()
      .includes(keyword);
    if (!nameMatch) {
      return false;
    }
    if (!filterGroup) {
      return true;
    }
    if (filterGroup === "rookie") {
      return ballkid.num_years_experience === 0;
    }
    if (filterGroup === "supervet") {
      return ballkid.num_years_experience > SUPERVET_THRESHOLD;
    }
    if (filterGroup === "captain") {
      return ballkid.is_captain;
    }
    if (filterGroup === "chairperson") {
      return ballkid.is_chairperson;
    }
    if (filterGroup === "back") {
      return ballkid.preferred_position !== "Net";
    }
    if (filterGroup === "net") {
      return ballkid.preferred_position !== "Back";
    }
    return false;
  });
}
