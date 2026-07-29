import React, { useState, useEffect, useCallback } from "react";

import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Button from "@mui/material/Button";
import Box from "@mui/material/Box";

import {
  filterBallkids,
  getAuthHeader,
  SearchAndFilter,
  HelpIcon,
  Alerts,
  Banners,
} from "../Utils";
import {
  SelfCutCard,
  CutStatusSection,
  CutBallkidRow,
  patchCutBallkidInState,
} from "./CutPageDesktop";
import { CUT_STATUSES } from "../Consts";
import { cut } from "../HelpMessages";
import "./ballkid-list-by-name.css";
import "./cut-page-desktop.css";

function renderAssignCutButton(ballkid, section, patchCutBallkid) {
  var color;
  switch (section) {
    case "Definitely Keep":
      color = "success";
      break;
    case "Possibly Keep":
      color = "primary";
      break;
    case "Possibly Cut":
      color = "warning";
      break;
    case "Definitely Cut":
      color = "error";
      break;
    default:
      console.log("Unrecognized cut status: " + section);
  }

  return (
    <Button
      key={section}
      sx={{ m: 0.2 }}
      size="small"
      color={color}
      variant="outlined"
      onClick={() => {
        patchCutBallkid(ballkid, { cut_status: section });
      }}
    >
      {section}
    </Button>
  );
}

function ActiveSection({ active, sections, patchCutBallkid, showHovercard }) {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterGroup, setFilterGroup] = useState();

  const uncategorized = filterBallkids(active, searchKeyword, filterGroup).filter(
    (ballkid) => ballkid.cut_status === ""
  );

  return (
    <div className="teams-chairperson-section">
      <div className="teams-chairperson-section-head">
        <div>
          <span className="teams-chairperson-section-title">Active Ballkids</span>
          <span className="teams-chairperson-section-count">
            ({uncategorized.length})
          </span>
        </div>
      </div>

      {active.length === 0 ? (
        <Typography>
          There are currently no active ballkids left to categorize.
        </Typography>
      ) : (
        <div>
          <SearchAndFilter
            setSearchKeyword={setSearchKeyword}
            filterGroup={filterGroup}
            setFilterGroup={setFilterGroup}
            filters={["rookie", "supervet", "captain", "back", "net"]}
          />

          <div className="cut-page-chip-list">
            {uncategorized.map((ballkid) => (
              <div key={ballkid.id} className="cut-page-mobile-assign-row">
                <CutBallkidRow
                  ballkid={ballkid}
                  showHovercard={showHovercard}
                  hoverCommentTypes={[
                    "experience",
                    "rank",
                    "calibrated_avg",
                    "last_day",
                  ]}
                />
                <div className="cut-page-mobile-assign-actions">
                  {sections.map((section) =>
                    renderAssignCutButton(ballkid, section, patchCutBallkid)
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function CutPageMobile() {
  const [active, setActive] = useState([]);

  const [refreshKey, setRefreshKey] = useState(0);
  const [showHovercard, setShowHovercard] = useState(true);

  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const sections = Object.keys(CUT_STATUSES).map((key) => CUT_STATUSES[key]);

  const refetchActive = useCallback(() => setRefreshKey((k) => k + 1), []);

  const patchCutBallkid = useCallback(
    (ballkid, patch) =>
      patchCutBallkidInState(setActive, refetchActive, ballkid, patch),
    [refetchActive]
  );

  useEffect(() => {
    fetch("/api/sorted-list", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then((data) =>
        setActive(
          data.filter((ballkid) => !ballkid.is_cut && !ballkid.is_chairperson)
        )
      );

    fetch("/api/emails-list", { headers: getAuthHeader() })
      .then((response) => response.json())
      .then(() => {});
  }, [refreshKey]);

  return (
    <div className="page ballkid-list-page">
      <Banners />

      <Alerts
        successMsg={successMsg}
        errorMsg={errorMsg}
        setSuccessMsg={setSuccessMsg}
        setErrorMsg={setErrorMsg}
      />

      <Box className="ballkid-list-title-row" sx={{ mb: 2 }}>
        <Typography className="ballkid-list-title" variant="h4">
          Cut Page
        </Typography>
        <HelpIcon page="Cut" message={cut} />
      </Box>

      <Grid container spacing={2}>
        {sections.map((section) => (
          <Grid item xs={12} key={section}>
            <CutStatusSection
              section={section}
              active={active.filter(
                (ballkid) => ballkid.cut_status === section
              )}
              showHovercard={showHovercard}
              patchCutBallkid={patchCutBallkid}
              refetchActive={refetchActive}
            />
          </Grid>
        ))}

        <Grid item xs={12}>
          <SelfCutCard
            active={active}
            showHovercard={showHovercard}
            patchCutBallkid={patchCutBallkid}
            refetchActive={refetchActive}
          />
        </Grid>

        <Grid item xs={12}>
          <ActiveSection
            active={active}
            sections={sections}
            patchCutBallkid={patchCutBallkid}
            showHovercard={showHovercard}
          />
        </Grid>
      </Grid>
    </div>
  );
}
