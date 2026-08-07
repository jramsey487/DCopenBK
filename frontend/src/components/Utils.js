/**
 * Shared frontend utilities — thin re-export barrel.
 * Prefer importing from leaf modules (`authStorage`, `dateTime`, etc.) in new code
 * to avoid circular dependency issues.
 */

export {
  getLocalStorage,
  setLocalStorage,
  getToken,
  getAuthHeader,
  getBallkidId,
  setSessionFromLogin,
  ballkidImageSrc,
  useToken,
  handleChange,
  useIsMobile,
} from "./authStorage";

export {
  getCurrentYear,
  dayHourToStr,
  getDays,
  getTimeFloat,
  getDurationStr,
  getTimeStr,
  toPercent,
  isCurrentHour,
  isCurrentScheduleSlot,
  isHalfHourSlot,
  getToday,
  getDay,
  getDayFromHyphenated,
} from "./dateTime";

export { Alerts, ConfirmDialog, HelpIcon } from "./dialogs";

export {
  LayoutButtons,
  SearchAndFilter,
  filterBallkids,
} from "./searchFilters";

export {
  ballkidIconNodes,
  Icons,
  RatingButton,
  DraftRatingButton,
  Banners,
  HovercardToggle,
  HideShowToggle,
  CourtAssignment,
  BallkidPopover,
  BallkidAndIcon,
  BallkidLink,
  BallkidCard,
  CommentsText,
} from "./ballkidUi";
