import { teams, finalsTeams } from "../HelpMessages.js";

/** Shared chairperson teams behavior: current tournament vs finals. */
export const CURRENT_TEAMS_MODE = {
  key: "current",
  isFinals: false,
  teamField: "current_team",
  positionField: "position",
  dropGroupBy: ["current_team", "position"],
  commentTypes: ["checkout_teams"],
  hoverCommentTypes: [],
  poolFilters: ["rookie", "supervet", "captain", "chairperson", "back", "net"],
  showCheckout: true,
  showCourtNotes: true,
  showOnCourtUi: true,
  showNewTeamAssign: true,
  showVisibilityToggle: true,
  title: "Current Teams",
  helpPage: "Teams",
  helpMessage: teams,
  pageClassSuffix: "",
  teamLabel: (team) => `Team ${team}`,
  assignPatch: (team) => ({ current_team: team }),
  unassignPatch: () => ({ current_team: 0 }),
  dropAssignOnTeam: (team, position) => ({ current_team: team, position }),
  dropAssignUnassigned: (position) => ({ current_team: 0, position }),
  clearTeamMessage: (team, count) =>
    `You are about to clear Team ${team}, unassign all ${count} ballkid${
      count > 1 ? "s" : ""
    }, and delete all future shifts for Team ${team} from the schedule.`,
  emptyUnassignedCopy:
    "There are currently no checked in ballkids who are unassigned.",
  isOnTeam: (ballkid, team) => ballkid.current_team === team,
};

export const FINALS_TEAMS_MODE = {
  key: "finals",
  isFinals: true,
  teamField: "finals_team",
  positionField: "finals_position",
  dropGroupBy: ["finals_team", "finals_position"],
  commentTypes: ["rank", "experience"],
  hoverCommentTypes: ["experience", "rank", "calibrated_avg"],
  poolFilters: ["rookie", "supervet", "captain", "back", "net"],
  showCheckout: false,
  showCourtNotes: false,
  showOnCourtUi: false,
  showNewTeamAssign: false,
  showVisibilityToggle: false,
  title: "Finals Teams",
  helpPage: "Finals Teams",
  helpMessage: finalsTeams,
  pageClassSuffix: " teams-chairperson-page--finals",
  teamLabel: (team) => team,
  assignPatch: (team) => ({ finals_team: team }),
  unassignPatch: () => ({ finals_team: "" }),
  dropAssignOnTeam: (team, position) => ({
    finals_team: team,
    finals_position: position,
  }),
  dropAssignUnassigned: (position) => ({
    finals_team: "",
    finals_position: position,
  }),
  clearTeamMessage: (team, count) =>
    `You are about to clear Team ${team} and unassign all ${count} ballkid${
      count > 1 ? "s" : ""
    }.`,
  emptyUnassignedCopy:
    "There are currently no ballkids who are unassigned.",
  isOnTeam: (ballkid, team) => ballkid.finals_team === team,
};
