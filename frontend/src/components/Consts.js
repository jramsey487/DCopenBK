import Star from "@mui/icons-material/Star";
import Circle from "@mui/icons-material/Circle";
import EventSeat from "@mui/icons-material/EventSeat";
import Square from "@mui/icons-material/Square";
import EmojiPeople from "@mui/icons-material/EmojiPeople";
import Grid4x4 from "@mui/icons-material/Grid4x4";

export const MARGINS = { mt: 2, mb: 1 };
export const ON_COURT_GREEN = "#c8f7c8";

export const SUPERVET_THRESHOLD = 3;
export const TARGET_NUM_BALLKIDS_PER_TEAM = 9;

export const DATA_GRID_HEIGHT = "75vh";
export const TIMEOUT_MS = 1500;

export const POSITIONS = ["Back", "Net"];

export const MATCH_TYPES = {
  MS: "Men's Singles",
  MD: "Men's Doubles",
  WS: "Women's Singles",
  WD: "Women's Doubles",
};

export const CUT_STATUSES = {
  DEFINITELY_KEEP: "Definitely Keep",
  POSSIBLY_KEEP: "Possibly Keep",
  POSSIBLY_CUT: "Possibly Cut",
  DEFINITELY_CUT: "Definitely Cut",
};

export const ICON_DICT = {
  captain: <Star sx={{ color: "orange" }} />,
  rookie: <Circle fontSize="small" sx={{ color: "green" }} />,
  chairperson: <EventSeat sx={{ color: "purple" }} />,
  supervet: <Square fontSize="small" sx={{ color: "info.main" }} />,
  outOfTownBallkid: <Square fontSize="small" sx={{ color: "error.main" }} />,
  outOfTownRookie: <Circle fontSize="small" sx={{ color: "error.main" }} />,
  back: <EmojiPeople sx={{ color: "primary.main" }} />,
  net: <Grid4x4 fontSize="small" sx={{ color: "gray" }} />,
};

export const TOOLTIP_DICT = {
  captain: "Captain",
  rookie: "Rookie",
  chairperson: "Chairperson",
  supervet: `Supervet (> ${SUPERVET_THRESHOLD} years experience)`,
  outOfTownRookie: "Out-of-town rookie",
  outOfTownBallkid: "Out-of-town ballkid",
  back: "Back",
  net: "Net",
};

export const NUM_RATINGS_WARNING_THRESHOLD = 5;
export const NUM_RATERS_WARNING_THRESHOLD = 3;

// Note that these dates are 0-indexed!!
export const START_DATE = new Date(2024, 6, 27);
export const END_DATE = new Date(2024, 7, 4);

export const CHART_COLORS = [
  "#e60049",
  "#0bb4ff",
  "#50e991",
  "#e6d800",
  "#9b19f5",
  "#ffa300",
  "#dc0ab4",
  "#b3d4ff",
  "#00bfa0",
  "#b19cd9",
  "#4bc0c0",
  "#ff6384",
];
export const CHART_GRAY = "#6e6e6e";

export const CHECKOUT_OPTIONS = [
  "End",
  "1pm",
  "2pm",
  "3pm",
  "4pm",
  "5pm",
  "6pm",
  "7pm",
  "8pm",
  "9pm",
  "10pm",
  "11pm",
  "12am",
];
export const LAST_DAY_OPTIONS = [
  "End",
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];
