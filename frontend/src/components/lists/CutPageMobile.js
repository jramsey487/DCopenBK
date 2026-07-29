import React, { useState, useEffect, useCallback } from "react";

import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";

import {
  filterBallkids,
  getAuthHeader,
  SearchAndFilter,
  HelpIcon,
  Alerts,
  Banners,
  HovercardToggle,
} from "../Utils";
import { patchCutBallkidInState } from "./CutPageDesktop";
import { CUT_STATUSES } from "../Consts";
import { cut } from "../HelpMessages";
import {
  CutMobileAssignTable,
  buildCutAssignOptions,
  CutStatusSectionMobile,
  SelfCutCardMobile,
} from "./CutPageMobileAssign";
import "./ballkid-list-by-name.css";
import "./cut-page-desktop.css";
import "../teams/teams-page.css";

function ActiveSectionMobile({ active, sections, patchCutBallkid }) {
  const [searchKeyword, setSearchKeyword] = useState("");
  const [filterGroup, setFilterGroup] = useState();

  const uncategorized = filterBallkids(active, searchKeyword, filterGroup)
    .filter((ballkid) => ballkid.cut_status === "")
    .sort((a, b) =>
      `${a.last_name} ${a.first_name}`.localeCompare(
        `${b.last_name} ${b.first_name}`
      )
    );

  const assignOptions = buildCutAssignOptions({
    sections,
    currentStatus: "",
    includeActive: false,
    includeSelfCut: true,
  });

  return (
    <Box
      component={Paper}
      elevation={0}
      className="cut-page-active-panel teams-chairperson-unassigned-panel teams-mobile-unassigned-panel"
      sx={{ mt: 1 }}
    >
      <Box className="teams-mobile-unassigned-panel__head">
        <Typography variant="h6" sx={{ fontWeight: 700, fontSize: "1.15rem" }}>
          Active ballkids{" "}
          <Typography component="span" sx={{ opacity: 0.5, fontWeight: 600 }}>
            ({uncategorized.length})
          </Typography>
        </Typography>
      </Box>

      <Typography
        className="teams-chairperson-drop-hint"
        variant="body2"
        sx={{ color: "#64748b", mb: 2, fontSize: "0.8rem", lineHeight: 1.45 }}
      >
        Tap a category to assign each ballkid. Use section cards above to review
        who is already categorized.
      </Typography>

      {active.length === 0 ? (
        <Typography sx={{ opacity: 0.7, fontSize: "0.9rem" }}>
          There are currently no active ballkids left to categorize.
        </Typography>
      ) : (
        <>
          <Box sx={{ mb: 2 }}>
            <SearchAndFilter
              stacked
              setSearchKeyword={setSearchKeyword}
              filterGroup={filterGroup}
              setFilterGroup={setFilterGroup}
              filters={["rookie", "supervet", "captain", "back", "net"]}
            />
          </Box>

          {uncategorized.length === 0 ? (
            <Typography sx={{ opacity: 0.7, fontSize: "0.9rem" }}>
              No uncategorized ballkids match your search or filters.
            </Typography>
          ) : (
            <CutMobileAssignTable
              ballkids={uncategorized}
              assignOptions={assignOptions}
              assignColumnTitle="Assign to"
              onAssign={(ballkid, status) =>
                patchCutBallkid(ballkid, { cut_status: status })
              }
            />
          )}
        </>
      )}
    </Box>
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
    <div className="page ballkid-list-page teams-page-shell cut-page-mobile">
      <Banners />

      <Alerts
        successMsg={successMsg}
        errorMsg={errorMsg}
        setSuccessMsg={setSuccessMsg}
        setErrorMsg={setErrorMsg}
      />

      <Box className="cut-page-top-bar">
        <Box className="cut-page-top-bar__title">
          <Typography className="ballkid-list-title" variant="h4" component="h1">
            Cut Page
          </Typography>
          <HelpIcon page="Cut" message={cut} />
        </Box>
        <Box className="cut-page-top-bar__end">
          <Box className="cut-page-top-bar__toolbar-pills">
            <HovercardToggle
              enabled={showHovercard}
              setEnabled={setShowHovercard}
            />
          </Box>
        </Box>
      </Box>

      <Grid container spacing={2}>
        {sections.map((section) => (
          <Grid item xs={12} key={section}>
            <CutStatusSectionMobile
              section={section}
              active={active.filter(
                (ballkid) => ballkid.cut_status === section
              )}
              sections={sections}
              patchCutBallkid={patchCutBallkid}
              refetchActive={refetchActive}
            />
          </Grid>
        ))}

        <Grid item xs={12}>
          <SelfCutCardMobile
            active={active}
            sections={sections}
            patchCutBallkid={patchCutBallkid}
            refetchActive={refetchActive}
          />
        </Grid>

        <Grid item xs={12}>
          <ActiveSectionMobile
            active={active}
            sections={sections}
            patchCutBallkid={patchCutBallkid}
          />
        </Grid>
      </Grid>
    </div>
  );
}
