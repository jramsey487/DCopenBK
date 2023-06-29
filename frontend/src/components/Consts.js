import Star from "@mui/icons-material/Star";
import Circle from "@mui/icons-material/Circle";
import EventSeat from "@mui/icons-material/EventSeat";
import EmojiPeople from "@mui/icons-material/EmojiPeople";
import Fence from "@mui/icons-material/Fence";

export const MARGINS = { mt: 2, mb: 1 };
export const ON_COURT_GREEN = "#c8f7c8";

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
  rookie: <Circle sx={{ color: "green" }} />,
  chairperson: <EventSeat sx={{ color: "purple" }} />,
  back: <EmojiPeople sx={{ color: "primary.main" }} />,
  net: <Fence sx={{ color: "gray" }} />,
};

export const NUM_RATINGS_WARNING_THRESHOLD = 5;
export const NUM_RATERS_WARNING_THRESHOLD = 3;

// Note that these dates are 0-indexed!!
export const START_DATE = new Date(2023, 6, 29);
export const END_DATE = new Date(2023, 7, 6);
