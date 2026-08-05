import React, { useState, useEffect, useCallback } from "react";

import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Paper from "@mui/material/Paper";

import {
  filterBallkids,
  getAuthHeader,
  SearchAndFilter,
  Alerts,
  Banners,
} from "../Utils";
import { patchCutBallkidInState, compareCutPageBallkids } from "./CutPageDesktop";
import { CUT_STATUSES } from "../Consts";
import { cut } from "../HelpMessages";
import { TeamsChairpersonPageHeader } from "../teams/TeamsChairpersonShared";
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
    .sort(compareCutPageBallkids);

  const assignOptions = buildCutAssignOptions({
    sections,
    currentStatus: "",
    includeSelfCut: true,
  });

  return (
    <Box
      component={Paper}
      elevation={0}
      className="ballkid-pool-panel teams-chairperson-unassigned-panel teams-mobile-unassigned-panel cut-page-active-panel"
    >
      <Box className="ballkid-pool-panel__head teams-chairperson-unassigned-panel__head">
        <Box className="sxs" sx={{ alignItems: "center", gap: 0.5 }}>
          <span className="teams-chairperson-unassigned-title">
            Active ballkids
          </span>
          <span className="teams-chairperson-unassigned-count">
            ({uncategorized.length})
          </span>
        </Box>
      </Box>

      <Typography className="teams-chairperson-drop-hint" variant="body2">
        Tap a category to assign each ballkid. Use section cards above to review
        who is already categorized.
      </Typography>

      {active.length === 0 ? (
        <div className="team-position-empty">
          There are currently no active ballkids left to categorize.
        </div>
      ) : (
        <>
          <Box className="ballkid-pool-panel__search teams-chairperson-unassigned-search">
            <SearchAndFilter
              stacked
              setSearchKeyword={setSearchKeyword}
              filterGroup={filterGroup}
              setFilterGroup={setFilterGroup}
              filters={["rookie", "supervet", "captain", "back", "net"]}
            />
          </Box>

          {uncategorized.length === 0 ? (
            <div className="team-position-empty">
              No uncategorized ballkids match your search or filters.
            </div>
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
    <div className="page ballkid-list-page teams-page-shell teams-chairperson-page cut-page cut-page-mobile">
      <Banners />

      <TeamsChairpersonPageHeader
        title="Cut Page"
        helpPage="Cut"
        helpMessage={cut}
        alerts={
          <Alerts
            successMsg={successMsg}
            errorMsg={errorMsg}
            setSuccessMsg={setSuccessMsg}
            setErrorMsg={setErrorMsg}
          />
        }
      />

      <div className="teams-page-grid teams-chairperson-teams-grid cut-page-mobile-sections">
        {sections.map((section) => (
          <CutStatusSectionMobile
            key={section}
            section={section}
            active={active.filter((ballkid) => ballkid.cut_status === section)}
            patchCutBallkid={patchCutBallkid}
            refetchActive={refetchActive}
          />
        ))}

        <SelfCutCardMobile
          active={active}
          patchCutBallkid={patchCutBallkid}
          refetchActive={refetchActive}
        />
      </div>

      <ActiveSectionMobile
        active={active}
        sections={sections}
        patchCutBallkid={patchCutBallkid}
      />
    </div>
  );
}
